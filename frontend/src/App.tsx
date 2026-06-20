import { useEffect, useRef, useState, useCallback } from 'react'
import MapView from './MapView'
import BusManualForm from './BusManualForm'
import LoginPage from './LoginPage'
import InspectorDashboard from './InspectorDashboard'
import { BusState, ChatMessage, Inspector, KPI, NearbyBus, WsMessage, LatLng } from './types'

const WS_URL = 'ws://localhost:8080'

const DEFAULT_KPI: KPI = {
  totalBuses: 0, alertBuses: 0, totalPassengers: 0, totalEvaders: 0, evasionRate: 0,
}

type Mode = 'ops' | 'login' | 'inspector'

interface Alert {
  id:       number
  busId:    string
  evaders:  number
  lastStop: string
  ts:       number
}

export default function App() {
  // ── Shared state ────────────────────────────────────────────────────────────
  const [buses,     setBuses]     = useState<Map<string, BusState>>(new Map())
  const [kpi,       setKpi]       = useState<KPI>(DEFAULT_KPI)
  const [connected, setConnected] = useState(false)
  const [mode,      setMode]      = useState<Mode>('ops')

  // ── Ops state ────────────────────────────────────────────────────────────────
  const [alerts,         setAlerts]         = useState<Alert[]>([])
  const [pickingCoords,  setPickingCoords]  = useState(false)
  const [selectedCoords, setSelectedCoords] = useState<LatLng | null>(null)
  const [activeTab,      setActiveTab]      = useState<'overview' | 'inject'>('overview')

  // ── Inspector state ──────────────────────────────────────────────────────────
  const [loginError,    setLoginError]    = useState<string | null>(null)
  const [loginPending,  setLoginPending]  = useState(false)
  const [me,            setMe]            = useState<Inspector | null>(null)
  const [allInspectors, setAllInspectors] = useState<Map<string, Inspector>>(new Map())
  const [nearbyBuses,   setNearbyBuses]   = useState<NearbyBus[]>([])
  const [chatMessages,  setChatMessages]  = useState<ChatMessage[]>([])

  const alertIdRef = useRef(0)
  const backoffRef = useRef(500)
  const wsRef      = useRef<WebSocket | null>(null)

  // ── Send helper ──────────────────────────────────────────────────────────────
  const sendWs = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // ── WebSocket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false

    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        backoffRef.current = 500
      }
      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        if (!destroyed) {
          setTimeout(connect, Math.min(backoffRef.current, 30_000))
          backoffRef.current = Math.min(backoffRef.current * 2, 30_000)
        }
      }
      ws.onerror = () => ws.close()

      ws.onmessage = (e) => {
        const msg: WsMessage = JSON.parse(e.data)

        switch (msg.type) {
          case 'snapshot': {
            setBuses(new Map(msg.buses.map(b => [b.busId, b])))
            setKpi(msg.kpi)
            if (msg.inspectors?.length) {
              setAllInspectors(new Map(msg.inspectors.map(i => [i.inspectorId, i])))
            }
            break
          }
          case 'busUpdate': {
            const bus = msg.bus
            setBuses(prev => new Map(prev).set(bus.busId, bus))
            if (bus.alert) {
              setAlerts(prev => [
                { id: ++alertIdRef.current, busId: bus.busId, evaders: bus.evaders, lastStop: bus.lastStop, ts: msg.ts },
                ...prev.slice(0, 49),
              ])
            }
            break
          }
          case 'inspector_update': {
            const insp = msg.inspector
            if (!insp) break
            setAllInspectors(prev => new Map(prev).set(insp.inspectorId, insp))
            // Keep `me` in sync if it's the current inspector
            setMe(prev => prev?.inspectorId === insp.inspectorId ? insp : prev)
            break
          }
          case 'auth_ok': {
            setLoginPending(false)
            setLoginError(null)
            setMe(msg.inspector)
            setBuses(new Map(msg.buses.map(b => [b.busId, b])))
            setKpi(msg.kpi)
            setAllInspectors(new Map(msg.inspectors.map(i => [i.inspectorId, i])))
            setChatMessages(msg.chatHistory)
            setMode('inspector')
            break
          }
          case 'auth_fail': {
            setLoginPending(false)
            setLoginError(msg.reason)
            break
          }
          case 'nearby_buses': {
            setNearbyBuses(msg.buses)
            break
          }
          case 'chat_message': {
            const cm: ChatMessage = { id: msg.id, from: msg.from, fromName: msg.fromName, text: msg.text, ts: msg.ts }
            setChatMessages(prev => [...prev, cm])
            break
          }
        }
      }
    }

    connect()
    return () => { destroyed = true; wsRef.current?.close() }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleLogin(id: string, password: string) {
    setLoginPending(true)
    setLoginError(null)
    sendWs({ type: 'inspector_auth', inspectorId: id, password })
  }

  function handleLogout() {
    setMe(null)
    setNearbyBuses([])
    setChatMessages([])
    setMode('ops')
  }

  function handleSendChat(text: string) {
    sendWs({ type: 'chat_send', text })
  }

  function handleUpdateLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => sendWs({ type: 'inspector_location', lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => alert('Could not get your location. Please enable GPS.'),
    )
  }

  function handleMapClick(coords: LatLng) {
    setSelectedCoords(coords)
    setPickingCoords(false)
    setActiveTab('inject')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (mode === 'login') {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => { setMode('ops'); setLoginError(null); setLoginPending(false) }}
        error={loginError}
        loading={loginPending}
      />
    )
  }

  if (mode === 'inspector' && me) {
    return (
      <InspectorDashboard
        me={me}
        buses={Array.from(buses.values())}
        inspectors={Array.from(allInspectors.values())}
        nearbyBuses={nearbyBuses}
        chatMessages={chatMessages}
        onSend={handleSendChat}
        onUpdateLoc={handleUpdateLocation}
        onLogout={handleLogout}
      />
    )
  }

  // ── Ops dashboard ─────────────────────────────────────────────────────────────

  const busArray = Array.from(buses.values())

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-mono">

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapView
          buses={busArray}
          pickingCoords={pickingCoords}
          onMapClick={handleMapClick}
          inspectors={Array.from(allInspectors.values())}
        />

        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
          connected ? 'bg-green-700' : 'bg-red-700 animate-pulse'
        }`}>
          {connected ? `● LIVE — ${busArray.length} buses` : '○ Reconnecting…'}
        </div>

        {pickingCoords && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-600 text-black px-4 py-2 rounded-full text-sm font-bold shadow-xl animate-bounce">
            🎯 Click anywhere on the map to set coordinates
          </div>
        )}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-80 flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white tracking-widest uppercase">
              🚌 Fare Evasion Ops
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Gush Dan Fleet Monitor</p>
          </div>
          <button
            onClick={() => setMode('login')}
            className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 px-2 py-1.5 rounded-lg transition-colors font-semibold"
          >
            👮 Inspector
          </button>
        </div>

        {/* KPI Cards */}
        <div className="p-3 grid grid-cols-2 gap-2 border-b border-gray-800">
          <Kpi label="Active Buses"  value={kpi.totalBuses.toLocaleString()} />
          <Kpi label="Alert Buses"   value={kpi.alertBuses.toLocaleString()} red />
          <Kpi label="Passengers"    value={kpi.totalPassengers.toLocaleString()} />
          <Kpi label="Evaders"       value={kpi.totalEvaders.toLocaleString()} red />
          <div className="col-span-2 bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {(kpi.evasionRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">Fleet Evasion Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(['overview', 'inject'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : '➕ Manual Inject'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">

          {/* ── Overview Tab ─────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Top Offenders</h2>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="text-left p-2">Bus</th>
                        <th className="text-left p-2">Stop</th>
                        <th className="text-right p-2">Eva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busArray
                        .filter(b => b.alert)
                        .sort((a, b) => b.evaders - a.evaders)
                        .slice(0, 10)
                        .map(bus => (
                          <tr key={bus.busId} className="border-t border-gray-800 bg-red-950/30">
                            <td className="p-2 font-bold text-red-400">{bus.busId}</td>
                            <td className="p-2 text-gray-400 truncate max-w-[80px]">{bus.lastStop}</td>
                            <td className="p-2 text-right text-red-400 font-bold">{bus.evaders}</td>
                          </tr>
                        ))}
                      {busArray.filter(b => b.alert).length === 0 && (
                        <tr><td colSpan={3} className="p-3 text-center text-gray-600 text-xs">No alerts</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Alert Feed</h2>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {alerts.length === 0 && (
                    <p className="text-xs text-gray-600">No alerts yet.</p>
                  )}
                  {alerts.map(a => (
                    <div key={a.id} className="flex justify-between items-start bg-red-950/40 border border-red-900 rounded px-2 py-1.5 text-xs">
                      <div>
                        <span className="font-bold text-red-300">{a.busId}</span>
                        <span className="text-gray-500 ml-1">{a.lastStop}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-red-400 font-bold">{a.evaders} evaders</div>
                        <div className="text-gray-600">{new Date(a.ts).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Inject Tab ───────────────────────────────────────────── */}
          {activeTab === 'inject' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Manually add or override a bus. Click "Pick on map" to set coordinates.
              </p>
              <BusManualForm
                selectedCoords={selectedCoords}
                onPickCoords={() => { setPickingCoords(true); setActiveTab('overview') }}
                pickingCoords={pickingCoords}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function Kpi({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg p-2 text-center">
      <div className={`text-lg font-bold ${red ? 'text-red-400' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
