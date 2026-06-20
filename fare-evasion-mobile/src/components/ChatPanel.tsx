import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { ChatMessage } from '../types'

interface Props {
  messages:  ChatMessage[]
  currentId: string
  onSend:    (text: string) => void
}

export default function ChatPanel({ messages, currentId, onSend }: Props) {
  const [text, setText]   = useState('')
  const flatRef           = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 0) flatRef.current?.scrollToEnd({ animated: true })
  }, [messages])

  function handleSend() {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={{ padding: 12, gap: 8, flexGrow: 1, justifyContent: messages.length === 0 ? 'center' : 'flex-start' }}
        ListEmptyComponent={<Text style={s.empty}>No messages yet</Text>}
        renderItem={({ item: msg }) => {
          const isMine = msg.from === currentId
          return (
            <View style={[s.msgRow, isMine && s.msgRowMine]}>
              <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
                {!isMine && <Text style={s.fromName}>{msg.fromName}</Text>}
                <Text style={s.msgText}>{msg.text}</Text>
                <Text style={s.time}>{new Date(msg.ts).toLocaleTimeString()}</Text>
              </View>
            </View>
          )
        }}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Message all inspectors…"
          placeholderTextColor="#4b5563"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={[s.sendBtn, !text.trim() && s.sendBtnOff]} onPress={handleSend} disabled={!text.trim()}>
          <Text style={s.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  empty:       { color: '#4b5563', textAlign: 'center', fontSize: 13 },
  msgRow:      { flexDirection: 'row' },
  msgRowMine:  { justifyContent: 'flex-end' },
  bubble:      { maxWidth: '80%', borderRadius: 12, padding: 10, gap: 3 },
  bubbleMine:  { backgroundColor: '#1d4ed8' },
  bubbleOther: { backgroundColor: '#1f2937' },
  fromName:    { color: '#c084fc', fontSize: 11, fontWeight: '700' },
  msgText:     { color: '#f3f4f6', fontSize: 13 },
  time:        { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  inputRow:    { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#1f2937', backgroundColor: '#111827' },
  input:       { flex: 1, backgroundColor: '#1f2937', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  sendBtnOff:  { backgroundColor: '#374151' },
  sendText:    { color: '#fff', fontSize: 18, fontWeight: '700' },
})
