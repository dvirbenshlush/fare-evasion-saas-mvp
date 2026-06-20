import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import LoginScreen from './src/screens/LoginScreen'
import InspectorDashboard from './src/screens/InspectorDashboard'
import { BusState, ChatMessage, Inspector, NearbyBus, WsMessage } from './src/types'
import { WS_URL } from './src/config'

type Mode = 'login' | 'inspector'

export default function App() {
  const [mode,          setMode]          = useState<Mode>('login')
  const [loginError,    setLoginError]    = useState<string | null>(null)
  const [loginPending,  setLoginPending]  = useState(false)
  const [me,            setMe]            = useState<Inspector | null>(null)
  const [buses,         setBuses]         = useState<Map<string, BusState>>(new Map())
  const [allInspectors, setAllInspectors] = useState<Map<string, Inspector>>(new Map())
  const [nearbyBuses,   setNearbyBuses]   = useState<NearbyBus[]>([])
  const [chatMessages,  setChatMessages]  = useState<ChatMessage[]>([])

  const wsRef      = useRef<WebSocket | null>(null)
  const backoffRef = useRef(500)
  const destroyed  = useRef(false)

  const sendWs = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    destroyed.current = false

    const connect = () => {
      if (destroyed.current) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => { backoffRef.current = 500 }

      ws.onmessage = (e) => {
        const msg: WsMessage = JSON.parse(e.data)
        switch (msg.type) {
          case 'snapshot':
            setBuses(new Map(msg.buses.map(b => [b.busId, b])))
            if (msg.inspectors?.length)
              setAllInspectors(new Map(msg.inspectors.map(i => [i.inspectorId, i])))
            break
          case 'busUpdate':
            setBuses(prev => new Map(prev).set(msg.bus.busId, msg.bus))
            break
          case 'inspector_update':
            if (!msg.inspector) break
            setAllInspectors(prev => new Map(prev).set(msg.inspector.inspectorId, msg.inspector))
            setMe(prev => prev?.inspectorId === msg.inspector.inspectorId ? msg.inspector : prev)
            break
          case 'auth_ok':
            setLoginPending(false)
            setLoginError(null)
            setMe(msg.inspector)
            setBuses(new Map(msg.buses.map(b => [b.busId, b])))
            setAllInspectors(new Map(msg.inspectors.map(i => [i.inspectorId, i])))
            setChatMessages(msg.chatHistory)
            setMode('inspector')
            break
          case 'auth_fail':
            setLoginPending(false)
            setLoginError(msg.reason)
            break
          case 'nearby_buses':
            setNearbyBuses(msg.buses)
            break
          case 'chat_message':
            setChatMessages(prev => [
              ...prev,
              { id: msg.id, from: msg.from, fromName: msg.fromName, text: msg.text, ts: msg.ts },
            ])
            break
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!destroyed.current) {
          setTimeout(connect, Math.min(backoffRef.current, 30_000))
          backoffRef.current = Math.min(backoffRef.current * 2, 30_000)
        }
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => { destroyed.current = true; wsRef.current?.close() }
  }, [])

  function handleLogin(id: string, password: string) {
    setLoginPending(true)
    setLoginError(null)
    sendWs({ type: 'inspector_auth', inspectorId: id, password })
  }

  function handleLogout() {
    setMe(null)
    setNearbyBuses([])
    setChatMessages([])
    setMode('login')
  }

  function handleSendChat(text: string) {
    sendWs({ type: 'chat_send', text })
  }

  if (mode === 'inspector' && me) {
    return (
      <>
        <StatusBar style="light" />
        <InspectorDashboard
          me={me}
          buses={Array.from(buses.values())}
          inspectors={Array.from(allInspectors.values())}
          nearbyBuses={nearbyBuses}
          chatMessages={chatMessages}
          onSend={handleSendChat}
          onLogout={handleLogout}
        />
      </>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      <LoginScreen
        onLogin={handleLogin}
        error={loginError}
        loading={loginPending}
      />
    </>
  )
}
