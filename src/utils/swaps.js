import { ODD_EVEN_WORKOUTS, NUMBERED_WORKOUTS } from '../data/exercises'

export const programExercises = () => {
  const seen = new Map()
  for (const list of [...Object.values(ODD_EVEN_WORKOUTS), ...Object.values(NUMBERED_WORKOUTS)]) {
    for (const ex of list) seen.set(ex.id, ex)
  }
  return [...seen.values()]
}

export const applySwaps = (exercises, day, swaps) => {
  const daySwaps = swaps && typeof swaps === 'object' ? swaps[day] : undefined
  if (!daySwaps) return exercises
  const byId = new Map(programExercises().map(ex => [ex.id, ex]))
  return exercises.map(ex => byId.get(daySwaps[ex.id]) || ex)
}
