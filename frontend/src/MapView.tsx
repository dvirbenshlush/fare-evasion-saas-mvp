import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { BusState, Inspector, LatLng } from './types'

// ── Custom div-icons ──────────────────────────────────────────────────────────

function busIcon(alert: boolean, manual: boolean) {
  const bg   = alert  ? '#dc2626' : '#16a34a'
  const size = manual ? 34 : (alert ? 28 : 22)
  const border = manual ? '3px solid #fbbf24' : '2px solid rgba(255,255,255,.4)'
  const fs = Math.round(size * 0.52)
  return L.divIcon({
    html: `<div style="
      background:${bg};border-radius:50%;
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      font-size:${fs}px;line-height:1;
      box-shadow:0 2px 8px rgba(0,0,0,.55);
      border:${border};
    ">🚌</div>`,
    className:    '',
    iconSize:     [size, size],
    iconAnchor:   [size / 2, size / 2],
    tooltipAnchor:[size / 2, 0],
  })
}

// Self inspector: pulsing ring + "YOU" label — very distinct from others
const ICON_INSP_SELF = L.divIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
      <div style="position:relative;width:46px;height:46px">
        <div class="insp-self-ring" style="
          position:absolute;inset:0;border-radius:50%;
          background:#2563eb;
        "></div>
        <div style="
          position:relative;
          background:#2563eb;border-radius:50%;
          width:46px;height:46px;
          display:flex;align-items:center;justify-content:center;
          font-size:24px;line-height:1;
          box-shadow:0 3px 12px rgba(0,0,0,.65);
          border:3px solid white;
        ">👮</div>
      </div>
      <div style="
        background:#1e40af;color:white;
        font-size:9px;font-weight:900;
        padding:2px 7px;border-radius:4px;
        letter-spacing:1px;font-family:monospace;
        box-shadow:0 1px 4px rgba(0,0,0,.5);
        white-space:nowrap;
      ">YOU</div>
    </div>`,
  className:    '',
  iconSize:     [46, 68],
  iconAnchor:   [23, 23],
  tooltipAnchor:[23, -23],
})

// Other on-duty inspectors: smaller, purple, no label
const ICON_INSP_OTHER = L.divIcon({
  html: `<div style="
    background:#7c3aed;border-radius:50%;
    width:26px;height:26px;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;line-height:1;
    box-shadow:0 2px 6px rgba(0,0,0,.5);
    border:2px solid rgba(255,255,255,.35);
  ">👮</div>`,
  className:    '',
  iconSize:     [26, 26],
  iconAnchor:   [13, 13],
  tooltipAnchor:[13, 0],
})

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  buses:               BusState[]
  pickingCoords:       boolean
  onMapClick:          (coords: LatLng) => void
  inspectors?:         Inspector[]
  currentInspectorId?: string
}

function ClickHandler({ enabled, onMapClick }: { enabled: boolean; onMapClick: (c: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapView({ buses, pickingCoords, onMapClick, inspectors = [], currentInspectorId }: Props) {
  const onDutyInspectors = inspectors.filter(i => i.onDuty)
  const currentInspector = inspectors.find(i => i.inspectorId === currentInspectorId)

  return (
    <MapContainer
      center={[32.06, 34.79]}
      zoom={12}
      className="h-full w-full"
      style={{ cursor: pickingCoords ? 'crosshair' : '' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler enabled={pickingCoords} onMapClick={onMapClick} />

      {/* ── 10 km radius polygon around current inspector ──────────────── */}
      {currentInspector && (
        <Circle
          center={[currentInspector.lat, currentInspector.lon]}
          radius={10_000}
          pathOptions={{
            color:       '#3b82f6',
            weight:      3,
            dashArray:   '12 6',
            fillColor:   '#3b82f6',
            fillOpacity: 0.10,
          }}
        />
      )}

      {/* ── Inspector markers ───────────────────────────────────────────── */}
      {onDutyInspectors.map(insp => {
        const isSelf = insp.inspectorId === currentInspectorId
        return (
          <Marker
            key={`insp-${insp.inspectorId}`}
            position={[insp.lat, insp.lon]}
            icon={isSelf ? ICON_INSP_SELF : ICON_INSP_OTHER}
            zIndexOffset={isSelf ? 2000 : 500}
          >
            <Tooltip>
              <div className="text-xs space-y-0.5">
                <div className="font-bold">{isSelf ? '📍 You' : insp.name}</div>
                <div className="text-gray-500">ID: {insp.inspectorId}</div>
                {insp.connected && <div className="text-green-600">● Online</div>}
              </div>
            </Tooltip>
          </Marker>
        )
      })}

      {/* ── Bus markers ─────────────────────────────────────────────────── */}
      {buses.map(bus => (
        <Marker
          key={bus.busId}
          position={[bus.lat, bus.lon]}
          icon={busIcon(bus.alert, bus.source === 'manual')}
          zIndexOffset={bus.alert ? 100 : 0}
        >
          <Tooltip>
            <div className="text-xs space-y-0.5">
              <div className="font-bold flex items-center gap-1">
                {bus.source === 'manual' && <span>⭐</span>}
                {bus.busId}
                {bus.alert && <span className="text-red-600"> ⚠️</span>}
              </div>
              <div>📍 {bus.lastStop}</div>
              <div>👥 Onboard: <b>{bus.onboard}</b></div>
              <div>
                ✅ Validated: <b>{bus.validated}</b>
                <span className="text-gray-500 ml-1">
                  (NFC {bus.nfcValidations} / QR {bus.qrValidations})
                </span>
              </div>
              <div className={bus.alert ? 'text-red-600 font-bold' : 'text-green-600'}>
                🚫 Evaders: {bus.evaders}
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}
