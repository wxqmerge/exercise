import { useCallback, useEffect, useState } from 'react'

export function useImages() {
  const [images, setImages] = useState({})
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/images')
      .then(res => (res.ok ? res.json() : Promise.resolve(null)))
      .then(data => {
        if (!cancelled && data) setImages(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [nonce])

  const refetch = useCallback(() => setNonce(n => n + 1), [])

  return { images, refetch }
}
