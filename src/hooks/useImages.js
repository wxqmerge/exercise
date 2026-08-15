import { useEffect, useState } from 'react'

export function useImages() {
  const [images, setImages] = useState({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/images')
      .then(res => (res.ok ? res.json() : Promise.resolve({})))
      .then(data => {
        if (!cancelled) setImages(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return images
}
