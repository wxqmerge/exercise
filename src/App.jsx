import { useState } from 'react'
import { useConfig } from './hooks/useConfig'
import { useExerciseImages } from './hooks/useExerciseImages'
import { getDayWorkout } from './data/exercises'
import { getDayForDate } from './utils/day'
import { getApiKey, setApiKey, clearApiKey } from './utils/api'
import Workout from './components/Workout'
import KeyGate from './components/KeyGate'

function WorkoutApp({ onKeyCleared }) {
  const { config, error, invalidKey } = useConfig()
  const { images, overrides, setOverride, removeOverride, refetch } = useExerciseImages()
  const [today] = useState(() => new Date())

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

  const day = getDayForDate(today, config.dayMode, config.days)

  return (
    <Workout
      day={day}
      exercises={getDayWorkout(config.dayMode, day)}
      images={images}
      overrides={overrides}
      onSetImage={setOverride}
      onRemoveImage={removeOverride}
      onRefetchImages={refetch}
    />
  )
}

export default function App() {
  const [key, setKey] = useState(() => getApiKey())

  if (!key) {
    return (
      <KeyGate
        onUnlock={(unlocked) => {
          setApiKey(unlocked)
          setKey(unlocked)
        }}
      />
    )
  }

  return <WorkoutApp key={key} onKeyCleared={() => setKey('')} />
}
