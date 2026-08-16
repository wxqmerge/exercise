import { describe, it, expect } from 'vitest';
import { applySwaps, programExercises } from '../utils/swaps';
import { getDayWorkout } from '../data/exercises';

describe('applySwaps', () => {
  it('replaces the exercise only for the given day', () => {
    const workout = getDayWorkout('dumbbells', 'numbered', 'Day 1');
    const [original, replacement] = workout;
    const swaps = { 'Day 1': { [original.id]: replacement.id } };
    const swapped = applySwaps(workout, 'Day 1', swaps, 'dumbbells');
    expect(swapped[0].id).toBe(replacement.id);
    expect(swapped[0].originalId).toBe(original.id);
    expect(swapped.slice(1).map(e => e.id)).toEqual(workout.slice(1).map(e => e.id));
    const otherDay = getDayWorkout('dumbbells', 'numbered', 'Day 2');
    expect(applySwaps(otherDay, 'Day 2', swaps, 'dumbbells').map(e => e.id)).toEqual(otherDay.map(e => e.id));
  });

  it('keeps the original when the replacement id is unknown', () => {
    const workout = getDayWorkout('dumbbells', 'numbered', 'Day 1');
    const swapped = applySwaps(workout, 'Day 1', { 'Day 1': { [workout[0].id]: 'not-a-real-id' } }, 'dumbbells');
    expect(swapped[0].id).toBe(workout[0].id);
  });

  it('handles missing or empty swaps safely', () => {
    const workout = getDayWorkout('dumbbells', 'numbered', 'Day 1');
    const noSwap = applySwaps(workout, 'Day 1', undefined, 'dumbbells');
    expect(noSwap.map(e => e.id)).toEqual(workout.map(e => e.id));
    expect(noSwap.map(e => e.originalId)).toEqual(workout.map(e => e.id));
    const nullSwap = applySwaps(workout, 'Day 1', null, 'dumbbells');
    expect(nullSwap.map(e => e.id)).toEqual(workout.map(e => e.id));
    const emptySwap = applySwaps(workout, 'Day 1', {}, 'dumbbells');
    expect(emptySwap.map(e => e.id)).toEqual(workout.map(e => e.id));
  });

  it('lists every program exercise exactly once', () => {
    const all = programExercises('dumbbells');
    expect(new Set(all.map(ex => ex.id)).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(0);
  });
});
