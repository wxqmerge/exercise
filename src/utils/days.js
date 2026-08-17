export const buildDays = (dayMode, dayCount) => {
  if (dayMode === 'numbered') {
    return Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`);
  }
  return ['Odd', 'Even'];
};

export const workoutsFor = (typeId, mode, count, getProgram) => {
  const program = getProgram(typeId);
  if (mode === 'numbered') {
    return Array.from({ length: count }, (_, i) => ({
      day: `Day ${i + 1}`,
      exercises: program.NUMBERED_WORKOUTS[i + 1] || [],
    }));
  }
  return ['Odd', 'Even'].map(day => ({
    day,
    exercises: program.ODD_EVEN_WORKOUTS[day] || [],
  }));
};
