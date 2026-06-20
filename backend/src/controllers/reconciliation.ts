const MOT_API = process.env.MOT_API_URL ?? 'http://localhost:3001';

export interface BusState {
  busId: string;
  lat: number;
  lon: number;
  onboard: number;
  validated: number;
  nfcValidations: number;
  qrValidations: number;
  evaders: number;
  alert: boolean;
  lastStop: string;
  lastSeen: number;
  source: 'poll' | 'manual';
}

export const buses = new Map<string, BusState>();

function randomGushDan(): { lat: number; lon: number } {
  return {
    lat: 31.97 + Math.random() * 0.15,
    lon: 34.74 + Math.random() * 0.19,
  };
}

interface AllStatesResponse {
  states: Record<string, {
    onboard_count: number;
    validated_count: number;
    nfc_validations: number;
    qr_validations: number;
    last_stop: string;
    lat: number | null;
    lon: number | null;
  }>;
}

export async function pollAllBuses(): Promise<BusState[]> {
  let data: AllStatesResponse;
  try {
    const res = await fetch(`${MOT_API}/api/v1/mot/all-states`);
    data = await res.json() as AllStatesResponse;
  } catch {
    return [];
  }

  const updated: BusState[] = [];

  for (const [busId, raw] of Object.entries(data.states)) {
    const existing = buses.get(busId);
    const coords = raw.lat != null && raw.lon != null
      ? { lat: raw.lat, lon: raw.lon }
      : existing ?? randomGushDan();

    const evaders = Math.max(0, raw.onboard_count - raw.validated_count);
    const state: BusState = {
      busId,
      lat:            (raw.lat  ?? coords.lat)  as number,
      lon:            (raw.lon  ?? coords.lon)  as number,
      onboard:        raw.onboard_count,
      validated:      raw.validated_count,
      nfcValidations: raw.nfc_validations,
      qrValidations:  raw.qr_validations,
      evaders,
      alert:          evaders >= 3,
      lastStop:       raw.last_stop,
      lastSeen:       Date.now(),
      source:         'poll',
    };

    buses.set(busId, state);
    updated.push(state);
  }

  return updated;
}

export interface InjectPayload {
  busId: string;
  lat: number;
  lon: number;
  onboard: number;
  validated: number;
  nfcValidations?: number;
  qrValidations?: number;
  lastStop?: string;
}

export async function injectBus(payload: InjectPayload): Promise<BusState> {
  const evaders = Math.max(0, payload.onboard - payload.validated);
  const nfc = payload.nfcValidations ?? payload.validated;
  const qr  = payload.qrValidations  ?? 0;

  const state: BusState = {
    busId:          payload.busId,
    lat:            payload.lat,
    lon:            payload.lon,
    onboard:        payload.onboard,
    validated:      payload.validated,
    nfcValidations: nfc,
    qrValidations:  qr,
    evaders,
    alert:          evaders >= 3,
    lastStop:       payload.lastStop ?? 'Manual Injection',
    lastSeen:       Date.now(),
    source:         'manual',
  };

  buses.set(payload.busId, state);

  // Sync to Mock API so the poller keeps it alive
  try {
    await fetch(`${MOT_API}/api/v1/mot/update-bus`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        bus_id:          payload.busId,
        onboard_count:   payload.onboard,
        nfc_validations: nfc,
        qr_validations:  qr,
        last_stop:       state.lastStop,
        lat:             payload.lat,
        lon:             payload.lon,
      }),
    });
  } catch {}

  return state;
}

export function computeKpi() {
  const all = Array.from(buses.values());
  const totalPassengers = all.reduce((s, b) => s + b.onboard, 0);
  const totalEvaders    = all.reduce((s, b) => s + b.evaders, 0);
  return {
    totalBuses:     all.length,
    alertBuses:     all.filter(b => b.alert).length,
    totalPassengers,
    totalEvaders,
    evasionRate:    totalPassengers > 0
      ? +(totalEvaders / totalPassengers).toFixed(4)
      : 0,
  };
}
