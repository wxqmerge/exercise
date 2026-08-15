import { useState } from 'react'

const imageSearchUrl = (name) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} exercise`)}`

export default function Workout({ day, exercises, images = {}, onSetImage }) {
  const [index, setIndex] = useState(0)
  const [entries, setEntries] = useState({})
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [urlDraft, setUrlDraft] = useState('')
  const [imageError, setImageError] = useState(false)

  const isLast = index === exercises.length - 1
  const finished = index >= exercises.length

  const saveAndNext = () => {
    const exercise = exercises[index]
    setEntries(prev => ({ ...prev, [exercise.id]: { reps, weight } }))
    setReps('')
    setWeight('')
    setUrlDraft('')
    setImageError(false)
    setIndex(i => i + 1)
  }

  const goBack = () => {
    if (index === 0) return
    const prev = exercises[index - 1]
    const saved = entries[prev.id]
    if (saved) {
      setReps(saved.reps)
      setWeight(saved.weight)
    }
    setUrlDraft('')
    setImageError(false)
    setIndex(i => i - 1)
  }

  const restart = () => {
    setEntries({})
    setReps('')
    setWeight('')
    setUrlDraft('')
    setImageError(false)
    setIndex(0)
  }

  if (exercises.length === 0) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-primary">{day}</h1>
          <p className="mt-2 text-gray-600">No exercises configured for this day.</p>
        </div>
      </main>
    )
  }

  if (finished) {
    const totalVolume = Object.values(entries).reduce(
      (sum, e) => sum + (Number(e.reps) || 0) * (Number(e.weight) || 0),
      0,
    )
    return (
      <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-primary text-center">Workout complete</h1>
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
                    <td className="py-2 text-right">{e?.reps || '—'}</td>
                    <td className="py-2 text-right">{e?.weight || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-4 text-right font-semibold">Total volume: {totalVolume}</p>
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

  const saveImage = () => {
    const trimmed = urlDraft.trim()
    if (trimmed && onSetImage) {
      onSetImage(exercise.id, trimmed)
      setUrlDraft('')
      setImageError(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <p className="text-sm text-gray-500">
          {day} · Exercise {index + 1} of {exercises.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-primary">{exercise.name}</h1>

        {images[exercise.id] && !imageError ? (
          <img
            src={images[exercise.id]}
            alt={exercise.name}
            className="mt-4 w-full h-48 object-cover rounded"
            onError={() => {
              setImageError(true)
              setUrlDraft(images[exercise.id] || '')
            }}
          />
        ) : (
          <div className="mt-4 rounded border-2 border-dashed border-gray-300 p-4 text-center">
            <a
              href={imageSearchUrl(exercise.name)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-gray-500 hover:text-primary"
            >
              No image — click to search
            </a>
            <div className="mt-3 flex gap-2">
              <input
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveImage()}
                placeholder="Paste image URL…"
                aria-label="Image URL"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={saveImage}
                className="px-3 py-2 bg-primary text-white rounded text-sm font-semibold hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Reps</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Weight</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              placeholder="0"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          {index > 0 && (
            <button
              onClick={goBack}
              className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <button
            onClick={saveAndNext}
            className="flex-1 bg-primary text-white rounded py-2 font-semibold hover:opacity-90"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </main>
  )
}
