import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { NearbyBus } from '../types'

export default function NearbyBusList({ buses }: { buses: NearbyBus[] }) {
  if (buses.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>✅</Text>
        <Text style={s.emptyText}>No alert buses nearby</Text>
      </View>
    )
  }

  return (
    <ScrollView style={s.list} contentContainerStyle={{ padding: 12, gap: 8 }}>
      {buses.map((bus, i) => (
        <View key={bus.busId} style={s.card}>
          <View style={s.row}>
            <View style={s.left}>
              <Text style={s.rank}>#{i + 1}</Text>
              <View>
                <Text style={s.busId}>{bus.busId}</Text>
                <Text style={s.stop} numberOfLines={1}>📍 {bus.lastStop}</Text>
              </View>
            </View>
            <View style={s.right}>
              <Text style={s.evaders}>{bus.evaders} evaders</Text>
              <Text style={s.distance}>{bus.distance.toFixed(2)} km</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  list:      { flex: 1 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#4b5563', fontSize: 13 },
  card:      { backgroundColor: 'rgba(127,29,29,0.3)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#7f1d1d' },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left:      { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rank:      { color: '#6b7280', fontSize: 12, fontWeight: '600', minWidth: 20 },
  busId:     { color: '#fca5a5', fontWeight: '700', fontSize: 13 },
  stop:      { color: '#6b7280', fontSize: 11, marginTop: 2 },
  right:     { alignItems: 'flex-end' },
  evaders:   { color: '#f87171', fontWeight: '700', fontSize: 14 },
  distance:  { color: '#fbbf24', fontSize: 11, marginTop: 2 },
})
