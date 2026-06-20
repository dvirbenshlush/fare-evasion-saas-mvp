import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from './types'

interface Props {
  messages:  ChatMessage[]
  currentId: string
  onSend:    (text: string) => void
}

export default function InspectorChat({ messages, currentId, onSend }: Props) {
  const [text,      setText]      = useState('')
  const bottomRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-8">No messages yet</p>
        )}
        {messages.map(msg => {
          const isMine = msg.from === currentId
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-3 py-1.5 max-w-[85%] text-xs break-words ${
                isMine ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
              }`}>
                {!isMine && (
                  <div className="text-purple-300 font-semibold mb-0.5 text-xs">{msg.fromName}</div>
                )}
                <div>{msg.text}</div>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {new Date(msg.ts).toLocaleTimeString()}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-gray-700">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message all inspectors…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 rounded-lg text-xs font-bold transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
