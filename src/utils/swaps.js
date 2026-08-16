import { getProgram } from '../data/exercises'

export const programExercises = (typeId) => {
  const program = getProgram(typeId)
  const seen = new Map()
  for (const list of [...Object.values(program.ODD_EVEN_WORKOUTS), ...Object.values(program.NUMBERED_WORKOUTS)]) {
    for (const ex of list) seen.set(ex.id, ex)
  }
  return [...seen.values()]
}

export const applySwaps = (exercises, day, swaps, typeId) => {
  const daySwaps = swaps && typeof swaps === 'object' ? swaps[day] : undefined
  if (!daySwaps) return exercises.map(ex => ({ ...ex, originalId: ex.id }))
  const byId = new Map(programExercises(typeId).map(ex => [ex.id, ex]))
  return exercises.map(ex => {
    const replId = daySwaps[ex.id]
    const replEx = replId ? byId.get(replId) : null
    const finalEx = replEx || ex
    return { ...finalEx, originalId: ex.id }
  })
}
