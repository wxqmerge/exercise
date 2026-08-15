const ENTRIES_STORAGE = 'exercise-entries'
const DAY_KEY = /^(Day \d+|Odd|Even)$/
const LEGACY_TYPE = 'dumbbells'

const readRaw = () => {
  try {
    const all = JSON.parse(localStorage.getItem(ENTRIES_STORAGE) || '{}')
    return all && typeof all === 'object' ? all : {}
  } catch {
    return {}
  }
}

// Legacy schema was { [day]: { [exerciseId]: ... } }; the current schema is
// { [type]: { [day]: { [exerciseId]: ... } } }. Wrap legacy stores under the
// default type so logged dumbbell entries survive the upgrade.
const readAll = () => {
  const all = readRaw()
  const keys = Object.keys(all)
  if (keys.length > 0 && keys.every(k => DAY_KEY.test(k))) {
    return { [LEGACY_TYPE]: all }
  }
  return all
}

const writeAll = (all) => {
  try {
    localStorage.setItem(ENTRIES_STORAGE, JSON.stringify(all))
  } catch {
    // storage unavailable — keep entries in memory only
  }
}

export const loadDayEntries = (type, day) => {
  return readAll()[type]?.[day] || {}
}

export const loadAllEntries = () => readAll()

export const persistDayEntries = (type, day, entries) => {
  const all = readAll()
  all[type] = { ...(all[type] || {}), [day]: entries }
  writeAll(all)
}

export const findEntry = (type, day, exerciseId) => {
  const forType = readAll()[type] || {}
  const forDay = forType[day]
  if (forDay && forDay[exerciseId]) return forDay[exerciseId]
  for (const dayEntries of Object.values(forType)) {
    if (dayEntries && dayEntries[exerciseId]) return dayEntries[exerciseId]
  }
  return null
}

export const clearDayEntries = (type, day) => {
  const all = readAll()
  if (all[type]) {
    delete all[type][day]
    writeAll(all)
  }
}
