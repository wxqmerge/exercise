// Tracked loader. Your real programs live in exercises.local.js (gitignored)
// and take precedence when present. The sample below is only a fallback so
// a fresh clone still builds and runs.

const ex = (id, name, description) => ({ id, name, description })

const SAMPLE = {
  dumbbells: {
    name: 'Dumbbells',
    ODD_EVEN_WORKOUTS: {
      Odd: [
        ex('sample-a', 'Sample Exercise A', 'Perform this sample exercise with control and steady breathing.'),
        ex('sample-b', 'Sample Exercise B', 'Perform this sample exercise with control and steady breathing.'),
      ],
      Even: [ex('sample-c', 'Sample Exercise C', 'Perform this sample exercise with control and steady breathing.')],
    },
    NUMBERED_WORKOUTS: {
      1: [ex('sample-a', 'Sample Exercise A', 'Perform this sample exercise with control and steady breathing.')],
      2: [ex('sample-b', 'Sample Exercise B', 'Perform this sample exercise with control and steady breathing.')],
      3: [ex('sample-c', 'Sample Exercise C', 'Perform this sample exercise with control and steady breathing.')],
    },
  },
  hotel: {
    name: 'Hotel',
    ODD_EVEN_WORKOUTS: {},
    NUMBERED_WORKOUTS: {
      1: [ex('sample-a', 'Sample Exercise A', 'Perform this sample exercise with control and steady breathing.')],
      2: [ex('sample-b', 'Sample Exercise B', 'Perform this sample exercise with control and steady breathing.')],
      3: [ex('sample-c', 'Sample Exercise C', 'Perform this sample exercise with control and steady breathing.')],
    },
  },
}

const localModule = import.meta.glob('./exercises.local.js', { eager: true })['./exercises.local.js']
const programs = localModule?.PROGRAMS ?? SAMPLE

export const PROGRAMS = programs
export const DEFAULT_TYPE = Object.keys(programs)[0]

export const getProgram = (typeId) => programs[typeId] || programs[DEFAULT_TYPE]

export const getDayWorkout = (typeId, dayMode, day) => {
  const program = getProgram(typeId)
  if (dayMode === 'numbered') {
    const n = parseInt(day.replace(/\D/g, ''), 10)
    return program.NUMBERED_WORKOUTS[n] || []
  }
  return program.ODD_EVEN_WORKOUTS[day] || []
}
