import { useState, useEffect } from 'react'
import { LatLng } from './types'

interface Props {
  selectedCoords: LatLng | null
  onPickCoords: () => void
  pickingCoords: boolean
}

const BACKEND = 'http://localhost:8080'

export default function BusManualForm({ selectedCoords, onPickCoords, pickingCoords }: Props) {
  const [busId,     setBusId]     = useState('')
  const [lastStop,  setLastStop]  = useState('')
  const [onboard,   setOnboard]   = useState('')
  const [validated, setValidated] = useState('')
  const [lat,       setLat]       = useState('')
  const [lon,       setLon]       = useState('')
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message,   setMessage]   = useState('')

  useEffect(() => {
    if (selectedCoords) {
      setLat(selectedCoords.lat.toFixed(6))
      setLon(selectedCoords.lon.toFixed(6))
    }
  }, [selectedCoords])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch(`${BACKEND}/api/v1/buses/manual-inject`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          busId,
          lastStop,
          onboard:   Number(onboard),
          validated: Number(validated),
          lat:       Number(lat),
          lon:       Number(lon),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Injection failed')

      setStatus('ok')
      setMessage(`✅ Bus ${busId} injected — ${data.bus.evaders} evaders`)
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Unknown error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const evadersPreview = Math.max(0, Number(onboard || 0) - Number(validated || 0))
  const alertPreview   = evadersPreview >= 3

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* Bus ID */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Bus ID / Line</label>
        <input
          value={busId}
          onChange={e => setBusId(e.target.value)}
          placeholder="e.g. line_189_holon"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Last Stop */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Current Station</label>
        <input
          value={lastStop}
          onChange={e => setLastStop(e.target.value)}
          placeholder="e.g. Holon Central"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Onboard (APC)</label>
          <input
            type="number" min="0"
            value={onboard}
            onChange={e => setOnboard(e.target.value)}
            placeholder="0"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Validated (AFC)</label>
          <input
            type="number" min="0"
            value={validated}
            onChange={e => setValidated(e.target.value)}
            placeholder="0"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Live evaders preview */}
      {onboard && validated && (
        <div className={`text-xs rounded px-2 py-1.5 text-center font-semibold ${
          alertPreview ? 'bg-red-900/60 text-red-300' : 'bg-green-900/40 text-green-300'
        }`}>
          {alertPreview ? '⚠️' : '✓'} {evadersPreview} evaders — will appear {alertPreview ? 'RED' : 'GREEN'}
        </div>
      )}

      {/* GPS */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs text-gray-400">GPS Coordinates</label>
          <button
            type="button"
            onClick={onPickCoords}
            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
              pickingCoords
                ? 'bg-yellow-600 text-white animate-pulse'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {pickingCoords ? '🎯 Click on map...' : '📍 Pick on map'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" step="any"
            value={lat}
            onChange={e => setLat(e.target.value)}
            placeholder="Latitude"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
          <input
            type="number" step="any"
            value={lon}
            onChange={e => setLon(e.target.value)}
            placeholder="Longitude"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-2 rounded text-sm transition-colors"
      >
        {status === 'loading' ? 'Injecting...' : '🚌 Inject Bus'}
      </button>

      {status !== 'idle' && status !== 'loading' && (
        <div className={`text-xs text-center rounded px-2 py-1.5 ${
          status === 'ok' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message}
        </div>
      )}
    </form>
  )
}
