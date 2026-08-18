import { apiFetch } from './api'
import { safeParseLocalStorage } from './storage'

const ENTRIES_STORAGE = 'exercise-entries'
const DAY_KEY = /^(Day \d+|Odd|Even)$/
const LEGACY_TYPE = 'dumbbells'

const readRaw = () => safeParseLocalStorage(ENTRIES_STORAGE, {})

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
  return Object.values(forType).find(dayEntries => dayEntries && dayEntries[exerciseId])?.[exerciseId] || null
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
      const merged = { ...local }
      Object.entries(server).forEach(([type, serverDays]) => {
        if (!serverDays || typeof serverDays !== 'object') return
        merged[type] = { ...(merged[type] || {}) }
        Object.entries(serverDays).forEach(([day, serverEx]) => {
          if (!serverEx || typeof serverEx !== 'object') return
          merged[type][day] = { ...(merged[type][day] || {}) }
          Object.entries(serverEx).forEach(([id, s]) => {
            if (!s || typeof s !== 'object') return
            const l = merged[type][day][id]
            if (!l || typeof l !== 'object') {
              merged[type][day][id] = { reps: s.reps, weights: s.weights }
            } else {
              merged[type][day][id] = {
                ...l,
                reps: l.reps ?? s.reps,
                weights: l.weights ?? s.weights,
              }
            }
          })
        })
      })
      writeAll(merged)
      return merged
    })
    .catch(() => null)
