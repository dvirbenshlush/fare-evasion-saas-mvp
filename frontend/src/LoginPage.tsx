import { useState } from 'react'

interface Props {
  onLogin: (id: string, password: string) => void
  onBack:  () => void
  error:   string | null
  loading: boolean
}

export default function LoginPage({ onLogin, onBack, error, loading }: Props) {
  const [id,  setId]  = useState('')
  const [pwd, setPwd] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (id.length === 5 && pwd.length === 5) onLogin(id, pwd)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-96 shadow-2xl">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👮</div>
          <h1 className="text-xl font-bold text-white">Inspector Login</h1>
          <p className="text-xs text-gray-500 mt-1">Fare Evasion Operations Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Employee ID (5 digits)</label>
            <input
              value={id}
              onChange={e => setId(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="10001"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm tracking-widest placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Password (5 digits)</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="•••••"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm tracking-widest placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-800 rounded-lg px-3 py-2 text-xs text-red-300">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || id.length !== 5 || pwd.length !== 5}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Connecting...' : 'Login to Field App'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center mb-3">
            Demo credentials: ID <b className="text-gray-500">10001–10050</b>, password = same as ID
          </p>
          <button onClick={onBack} className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to Operations Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
