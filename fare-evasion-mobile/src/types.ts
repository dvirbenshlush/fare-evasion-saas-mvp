export interface BusState {
  busId: string
  lat: number
  lon: number
  onboard: number
  validated: number
  nfcValidations: number
  qrValidations: number
  evaders: number
  alert: boolean
  lastStop: string
  lastSeen: number
  source: 'poll' | 'manual'
}

export interface Inspector {
  inspectorId: string
  name: string
  lat: number
  lon: number
  onDuty: boolean
  connected: boolean
  lastSeen: number
}

export interface NearbyBus {
  busId: string
  lat: number
  lon: number
  evaders: number
  lastStop: string
  distance: number
}

export interface ChatMessage {
  id: number
  from: string
  fromName: string
  text: string
  ts: number
}

export interface KPI {
  totalBuses: number
  alertBuses: number
  totalPassengers: number
  totalEvaders: number
  evasionRate: number
}

export type WsMessage =
  | { type: 'snapshot';         ts: number; buses: BusState[]; kpi: KPI; inspectors: Inspector[] }
  | { type: 'busUpdate';        ts: number; bus: BusState }
  | { type: 'inspector_update'; ts: number; inspector: Inspector }
  | { type: 'auth_ok';          inspector: Inspector; buses: BusState[]; inspectors: Inspector[]; chatHistory: ChatMessage[]; kpi: KPI }
  | { type: 'auth_fail';        reason: string }
  | { type: 'nearby_buses';     buses: NearbyBus[]; ts: number }
  | { type: 'chat_message';     id: number; from: string; fromName: string; text: string; ts: number }
