import { useEffect, useState } from 'react'
import { useImages } from './useImages'

const STORAGE_KEY = 'exercise-images'

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function useExerciseImages() {
  const serverImages = useImages()
  const [overrides, setOverrides] = useState(loadOverrides)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  }, [overrides])

  const setOverride = (id, url) => {
    setOverrides(prev => ({ ...prev, [id]: url }))
  }

  const removeOverride = (id) => {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  return { images: { ...serverImages, ...overrides }, overrides, setOverride, removeOverride }
}
