import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  buses,
  pollAllBuses,
  injectBus,
  computeKpi,
  BusState,
  InjectPayload,
} from './controllers/reconciliation';
import { recordReconciliation } from './db';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

// ── WebSocket ─────────────────────────────────────────────────────────────────

function broadcast(data: object): void {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function broadcastUpdate(bus: BusState): void {
  broadcast({ type: 'busUpdate', ts: Date.now(), bus });
}

function broadcastSnapshot(): void {
  broadcast({
    type:  'snapshot',
    ts:    Date.now(),
    buses: Array.from(buses.values()),
    kpi:   computeKpi(),
  });
}

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send full state to new client immediately
  ws.send(JSON.stringify({
    type:  'snapshot',
    ts:    Date.now(),
    buses: Array.from(buses.values()),
    kpi:   computeKpi(),
  }));
  ws.on('close', () => clients.delete(ws));
});

// ── Polling loop ──────────────────────────────────────────────────────────────

const POLL_MS = 5_000;

async function runPoll(): Promise<void> {
  const updated = await pollAllBuses();
  for (const bus of updated) {
    recordReconciliation(bus.busId, bus.onboard, bus.validated, bus.evaders, bus.lat, bus.lon, 'poll');
    broadcastUpdate(bus);
  }
}

setInterval(runPoll, POLL_MS);
setInterval(broadcastSnapshot, POLL_MS);

// ── REST ──────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', buses: buses.size, clients: clients.size });
});

app.post('/api/v1/buses/manual-inject', async (req, res) => {
  const { busId, lat, lon, onboard, validated, nfcValidations, qrValidations, lastStop } = req.body as InjectPayload & { lastStop?: string };

  if (!busId || lat == null || lon == null || onboard == null || validated == null) {
    res.status(400).json({ error: 'busId, lat, lon, onboard, validated are required' });
    return;
  }

  const bus = await injectBus({ busId, lat, lon, onboard, validated, nfcValidations, qrValidations, lastStop });
  recordReconciliation(bus.busId, bus.onboard, bus.validated, bus.evaders, bus.lat, bus.lon, 'manual');
  broadcastUpdate(bus);

  res.json({ status: 'ok', bus });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}  ws://localhost:${PORT}`);
  runPoll();
});
