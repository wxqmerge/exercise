import { useRef, useState } from 'react'
import { apiFetch } from '../utils/api'
import { loadDayEntries, loadAllEntries, persistDayEntries, clearDayEntries, syncToServer } from '../utils/entries'
import { getDayWorkout } from '../data/exercises'
import { applySwaps } from '../utils/swaps'
import { joinValues } from '../utils/format'
import { IMAGE_EXTENSIONS } from '../utils/constants'

const DEFAULT_REPS = '10'
const DEFAULT_WEIGHTS = ''

const snapWeight = (value) => {
  const n = Number(value)
  if (value == null || value === '' || !Number.isFinite(n) || n < 0) return ''
  const snapped = Math.round(n / 5) * 5
  return snapped === 0 ? '' : String(snapped)
}

const getSavedValue = (entry, key, fallback) => {
  if (!entry) return fallback
  const v = entry[key]
  if (Array.isArray(v)) {
    const first = v.find(x => x !== '' && x != null) ?? v[0] ?? fallback
    return String(first)
  }
  if (v == null || v === '') return fallback
  return String(v)
}

const imageSearchUrl = (name) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} exercise gif`)}&tbs=iftype:animated`





const isImageUrl = (url) => {
  try {
    const ext = new URL(url, 'http://local').pathname.split('.').pop()?.toLowerCase()
    return IMAGE_EXTENSIONS.includes(ext)
  } catch {
    return false
  }
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const readFileAs = (file, method) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader[method](file)
  })

const selectClass = 'border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700'

const makeSelect = (value, onChange, options, ariaLabel) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    aria-label={ariaLabel}
    className={selectClass}
  >
    {options}
  </select>
)

