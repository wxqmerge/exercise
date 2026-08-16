import { apiFetch } from './api'

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

// Push the full local map to the server (replaces the server copy).
// Best effort: an offline push just never arrives; the next push is a full map.
let syncTimer = null
export const syncToServer = () => {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    apiFetch('/api/entries', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loadAllEntries()),
    }).catch(() => {})
  }, 300)
}

// Pull server entries and merge them under the local ones (local wins;
// server values fill missing entries/fields). Best effort.
export const pullFromServer = () =>
  apiFetch('/api/entries')
    .then(res => (res.ok ? res.json() : {}))
    .then(server => {
      if (!server || typeof server !== 'object') return null
      const local = loadAllEntries()
      const merged = local
      for (const type of Object.keys(server)) {
        const serverDays = server[type]
        if (!serverDays || typeof serverDays !== 'object') continue
        if (!merged[type] || typeof merged[type] !== 'object') merged[type] = {}
        for (const day of Object.keys(serverDays)) {
          const serverEx = serverDays[day]
          if (!serverEx || typeof serverEx !== 'object') continue
          if (!merged[type][day] || typeof merged[type][day] !== 'object') merged[type][day] = {}
          for (const id of Object.keys(serverEx)) {
            const s = serverEx[id]
            if (!s || typeof s !== 'object') continue
            const l = merged[type][day][id]
            if (!l || typeof l !== 'object') {
              merged[type][day][id] = { reps: s.reps, weights: s.weights }
            } else {
              const entry = { ...l }
              if (entry.reps === undefined && s.reps !== undefined) entry.reps = s.reps
              if (entry.weights === undefined && s.weights !== undefined) entry.weights = s.weights
              merged[type][day][id] = entry
            }
          }
        }
      }
      writeAll(merged)
      return merged
    })
    .catch(() => null)
