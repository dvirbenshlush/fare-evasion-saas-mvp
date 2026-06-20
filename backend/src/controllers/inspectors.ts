import { BusState } from './reconciliation';

// ── Haversine distance (km) ───────────────────────────────────────────────────

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Inspector {
  inspectorId: string;
  name:        string;
  lat:         number;
  lon:         number;
  onDuty:      boolean;
  connected:   boolean;
  lastSeen:    number;
}

export interface NearbyBus {
  busId:    string;
  lat:      number;
  lon:      number;
  evaders:  number;
  lastStop: string;
  distance: number; // km
}

export interface ChatMessage {
  id:       number;
  from:     string;
  fromName: string;
  text:     string;
  ts:       number;
}

// ── Seed 50 inspectors ────────────────────────────────────────────────────────
// Credentials: employeeId (10001-10050), password = employeeId

export const CREDENTIALS = new Map<string, string>();
export const inspectors  = new Map<string, Inspector>();

// Fixed Gush Dan anchor points for deterministic seeding
const ANCHORS = [
  { lat: 32.0853, lon: 34.7818 }, // Tel Aviv center
  { lat: 32.0553, lon: 34.7570 }, // Jaffa
  { lat: 32.0833, lon: 34.8137 }, // Ramat Gan
  { lat: 32.0106, lon: 34.7737 }, // Holon
  { lat: 32.0840, lon: 34.8878 }, // Petah Tikva
  { lat: 32.0203, lon: 34.7508 }, // Bat Yam
  { lat: 32.0695, lon: 34.8101 }, // Givatayim
];

for (let i = 1; i <= 50; i++) {
  const id     = String(10000 + i);
  const anchor = ANCHORS[i % ANCHORS.length];
  // Deterministic jitter based on index
  const latOff = ((i * 17) % 100) / 10000;
  const lonOff = ((i * 13) % 100) / 10000;

  CREDENTIALS.set(id, id); // password = employee ID

  inspectors.set(id, {
    inspectorId: id,
    name:        `Inspector ${id}`,
    lat:         anchor.lat + latOff,
    lon:         anchor.lon + lonOff,
    onDuty:      i <= 30,  // first 30 are on duty
    connected:   false,
    lastSeen:    Date.now(),
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function authenticate(id: string, password: string): Inspector | null {
  if (CREDENTIALS.get(id) === password) return inspectors.get(id) ?? null;
  return null;
}

export function markConnected(inspectorId: string, connected: boolean): void {
  const insp = inspectors.get(inspectorId);
  if (insp) { insp.connected = connected; insp.lastSeen = Date.now(); }
}

export function updateLocation(inspectorId: string, lat: number, lon: number): void {
  const insp = inspectors.get(inspectorId);
  if (insp) { insp.lat = lat; insp.lon = lon; insp.lastSeen = Date.now(); }
}

// ── Nearby alert buses ────────────────────────────────────────────────────────

export function getNearbyAlertBuses(inspectorId: string, allBuses: BusState[]): NearbyBus[] {
  const insp = inspectors.get(inspectorId);
  if (!insp) return [];

  return allBuses
    .filter(b => b.alert)
    .map(b => ({
      busId:    b.busId,
      lat:      b.lat,
      lon:      b.lon,
      evaders:  b.evaders,
      lastStop: b.lastStop,
      distance: haversine(insp.lat, insp.lon, b.lat, b.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
}

// ── Chat ──────────────────────────────────────────────────────────────────────

let chatCounter = 0;
export const chatHistory: ChatMessage[] = [];

export function addChatMessage(from: string, text: string): ChatMessage {
  const insp = inspectors.get(from);
  const msg: ChatMessage = {
    id:       ++chatCounter,
    from,
    fromName: insp?.name ?? from,
    text:     text.slice(0, 500),
    ts:       Date.now(),
  };
  chatHistory.push(msg);
  if (chatHistory.length > 100) chatHistory.shift();
  return msg;
}
