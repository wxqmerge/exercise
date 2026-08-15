import { useState, useEffect } from 'react'
import { useConfig } from './hooks/useConfig'
import { useExerciseImages } from './hooks/useExerciseImages'
import { PROGRAMS, DEFAULT_TYPE, getDayWorkout } from './data/exercises'
import { applySwaps } from './utils/swaps'
import { getDayForDate } from './utils/day'
import { apiFetch, getApiKey, setApiKey, clearApiKey, getKeyFromUrl } from './utils/api'
import Workout from './components/Workout'
import Settings from './components/Settings'
import KeyGate from './components/KeyGate'

function WorkoutApp({ onKeyCleared }) {
  const { config, error, invalidKey, refresh } = useConfig()
  const { images, overrides, setOverride, removeOverride, refetch } = useExerciseImages()
  const [today] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [view, setView] = useState('workout')

  const changeKey = () => {
    clearApiKey()
    onKeyCleared()
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-primary">Cannot load workout config</h1>
          <p className="mt-2 text-gray-600">{error} — is the API server running?</p>
          {invalidKey && (
            <button
              onClick={changeKey}
              className="mt-4 w-full bg-primary text-white rounded py-2 font-semibold hover:opacity-90"
            >
              Change key
            </button>
          )}
        </div>
      </main>
    )
  }

  if (!config) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <p className="text-gray-600">Loading…</p>
      </main>
    )
  }

  const day = selectedDay && config.days.includes(selectedDay)
    ? selectedDay
    : getDayForDate(today, config.dayMode, config.days)

  const type = selectedType && PROGRAMS[selectedType]
    ? selectedType
    : config.workoutType && PROGRAMS[config.workoutType]
      ? config.workoutType
      : DEFAULT_TYPE

  const changeType = (newType) => {
    if (!PROGRAMS[newType]) return
    setSelectedType(newType)
    apiFetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutType: newType }),
    }).catch(() => {})
  }

  if (view === 'settings') {
    return (
      <Settings
        config={config}
        workoutType={type}
        workoutTypes={Object.entries(PROGRAMS).map(([id, p]) => ({ id, name: p.name }))}
        onTypeChange={changeType}
        onSaved={data => {
          if (data?.days) refresh()
        }}
        onBack={() => setView('workout')}
      />
    )
  }

  return (
    <Workout
      day={day}
      days={config.days}
      dayMode={config.dayMode}
      workoutType={type}
      workoutTypes={Object.entries(PROGRAMS).map(([id, p]) => ({ id, name: p.name }))}
      onTypeChange={changeType}
      onDayChange={setSelectedDay}
      exercises={applySwaps(getDayWorkout(type, config.dayMode, day), day, config.exerciseSwaps, type)}
      images={images}
      overrides={overrides}
      onSetImage={setOverride}
      onRemoveImage={removeOverride}
      onRefetchImages={refetch}
      onOpenSettings={() => setView('settings')}
    />
  )
}

export default function App() {
  const [key, setKey] = useState(() => {
    const urlKey = getKeyFromUrl()
    if (urlKey) {
      setApiKey(urlKey)
      return urlKey
    }
    return getApiKey()
  })
  const [needsKey, setNeedsKey] = useState(null)

  useEffect(() => {
    if (key !== '') return
    let cancelled = false
    fetch('/api/config')
      .then(res => {
        if (!cancelled) setNeedsKey(res.status === 401)
      })
      .catch(() => {
        if (!cancelled) setNeedsKey(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  if (key) {
    return <WorkoutApp key={key} onKeyCleared={() => setKey('')} />
  }

  if (needsKey === null) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <p className="text-gray-600">Loading…</p>
      </main>
    )
  }

  if (needsKey) {
    return (
      <KeyGate
        onUnlock={(unlocked) => {
          setApiKey(unlocked)
          setKey(unlocked)
        }}
      />
    )
  }

  return <WorkoutApp key="no-key" onKeyCleared={() => setKey('')} />
}
