import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import BusMap from '../components/BusMap'
import NearbyBusList from '../components/NearbyBusList'
import ChatPanel from '../components/ChatPanel'
import { BusState, ChatMessage, Inspector, NearbyBus } from '../types'

interface Props {
  me:           Inspector
  buses:        BusState[]
  inspectors:   Inspector[]
  nearbyBuses:  NearbyBus[]
  chatMessages: ChatMessage[]
  onSend:       (text: string) => void
  onLogout:     () => void
}

type Tab = 'nearby' | 'chat'

export default function InspectorDashboard({
  me, buses, inspectors, nearbyBuses, chatMessages, onSend, onLogout,
}: Props) {
  const [tab, setTab] = useState<Tab>('nearby')

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.name}>{me.name}</Text>
          <Text style={s.id}>#{me.inspectorId}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={[s.badge, me.onDuty ? s.badgeGreen : s.badgeGray]}>
            <Text style={s.badgeText}>{me.onDuty ? '● On Duty' : '○ Off Duty'}</Text>
          </View>
          <TouchableOpacity onPress={onLogout}>
            <Text style={s.logout}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <Text style={s.legendItem}><Text style={{ color: '#3b82f6' }}>●</Text> You</Text>
        <Text style={s.legendItem}><Text style={{ color: '#7c3aed' }}>●</Text> Colleagues</Text>
        <Text style={s.legendItem}><Text style={{ color: '#dc2626' }}>●</Text> Alert bus</Text>
        <Text style={s.legendItem}><Text style={{ color: '#16a34a' }}>●</Text> Clear bus</Text>
      </View>

      {/* Map — top half */}
      <View style={s.mapContainer}>
        <BusMap
          buses={buses}
          inspectors={inspectors}
          currentInspectorId={me.inspectorId}
        />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'nearby' && s.tabActive]}
          onPress={() => setTab('nearby')}
        >
          <Text style={[s.tabText, tab === 'nearby' && s.tabTextActive]}>
            🚨 Nearby Alerts ({nearbyBuses.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'chat' && s.tabActive]}
          onPress={() => setTab('chat')}
        >
          <Text style={[s.tabText, tab === 'chat' && s.tabTextActive]}>
            💬 Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Panel — bottom half */}
      <View style={s.panel}>
        {tab === 'nearby'
          ? <NearbyBusList buses={nearbyBuses} />
          : <ChatPanel messages={chatMessages} currentId={me.inspectorId} onSend={onSend} />
        }
      </View>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#030712' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  name:          { color: '#fff', fontWeight: '700', fontSize: 15 },
  id:            { color: '#6b7280', fontSize: 11 },
  headerRight:   { alignItems: 'flex-end', gap: 4 },
  badge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeGreen:    { backgroundColor: '#14532d' },
  badgeGray:     { backgroundColor: '#1f2937' },
  badgeText:     { color: '#86efac', fontSize: 11, fontWeight: '700' },
  logout:        { color: '#ef4444', fontSize: 12 },
  legend:        { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  legendItem:    { color: '#9ca3af', fontSize: 11 },
  mapContainer:  { flex: 1 },
  tabs:          { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText:       { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  panel:         { height: 280, backgroundColor: '#111827' },
})
