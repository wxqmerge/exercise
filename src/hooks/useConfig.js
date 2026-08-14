import { useEffect, useState } from 'react'

export function useConfig() {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/config')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(data => {
        if (!cancelled) setConfig(data)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { config, error }
}
