import { useState } from 'react'
import { useConfig } from './hooks/useConfig'
import { getDayWorkout } from './data/exercises'
import Workout from './components/Workout'

export default function App() {
  const { config, error } = useConfig()
  const [day, setDay] = useState(null)

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

  if (!day) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-primary text-center">Choose a day</h1>
          <div className="mt-6 flex flex-col gap-3">
            {config.days.map(d => (
              <button
                key={d}
                onClick={() => setDay(d)}
                className="bg-primary text-white rounded py-3 font-semibold hover:opacity-90"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return <Workout day={day} exercises={getDayWorkout(config.dayMode, day)} onExit={() => setDay(null)} />
}
