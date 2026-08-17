import { useState } from 'react'
import { apiFetch } from '../utils/api'
import { findEntry } from '../utils/entries'
import { programExercises } from '../utils/swaps'
import { getProgram } from '../data/exercises'
import { formatEntry } from '../utils/format'
import { workoutsFor } from '../utils/days'

const DAY_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]





export default function Settings({ config, workoutType = '', workoutTypes = [], onTypeChange, onSaved, onBack }) {
  const [mode, setMode] = useState(config.dayMode)
  const [count, setCount] = useState(config.dayCount || 3)
  const [swaps, setSwaps] = useState(config.exerciseSwaps || {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const workoutName = workoutTypes.find(t => t.id === workoutType)?.name || workoutType
  const workouts = workoutsFor(workoutType, mode, count, getProgram)

  const save = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await apiFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayMode: mode, dayCount: count, exerciseSwaps: swaps }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSaved(true)
        onSaved(data)
      } else {
        setError(data?.error?.message || 'Save failed')
      }
    } catch {
      setError('Save failed — server unreachable')
    }
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] p-4">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg">
        <div className="px-6 pt-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Settings</h1>
          <button
            onClick={onBack}
            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Workout days</h2>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <select
              value={workoutType}
              onChange={e => onTypeChange(e.target.value)}
              aria-label="Workout type"
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-700"
            >
              {workoutTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={mode}
              onChange={e => {
                setMode(e.target.value)
                setSaved(false)
              }}
              aria-label="Day mode"
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-700"
            >
              <option value="odd-even">Odd / Even</option>
              <option value="numbered">Numbered</option>
            </select>
            {mode === 'numbered' && (
              <select
                value={count}
                onChange={e => {
                  setCount(Number(e.target.value))
                  setSaved(false)
                }}
                aria-label="Day count"
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-700"
              >
                {DAY_COUNTS.map(n => (
                  <option key={n} value={n}>
                    {n} day{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1 bg-primary text-white rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {saved && <p className="mt-2 text-xs text-green-600">Saved</p>}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <div className="px-6 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-gray-700">All workouts</h2>
            {workoutName && <span className="text-xs text-gray-400">{workoutName}</span>}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Pick a replacement to permanently swap an exercise on that day, then press Save.
          </p>
          <div className="mt-2 space-y-4">
            {workouts.map(({ day, exercises }) => {
              return (
                <section key={day}>
                  <h3 className="text-sm font-semibold text-gray-700">
                    {day} <span className="text-gray-400 font-normal">({exercises.length})</span>
                  </h3>
                  {exercises.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {exercises.map(ex => {
                        const repId = swaps[day]?.[ex.id] || ''
                          const entry = findEntry(workoutType, day, repId || ex.id)
                        return (
                          <li
                            key={ex.id}
                            className="flex items-center gap-2 text-sm flex-wrap"
                          >
                          <span className="text-gray-600">{ex.name}</span>
                          <select
                            value={repId}
                            onChange={e => {
                              const value = e.target.value
                              setSwaps(prev => {
                                const daySwaps = { ...(prev[day] || {}) }
                                if (value) daySwaps[ex.id] = value
                                else delete daySwaps[ex.id]
                                const next = { ...prev }
                                if (Object.keys(daySwaps).length > 0) next[day] = daySwaps
                                else delete next[day]
                                return next
                              })
                              setSaved(false)
                            }}
                            aria-label={`Replace ${ex.name} on ${day}`}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-500"
                          >
                            <option value="">—</option>
                            {programExercises(workoutType).filter(o => o.id !== ex.id).map(o => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                          <span className="ml-auto text-gray-400 tabular-nums whitespace-nowrap">
                            {formatEntry(entry)}
                          </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">No exercises configured</p>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
