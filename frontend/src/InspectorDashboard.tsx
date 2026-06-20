import { useState } from 'react'
import MapView from './MapView'
import InspectorChat from './InspectorChat'
import { Inspector, BusState, NearbyBus, ChatMessage } from './types'

interface Props {
  me:            Inspector
  buses:         BusState[]
  inspectors:    Inspector[]
  nearbyBuses:   NearbyBus[]
  chatMessages:  ChatMessage[]
  onSend:        (text: string) => void
  onUpdateLoc:   () => void
  onLogout:      () => void
}

export default function InspectorDashboard({
  me, buses, inspectors, nearbyBuses, chatMessages, onSend, onUpdateLoc, onLogout,
}: Props) {
  const [tab, setTab] = useState<'nearby' | 'chat'>('nearby')

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-mono">

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapView
          buses={buses}
          pickingCoords={false}
          onMapClick={() => {}}
          inspectors={inspectors}
          currentInspectorId={me.inspectorId}
        />

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
          👮 {me.name} — Inspector Mode
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-80 flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-sm font-bold text-white">{me.name}</h1>
              <p className="text-xs text-gray-500">Employee #{me.inspectorId}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                me.onDuty ? 'bg-green-800 text-green-300' : 'bg-gray-700 text-gray-400'
              }`}>
                {me.onDuty ? '● On Duty' : '○ Off Duty'}
              </span>
              <button
                onClick={onUpdateLoc}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                📍 Update location
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-b border-gray-800 flex gap-3 text-xs text-gray-500 flex-wrap">
          <span><span className="text-blue-400 font-bold">●</span> You</span>
          <span><span className="text-purple-400 font-bold">●</span> On-duty</span>
          <span><span className="text-red-400 font-bold">●</span> Alert bus</span>
          <span><span className="text-green-400 font-bold">●</span> Clear bus</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab('nearby')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === 'nearby'
                ? 'text-white border-b-2 border-red-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🚨 Nearby Alerts
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === 'chat'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            💬 Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
          </button>
        </div>

        {/* ── Nearby buses ─────────────────────────────────────────────── */}
        {tab === 'nearby' && (
          <div className="flex-1 overflow-y-auto p-3">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">
              5 Nearest Alert Buses
            </h2>

            {nearbyBuses.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-xs">No alert buses in range</p>
              </div>
            ) : (
              <div className="space-y-2">
                {nearbyBuses.map((bus, i) => (
                  <div key={bus.busId} className="bg-red-950/40 border border-red-900 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                          <span className="text-gray-500 font-normal">#{i + 1}</span>
                          <span className="truncate">{bus.busId}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">📍 {bus.lastStop}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-red-400">{bus.evaders} evaders</div>
                        <div className="text-xs text-yellow-400">{bus.distance.toFixed(2)} km</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Chat ─────────────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div className="flex-1 overflow-hidden">
            <InspectorChat
              messages={chatMessages}
              currentId={me.inspectorId}
              onSend={onSend}
            />
          </div>
        )}

        {/* Logout */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors py-1"
          >
            ← Exit to Operations Dashboard
          </button>
        </div>
      </aside>
    </div>
  )
}
