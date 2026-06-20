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

export interface KPI {
  totalBuses: number
  alertBuses: number
  totalPassengers: number
  totalEvaders: number
  evasionRate: number
}

export type WsMessage =
  | { type: 'snapshot'; ts: number; buses: BusState[]; kpi: KPI }
  | { type: 'busUpdate'; ts: number; bus: BusState }

export interface LatLng {
  lat: number
  lon: number
}
