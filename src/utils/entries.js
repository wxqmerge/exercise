import { apiFetch } from './api'
import { safeParseLocalStorage } from './storage'

const ENTRIES_STORAGE = 'exercise-entries'
const DAY_KEY = /^(Day \d+|Odd|Even)$/
const LEGACY_TYPE = 'dumbbells'

const readRaw = () => safeParseLocalStorage(ENTRIES_STORAGE, {})

const normalizeValue = (v) => {
  if (Array.isArray(v)) {
    return v.map(String)
  }
  if (v == null) return ['', '', '']
  return [String(v), String(v), String(v)]
}

const normalizeEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return { reps: ['', '', ''], weights: ['', '', ''] }
  return {
    reps: normalizeValue(entry.reps),
    weights: normalizeValue(entry.weights),
  }
}

const normalizeAll = (all) => {
  const out = {}
  Object.entries(all).forEach(([type, days]) => {
    out[type] = {}
    Object.entries(days || {}).forEach(([day, exMap]) => {
      out[type][day] = {}
      Object.entries(exMap || {}).forEach(([id, entry]) => {
        out[type][day][id] = normalizeEntry(entry)
      })
    })
  })
  return out
}

// Legacy schema was { [day]: { [exerciseId]: ... } }; the current schema is
// { [type]: { [day]: { [exerciseId]: ... } } }. Wrap legacy stores under the
// default type so logged dumbbell entries survive the upgrade.
const readAll = () => {
  const all = readRaw()
  const keys = Object.keys(all)
  const wrapped = keys.length > 0 && keys.every(k => DAY_KEY.test(k)) ? { [LEGACY_TYPE]: all } : all
  return normalizeAll(wrapped)
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
  const normalized = {}
  Object.entries(entries || {}).forEach(([id, e]) => {
    normalized[id] = normalizeEntry(e)
  })
  all[type] = { ...(all[type] || {}), [day]: normalized }
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
      const serverNorm = normalizeAll(server)
      const merged = { ...local }
      Object.entries(serverNorm).forEach(([type, serverDays]) => {
        merged[type] = { ...(merged[type] || {}) }
        Object.entries(serverDays).forEach(([day, serverEx]) => {
          merged[type][day] = { ...(merged[type][day] || {}) }
          Object.entries(serverEx).forEach(([id, s]) => {
            const l = merged[type][day][id]
            if (!l || typeof l !== 'object') {
              merged[type][day][id] = { reps: s.reps, weights: s.weights }
            } else {
              merged[type][day][id] = {
                ...l,
                reps: l.reps || s.reps,
                weights: l.weights || s.weights,
              }
            }
          })
        })
      })
      writeAll(merged)
      return merged
    })
    .catch(() => null)
