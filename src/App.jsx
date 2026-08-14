import { useEffect, useState } from 'react'

export default function App() {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/config')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setConfig)
      .catch(err => setError(err.message))
  }, [])

  return (
    <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-8 text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-primary">exercise-app</h1>
        <p className="mt-2 text-gray-600">
          {error
            ? `API not reachable (${error})`
            : config
              ? `Connected to API — schedule: ${config.scheduleName}, hike days: ${config.hikeDays}`
              : 'Loading…'}
        </p>
      </div>
    </main>
  )
}
