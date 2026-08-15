import { useState } from 'react'
import { useConfig } from './hooks/useConfig'
import { useExerciseImages } from './hooks/useExerciseImages'
import { getDayWorkout } from './data/exercises'
import { getDayForDate } from './utils/day'
import Workout from './components/Workout'

export default function App() {
  const { config, error } = useConfig()
  const { images, overrides, setOverride, removeOverride, refetch } = useExerciseImages()
  const [today] = useState(() => new Date())

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-primary">Cannot load workout config</h1>
          <p className="mt-2 text-gray-600">{error} — is the API server running?</p>
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
