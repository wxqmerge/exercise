// Tracked loader. Your real program lives in exercises.local.js (gitignored)
// and takes precedence when present. The sample below is only a fallback so
// a fresh clone still builds and runs.

const ex = (id, name) => ({ id, name })

const SAMPLE = {
  ODD_EVEN_WORKOUTS: {
    Odd: [ex('sample-a', 'Sample Exercise A'), ex('sample-b', 'Sample Exercise B')],
    Even: [ex('sample-c', 'Sample Exercise C')],
  },
  NUMBERED_WORKOUTS: {
    1: [ex('sample-a', 'Sample Exercise A')],
    2: [ex('sample-b', 'Sample Exercise B')],
    3: [ex('sample-c', 'Sample Exercise C')],
  },
}

const localModule = import.meta.glob('./exercises.local.js', { eager: true })['./exercises.local.js']
const program = localModule ?? SAMPLE

export const ODD_EVEN_WORKOUTS = program.ODD_EVEN_WORKOUTS
export const NUMBERED_WORKOUTS = program.NUMBERED_WORKOUTS

export function getDayWorkout(dayMode, day) {
  if (dayMode === 'numbered') {
    const n = parseInt(day.replace(/\D/g, ''), 10)
    return program.NUMBERED_WORKOUTS[n] || []
  }
  return program.ODD_EVEN_WORKOUTS[day] || []
}
