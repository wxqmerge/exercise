import { useEffect, useState } from 'react'
import { useImages } from './useImages'
import { safeParseLocalStorage } from '../utils/storage'

const STORAGE_KEY = 'exercise-images'

function loadOverrides() {
  return safeParseLocalStorage(STORAGE_KEY, {})
}

export function useExerciseImages() {
  const { images: serverImages, refetch } = useImages()
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

  return { images: { ...serverImages, ...overrides }, overrides, setOverride, removeOverride, refetch }
}