export default function Workout({ day, days = [], dayMode = 'numbered', workoutType = '', workoutTypes = [], exerciseSwaps = {}, onTypeChange, onDayChange, exercises, images = {}, overrides = {}, onSetImage, onRemoveImage, onRefetchImages, onOpenSettings }) {
  const workoutName = workoutTypes.find(t => t.id === workoutType)?.name || workoutType
  const getStorageKey = (ex) => ex?.originalId || ex?.id
  const loadFormFromEntries = (exercise, entriesMap) => {
    const saved = exercise ? entriesMap[getStorageKey(exercise)] : null
    return {
      reps: getSavedValue(saved, 'reps', DEFAULT_REPS),
      weights: snapWeight(getSavedValue(saved, 'weights', DEFAULT_WEIGHTS))
    }
  }
  const [index, setIndex] = useState(0)
  const [entries, setEntries] = useState(() => loadDayEntries(workoutType, day))
  const [reps, setReps] = useState(() => loadFormFromEntries(exercises[0], entries).reps)
  const [weights, setWeights] = useState(() => loadFormFromEntries(exercises[0], entries).weights)
  const [urlDraft, setUrlDraft] = useState('')
  const [imageError, setImageError] = useState(false)
  const [imageHint, setImageHint] = useState('')
  const [zoomed, setZoomed] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const backupRef = useRef(null)

  const isLast = index === exercises.length - 1
  const finished = index >= exercises.length

  const persistForm = (nextReps, nextWeights) => {
    const exercise = exercises[index]
    if (!exercise) return
    const key = getStorageKey(exercise)
    const repsArr = Array.isArray(nextReps) ? nextReps : [nextReps, nextReps, nextReps]
    const weightsArr = Array.isArray(nextWeights) ? nextWeights : [snapWeight(nextWeights), snapWeight(nextWeights), snapWeight(nextWeights)]
    setEntries(prev => {
      const updated = { ...prev, [key]: { reps: repsArr, weights: weightsArr } }
      persistDayEntries(workoutType, day, updated)
      syncToServer()
      return updated
    })
  }

  const saveAndNext = () => {
    const exercise = exercises[index]
    if (!exercise) return
    const key = getStorageKey(exercise)
    const updatedEntries = { ...entries, [key]: { reps, weights: snapWeight(weights) } }
    setEntries(updatedEntries)
    persistDayEntries(workoutType, day, updatedEntries)
    syncToServer()
    const nextExercise = exercises[index + 1]
    const { reps: r, weights: w } = loadFormFromEntries(nextExercise, updatedEntries)
    setReps(r)
    setWeights(w)
    resetForm()
    setIndex(i => i + 1)
  }

  const nudgeReps = (delta) => {
    const next = reps === '' && delta < 0 ? '' : String(Math.max(0, (Number(reps) || 0) + delta))
    setReps(next)
    persistForm(next, weights)
  }

  const nudgeWeights = (delta) => {
    const current = Number(weights) || 0
    const next = weights === '' && delta < 0 ? '' : String(Math.max(0, Math.round(current / 5) * 5 + delta))
    setWeights(next)
    persistForm(reps, next)
  }

  const resetForm = () => {
    setUrlDraft('')
    setImageError(false)
    setImageHint('')
    setZoomed(false)
  }

  const syncForm = (type, dayName) => {
    const all = loadDayEntries(type, dayName)
    setEntries(all)
    const first = applySwaps(getDayWorkout(type, dayMode, dayName), dayName, exerciseSwaps, type)[0]
    const { reps: r, weights: w } = loadFormFromEntries(first, all)
    setReps(r)
    setWeights(w)
    resetForm()
    setIndex(0)
  }

  const changeDay = (newDay) => {
    if (newDay === day || !onDayChange) return
    syncForm(workoutType, newDay)
    onDayChange(newDay)
  }

  const changeType = (newType) => {
    if (newType === workoutType || !onTypeChange) return
    syncForm(newType, day)
    onTypeChange(newType)
  }

  const goBack = () => {
    if (index === 0) return
    const prev = exercises[index - 1]
    const saved = entries[prev.id]
    setReps(getSavedValue(saved, 'reps', DEFAULT_REPS))
    setWeights(snapWeight(getSavedValue(saved, 'weights', DEFAULT_WEIGHTS)))
    resetForm()
    setIndex(i => i - 1)
  }

  const restart = () => {
    setEntries({})
    clearDayEntries(workoutType, day)
    syncToServer()
    setReps(DEFAULT_REPS)
    setWeights(DEFAULT_WEIGHTS)
    resetForm()
    setIndex(0)
  }

  const daySelect = makeSelect(
    day,
    changeDay,
    days.map(d => <option key={d} value={d}>{d}</option>),
    'Day',
  )

  const typeSelect = makeSelect(
    workoutType,
    changeType,
    workoutTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>),
    'Workout type',
  )

  if (exercises.length === 0) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          {workoutName && <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{workoutName}</p>}
          <h1 className="mt-1 text-2xl font-bold text-primary">{day}</h1>
          <p className="mt-2 text-gray-600">No exercises configured for this day.</p>
        </div>
      </main>
    )
  }

  if (finished) {
    const totalVolume = exercises.reduce((sum, ex) => {
      const e = entries[ex.id]
      const r = e && Array.isArray(e.reps) ? e.reps : []
      const w = e && Array.isArray(e.weights) ? e.weights : []
      return sum + r.reduce((s, rep, i) => s + (Number(rep) || 0) * (Number(w[i]) || 0), 0)
    }, 0)
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-primary text-center">Workout complete</h1>
          {workoutName && <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{workoutName}</p>}
          <p className="text-center text-gray-500">{day}</p>
          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Exercise</th>
                <th className="py-2 text-right">Reps</th>
                <th className="py-2 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map(ex => {
                const e = entries[ex.id]
                return (
                  <tr key={ex.id} className="border-b last:border-0">
                    <td className="py-2">{ex.name}</td>
                    <td className="py-2 text-right">{joinValues(e?.reps)}</td>
                    <td className="py-2 text-right">{joinValues(e?.weights)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            <p className="mt-4 text-right font-semibold">Total volume: {totalVolume}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                Workout
                {typeSelect}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                Day
                {daySelect}
              </span>
              <button
                onClick={onOpenSettings}
                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50"
              >
                Settings
              </button>
            </div>
            <button
              onClick={restart}
              className="mt-4 w-full bg-primary text-white rounded py-2 font-semibold hover:opacity-90"
            >
              Start over
            </button>
        </div>
      </main>
    )
  }

  const exercise = exercises[index]

  const saveImage = async () => {
    const trimmed = urlDraft.trim()
    if (!trimmed || !onSetImage || saving) return
    if (!isImageUrl(trimmed)) {
      setImageHint('Not an image link — use .jpg, .jpeg, .png, .gif or .webp')
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch('/api/images/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise.id, url: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        await onRefetchImages()
        setImageHint('')
      } else {
        onSetImage(exercise.id, trimmed)
        setImageHint(`Saved link only — ${data?.error?.message || 'download failed'}`)
      }
    } catch {
      onSetImage(exercise.id, trimmed)
      setImageHint('Saved link only — server unreachable')
    }
    setUrlDraft('')
    setImageError(false)
    setSaving(false)
  }

  const importFile = async (file) => {
    if (!file || saving) return
    if (file.size > 10 * 1024 * 1024) {
      setImageHint('Image too large (max 10 MB)')
      return
    }
    setSaving(true)
    try {
      const dataUrl = await readFileAs(file, 'readAsDataURL')
      const res = await apiFetch('/api/images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise.id, dataUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        await onRefetchImages()
        setImageHint('')
      } else {
        setImageHint(data?.error?.message || 'Import failed')
      }
    } catch {
      setImageHint('Import failed — server unreachable')
    }
    setSaving(false)
  }

  const exportData = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await apiFetch('/api/export')
      if (!res.ok) {
        setImageHint('Export failed')
        return
      }
      downloadBlob(await res.blob(), 'exercise-backup.json')
    } catch {
      setImageHint('Export failed — server unreachable')
    }
    setSaving(false)
  }

  const downloadWorkout = () => {
    const all = loadAllEntries()
    const lines = [['Day', 'Exercise', 'Reps', 'Weight']]
    for (const d of days) {
      const dayEntries = all[workoutType]?.[d] || {}
      for (const ex of applySwaps(getDayWorkout(workoutType, dayMode, d), d, exerciseSwaps, workoutType)) {
        const key = getStorageKey(ex)
        const e = dayEntries[key]
        lines.push([
          d,
          ex.name,
          e?.reps || '',
          e?.weights || '',
        ])
      }
    }
    downloadBlob(
      new Blob([lines.map(l => l.join('\t')).join('\n')], { type: 'text/tab-separated-values' }),
      'workout.tab',
    )
  }

  const importBackup = async (file) => {
    if (!file || saving) return
    setSaving(true)
    try {
      const text = await readFileAs(file, 'readAsText')
      const data = JSON.parse(text)
      const res = await apiFetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json().catch(() => ({}))
      if (res.ok && result.success) {
        await onRefetchImages()
        setImageHint(
          result.errors?.length
            ? `Imported ${result.imported.length} image(s) — ${result.errors.length} skipped`
            : `Imported ${result.imported.length} image(s)`,
        )
      } else {
        setImageHint(result?.error?.message || 'Import failed')
      }
    } catch {
      setImageHint('Invalid backup file')
    }
    setSaving(false)
  }

  const removeImage = async () => {
    const current = images[exercise.id]
    if (!current) return
      if (current.startsWith('/api/images/')) {
        await apiFetch(current, { method: 'DELETE' }).catch(() => {})
      await onRefetchImages()
    } else if (overrides[exercise.id]) {
      onRemoveImage(exercise.id)
    }
    setZoomed(false)
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0]">
      <div className="max-w-3xl mx-auto bg-white shadow">
        <div className="px-4 pt-4 text-center">
          {workoutName && <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">{workoutName}</p>}
          <p className="mt-1 text-sm text-gray-500">
            {day} · Exercise {index + 1} of {exercises.length}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-primary">{exercise.name}</h1>
          {exercise.description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{exercise.description}</p>
          )}
        </div>

        <div className="relative">
        {images[exercise.id] && !imageError ? (
          <div>
            <img
              src={images[exercise.id]}
              alt={exercise.name}
              className="mt-4 w-full h-[70vh] object-contain bg-gray-100 cursor-zoom-in"
              onClick={() => setZoomed(true)}
              onError={() => {
                setImageError(true)
                setUrlDraft(images[exercise.id] || '')
              }}
            />
            <div className="px-4 py-2 flex gap-3 justify-center">
              <button
                onClick={removeImage}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Remove image
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="text-xs text-gray-400 hover:text-primary disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        ) : (
          <div className="m-4 h-[70vh] rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-4 text-center">
            <a
              href={imageSearchUrl(exercise.name)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-gray-500 hover:text-primary"
            >
              No image — click to search
            </a>
            <div className="mt-3 flex gap-2 w-full max-w-md">
              <input
                value={urlDraft}
                onChange={e => {
                  setUrlDraft(e.target.value)
                  setImageHint('')
                }}
                onKeyDown={e => e.key === 'Enter' && saveImage()}
                placeholder="Paste image URL…"
                aria-label="Image URL"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={saveImage}
                disabled={saving}
                className="px-3 py-2 bg-primary text-white rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        )}
        {index > 0 && (
          <button
            onClick={goBack}
            aria-label="Back"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white text-2xl leading-none flex items-center justify-center hover:bg-black/60"
          >
            ‹
          </button>
        )}
        <button
          onClick={saveAndNext}
          aria-label={isLast ? 'Finish' : 'Next'}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white text-2xl leading-none flex items-center justify-center hover:bg-black/60"
        >
          ›
        </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          aria-label="Import image"
          className="hidden"
          onChange={e => {
            importFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {imageHint && <p className="px-4 pb-2 text-xs text-red-500">{imageHint}</p>}

        <div className="px-6 pb-2">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2">
            <span className="text-sm text-gray-600">Reps</span>
            <span />
            <span className="text-sm text-gray-600">Weight</span>
            <span />
          </div>
          <div className="mt-1">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={reps}
                onChange={e => {
                  const next = e.target.value
                  setReps(next)
                  persistForm(next, weights)
                }}
                aria-label="Set 1 reps"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="0"
              />
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => nudgeReps(-1)}
                  aria-label="Decrease reps"
                  className="w-7 h-8 border border-gray-300 rounded bg-white text-gray-600 text-sm leading-none hover:bg-gray-50"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => nudgeReps(1)}
                  aria-label="Increase reps"
                  className="w-7 h-8 border border-gray-300 rounded bg-white text-gray-600 text-sm leading-none hover:bg-gray-50"
                >
                  +
                </button>
              </span>
              <input
                type="number"
                min="0"
                step="5"
                inputMode="decimal"
                value={weights}
                onChange={e => {
                  const next = e.target.value
                  setWeights(next)
                  persistForm(reps, next)
                }}
                onBlur={() => {
                  const snapped = snapWeight(weights)
                  if (snapped !== weights) {
                    setWeights(snapped)
                    persistForm(reps, snapped)
                  }
                }}
                aria-label="Set 1 weight"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="0"
              />
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => nudgeWeights(-5)}
                  aria-label="Decrease weight"
                  className="w-7 h-8 border border-gray-300 rounded bg-white text-gray-600 text-sm leading-none hover:bg-gray-50"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => nudgeWeights(5)}
                  aria-label="Increase weight"
                  className="w-7 h-8 border border-gray-300 rounded bg-white text-gray-600 text-sm leading-none hover:bg-gray-50"
                >
                  +
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center gap-2 flex-wrap">
          <label className="text-xs text-gray-400 flex items-center gap-1">
            Workout
            {typeSelect}
          </label>
          <label className="text-xs text-gray-400 flex items-center gap-1">
            Day
            {daySelect}
          </label>
          <span className="text-xs text-gray-400">Backup</span>
          <button
            onClick={exportData}
            disabled={saving}
            className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Export
          </button>
          <button
            onClick={() => backupRef.current?.click()}
            disabled={saving}
            className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Import
          </button>
          <input
            ref={backupRef}
            type="file"
            accept="application/json,.json"
            aria-label="Import backup"
            className="hidden"
            onChange={e => {
              importBackup(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <span className="text-xs text-gray-400">Workout</span>
          <button
            onClick={downloadWorkout}
            className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50"
          >
            Download
          </button>
          <button
            onClick={onOpenSettings}
            className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50"
          >
            Settings
          </button>
        </div>
      </div>

      {zoomed && (
        <div
          role="dialog"
          aria-label={`${exercise.name} image`}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <img
            src={images[exercise.id]}
            alt={exercise.name}
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 px-3 py-1 rounded bg-white/20 text-white text-sm hover:bg-white/30"
          >
            Close
          </button>
        </div>
      )}
    </main>
  )
}
