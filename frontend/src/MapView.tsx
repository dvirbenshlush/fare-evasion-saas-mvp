import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet'
import { BusState, LatLng } from './types'

interface Props {
  buses: BusState[]
  pickingCoords: boolean
  onMapClick: (coords: LatLng) => void
}

function ClickHandler({ enabled, onMapClick }: { enabled: boolean; onMapClick: (c: LatLng) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng })
    },
  })
  return null
}

export default function MapView({ buses, pickingCoords, onMapClick }: Props) {
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

      {buses.map((bus) => {
        const isManual = bus.source === 'manual'
        const color    = bus.alert ? '#ef4444' : '#22c55e'
        return (
          <CircleMarker
            key={bus.busId}
            center={[bus.lat, bus.lon]}
            radius={isManual ? 12 : 6}
            pathOptions={{
              color:       isManual ? '#facc15' : color,
              fillColor:   color,
              fillOpacity: 0.9,
              weight:      isManual ? 3 : 1,
            }}
          >
            <Tooltip>
              <div className="text-xs space-y-0.5">
                <div className="font-bold flex items-center gap-1">
                  {isManual && <span>⭐</span>}
                  {bus.busId}
                  {bus.alert && <span className="text-red-600"> ⚠️</span>}
                </div>
                <div>📍 {bus.lastStop}</div>
                <div>👥 Onboard: <b>{bus.onboard}</b></div>
                <div>✅ Validated: <b>{bus.validated}</b>
                  <span className="text-gray-500 ml-1">
                    (NFC {bus.nfcValidations} / QR {bus.qrValidations})
                  </span>
                </div>
                <div className={bus.alert ? 'text-red-600 font-bold' : 'text-green-600'}>
                  🚫 Evaders: {bus.evaders}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
