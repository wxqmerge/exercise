const ENTRIES_STORAGE = 'exercise-entries'

export const loadDayEntries = (day) => {
  try {
    const all = JSON.parse(localStorage.getItem(ENTRIES_STORAGE) || '{}')
    return all[day] || {}
  } catch {
    return {}
  }
}

export const loadAllEntries = () => {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_STORAGE) || '{}')
  } catch {
    return {}
  }
}

export const persistDayEntries = (day, entries) => {
  try {
    const all = JSON.parse(localStorage.getItem(ENTRIES_STORAGE) || '{}')
    all[day] = entries
    localStorage.setItem(ENTRIES_STORAGE, JSON.stringify(all))
  } catch {
    // storage unavailable — keep entries in memory only
  }
}

export const findEntry = (day, exerciseId) => {
  try {
    const all = JSON.parse(localStorage.getItem(ENTRIES_STORAGE) || '{}')
    const forDay = all[day]
    if (forDay && forDay[exerciseId]) return forDay[exerciseId]
    for (const dayEntries of Object.values(all)) {
      if (dayEntries && dayEntries[exerciseId]) return dayEntries[exerciseId]
    }
    return null
  } catch {
    return null
  }
}

export const clearDayEntries = (day) => {
  try {
    const all = JSON.parse(localStorage.getItem(ENTRIES_STORAGE) || '{}')
    delete all[day]
    localStorage.setItem(ENTRIES_STORAGE, JSON.stringify(all))
  } catch {
    // storage unavailable
  }
}
