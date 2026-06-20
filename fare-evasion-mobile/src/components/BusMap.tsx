import { StyleSheet, View, Text } from 'react-native'
import MapView, { Marker, Circle, Region } from 'react-native-maps'
import { BusState, Inspector } from '../types'

interface Props {
  buses:              BusState[]
  inspectors:         Inspector[]
  currentInspectorId: string
}

function BusMarker({ bus }: { bus: BusState }) {
  const size = bus.alert ? 36 : 26
  const bg   = bus.alert ? '#dc2626' : '#16a34a'
  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={{ fontSize: size * 0.48 }}>🚌</Text>
    </View>
  )
}

function InspectorMarker({ isSelf }: { isSelf: boolean }) {
  if (isSelf) {
    return (
      <View style={s.selfWrapper}>
        <View style={s.selfRing} />
        <View style={s.selfCircle}>
          <Text style={{ fontSize: 20 }}>👮</Text>
        </View>
        <View style={s.selfLabel}>
          <Text style={s.selfLabelText}>YOU</Text>
        </View>
      </View>
    )
  }
  return (
    <View style={s.otherCircle}>
      <Text style={{ fontSize: 13 }}>👮</Text>
    </View>
  )
}

const INITIAL_REGION: Region = {
  latitude:       32.06,
  longitude:      34.79,
  latitudeDelta:  0.18,
  longitudeDelta: 0.18,
}

export default function BusMap({ buses, inspectors, currentInspectorId }: Props) {
  const me      = inspectors.find(i => i.inspectorId === currentInspectorId)
  const onDuty  = inspectors.filter(i => i.onDuty)

  return (
    <MapView style={s.map} initialRegion={INITIAL_REGION}>

      {/* 10 km radius around inspector */}
      {me && (
        <Circle
          center={{ latitude: me.lat, longitude: me.lon }}
          radius={10_000}
          strokeColor="rgba(59,130,246,0.8)"
          strokeWidth={2}
          fillColor="rgba(59,130,246,0.08)"
          lineDashPattern={[12, 6]}
        />
      )}

      {/* Inspector markers */}
      {onDuty.map(insp => (
        <Marker
          key={`insp-${insp.inspectorId}`}
          coordinate={{ latitude: insp.lat, longitude: insp.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={insp.inspectorId === currentInspectorId ? 10 : 5}
          tracksViewChanges={false}
        >
          <InspectorMarker isSelf={insp.inspectorId === currentInspectorId} />
        </Marker>
      ))}

      {/* Bus markers */}
      {buses.map(bus => (
        <Marker
          key={bus.busId}
          coordinate={{ latitude: bus.lat, longitude: bus.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={bus.alert ? 3 : 1}
          tracksViewChanges={false}
        >
          <BusMarker bus={bus} />
        </Marker>
      ))}

    </MapView>
  )
}

const s = StyleSheet.create({
  map:           { flex: 1 },
  circle:        { alignItems: 'center', justifyContent: 'center', elevation: 4 },
  selfWrapper:   { alignItems: 'center', gap: 3 },
  selfRing:      { position: 'absolute', width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(37,99,235,0.2)', top: -8 },
  selfCircle:    { width: 46, height: 46, borderRadius: 23, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', elevation: 6 },
  selfLabel:     { backgroundColor: '#1e40af', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  selfLabelText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  otherCircle:   { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', elevation: 3 },
})
