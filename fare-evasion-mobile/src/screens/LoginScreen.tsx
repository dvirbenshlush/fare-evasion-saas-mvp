import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'

interface Props {
  onLogin: (id: string, password: string) => void
  error:   string | null
  loading: boolean
}

export default function LoginScreen({ onLogin, error, loading }: Props) {
  const [id,  setId]  = useState('')
  const [pwd, setPwd] = useState('')

  function handleSubmit() {
    if (id.length === 5 && pwd.length === 5) onLogin(id, pwd)
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.card}>
        <Text style={s.emoji}>👮</Text>
        <Text style={s.title}>Inspector Login</Text>
        <Text style={s.subtitle}>Fare Evasion Field App</Text>

        <View style={s.field}>
          <Text style={s.label}>Employee ID (5 digits)</Text>
          <TextInput
            style={s.input}
            value={id}
            onChangeText={t => setId(t.replace(/\D/g, '').slice(0, 5))}
            placeholder="10001"
            placeholderTextColor="#4b5563"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>

        <View style={s.field}>
          <Text style={s.label}>Password (5 digits)</Text>
          <TextInput
            style={s.input}
            value={pwd}
            onChangeText={t => setPwd(t.replace(/\D/g, '').slice(0, 5))}
            placeholder="•••••"
            placeholderTextColor="#4b5563"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={5}
          />
        </View>

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>❌ {error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.btn, (loading || id.length !== 5 || pwd.length !== 5) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading || id.length !== 5 || pwd.length !== 5}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Login to Field App</Text>
          }
        </TouchableOpacity>

        <Text style={s.hint}>Demo: ID 10001–10030, password = same as ID</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#030712', justifyContent: 'center', padding: 24 },
  card:       { backgroundColor: '#111827', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: '#1f2937' },
  emoji:      { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title:      { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle:   { color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 24 },
  field:      { marginBottom: 16 },
  label:      { color: '#9ca3af', fontSize: 12, marginBottom: 6 },
  input:      { backgroundColor: '#1f2937', color: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#374151', letterSpacing: 4 },
  errorBox:   { backgroundColor: '#450a0a', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#991b1b' },
  errorText:  { color: '#fca5a5', fontSize: 12 },
  btn:        { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled:{ backgroundColor: '#374151' },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint:       { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 20 },
})
