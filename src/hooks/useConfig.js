import { useEffect, useState } from 'react'
import { apiFetch, getApiKey } from '../utils/api'

export function useConfig() {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)
  const [invalidKey, setInvalidKey] = useState(false)

  useEffect(() => {
    const key = getApiKey()
    if (!key) return
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
        if (!cancelled && data) setConfig(data)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { config, error, invalidKey }
}
