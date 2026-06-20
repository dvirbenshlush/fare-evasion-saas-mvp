import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { buses, pollAllBuses, injectBus, computeKpi, BusState, InjectPayload } from './controllers/reconciliation';
import {
  inspectors, authenticate, markConnected, updateLocation,
  getNearbyAlertBuses, addChatMessage, chatHistory,
} from './controllers/inspectors';
import { recordReconciliation } from './db';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// Anonymous ops clients
const opsClients = new Set<WebSocket>();
// Authenticated inspector clients
const inspectorClients = new Map<string, WebSocket>();   // inspectorId → ws
const wsToInspector    = new Map<WebSocket, string>();   // ws → inspectorId

// ── Broadcast helpers ─────────────────────────────────────────────────────────

function sendTo(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function broadcastAll(data: object): void {
  const msg = JSON.stringify(data);
  for (const ws of opsClients)           if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  for (const ws of inspectorClients.values()) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

function broadcastInspectors(data: object): void {
  const msg = JSON.stringify(data);
  for (const ws of inspectorClients.values()) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

function pushNearbyBuses(inspectorId: string): void {
  const ws = inspectorClients.get(inspectorId);
  if (!ws) return;
  sendTo(ws, {
    type:  'nearby_buses',
    buses: getNearbyAlertBuses(inspectorId, Array.from(buses.values())),
    ts:    Date.now(),
  });
}

function makeSnapshot() {
  return {
    type:       'snapshot',
    ts:         Date.now(),
    buses:      Array.from(buses.values()),
    kpi:        computeKpi(),
    inspectors: Array.from(inspectors.values()),
  };
}

// ── WebSocket handler ─────────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  opsClients.add(ws);
  sendTo(ws, makeSnapshot());

  ws.on('message', (raw) => {
    let msg: { type: string; [k: string]: unknown };
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {

      // ── Inspector authentication ──────────────────────────────────────────
      case 'inspector_auth': {
        const { inspectorId, password } = msg as { type: string; inspectorId: string; password: string };
        const inspector = authenticate(String(inspectorId), String(password));
        if (!inspector) {
          sendTo(ws, { type: 'auth_fail', reason: 'Invalid employee ID or password' });
          return;
        }
        opsClients.delete(ws);
        inspectorClients.set(inspector.inspectorId, ws);
        wsToInspector.set(ws, inspector.inspectorId);
        markConnected(inspector.inspectorId, true);

        sendTo(ws, {
          type:        'auth_ok',
          inspector,
          buses:       Array.from(buses.values()),
          inspectors:  Array.from(inspectors.values()),
          chatHistory,
          kpi:         computeKpi(),
        });
        broadcastAll({ type: 'inspector_update', inspector: inspectors.get(inspector.inspectorId), ts: Date.now() });
        pushNearbyBuses(inspector.inspectorId);
        console.log(`[ws] inspector ${inspector.inspectorId} connected`);
        break;
      }

      // ── Location update ───────────────────────────────────────────────────
      case 'inspector_location': {
        const inspectorId = wsToInspector.get(ws);
        if (!inspectorId) return;
        const { lat, lon } = msg as { type: string; lat: number; lon: number };
        updateLocation(inspectorId, lat, lon);
        broadcastAll({ type: 'inspector_update', inspector: inspectors.get(inspectorId), ts: Date.now() });
        pushNearbyBuses(inspectorId);
        break;
      }

      // ── Chat ──────────────────────────────────────────────────────────────
      case 'chat_send': {
        const inspectorId = wsToInspector.get(ws);
        if (!inspectorId) return;
        const text = String(msg.text ?? '').trim();
        if (!text) return;
        const chatMsg = addChatMessage(inspectorId, text);
        broadcastInspectors({ type: 'chat_message', ...chatMsg });
        break;
      }
    }
  });

  ws.on('close', () => {
    opsClients.delete(ws);
    const inspectorId = wsToInspector.get(ws);
    if (inspectorId) {
      inspectorClients.delete(inspectorId);
      wsToInspector.delete(ws);
      markConnected(inspectorId, false);
      broadcastAll({ type: 'inspector_update', inspector: inspectors.get(inspectorId), ts: Date.now() });
      console.log(`[ws] inspector ${inspectorId} disconnected`);
    }
  });
});

// ── Polling loop ──────────────────────────────────────────────────────────────

async function runPoll(): Promise<void> {
  const updated = await pollAllBuses();
  for (const bus of updated) {
    recordReconciliation(bus.busId, bus.onboard, bus.validated, bus.evaders, bus.lat, bus.lon, 'poll');
    broadcastAll({ type: 'busUpdate', ts: Date.now(), bus });
  }
  for (const id of inspectorClients.keys()) pushNearbyBuses(id);
}

setInterval(runPoll, 5_000);
setInterval(() => broadcastAll(makeSnapshot()), 5_000);

// ── REST ──────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', buses: buses.size, inspectors: inspectorClients.size });
});

app.post('/api/v1/buses/manual-inject', async (req, res) => {
  const { busId, lat, lon, onboard, validated, nfcValidations, qrValidations, lastStop } =
    req.body as InjectPayload & { lastStop?: string };

  if (!busId || lat == null || lon == null || onboard == null || validated == null) {
    res.status(400).json({ error: 'busId, lat, lon, onboard, validated are required' });
    return;
  }

  const bus = await injectBus({ busId, lat, lon, onboard, validated, nfcValidations, qrValidations, lastStop });
  recordReconciliation(bus.busId, bus.onboard, bus.validated, bus.evaders, bus.lat, bus.lon, 'manual');
  broadcastAll({ type: 'busUpdate', ts: Date.now(), bus });
  for (const id of inspectorClients.keys()) pushNearbyBuses(id);
  res.json({ status: 'ok', bus });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}  ws://localhost:${PORT}`);
  runPoll();
});
