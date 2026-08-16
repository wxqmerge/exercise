import { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export function useConfig() {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)
  const [invalidKey, setInvalidKey] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/config')
      .then(res => {
        if (res.status === 401) {
          if (!cancelled) {
            setInvalidKey(true)
            setError('Invalid key')
          }
          return null
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (data) {
          setConfig(data)
          setError(null)
          setInvalidKey(false)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  return { config, error, invalidKey, refresh: () => setReload(r => r + 1) }
}
