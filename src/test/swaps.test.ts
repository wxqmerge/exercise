import { describe, it, expect } from 'vitest';
import { applySwaps, programExercises } from '../utils/swaps';
import { getDayWorkout } from '../data/exercises';

describe('applySwaps', () => {
  it('replaces the exercise only for the given day', () => {
    const workout = getDayWorkout('numbered', 'Day 1');
    const [original, replacement] = workout;
    const swaps = { 'Day 1': { [original.id]: replacement.id } };
    const swapped = applySwaps(workout, 'Day 1', swaps);
    expect(swapped[0].id).toBe(replacement.id);
    expect(swapped.slice(1)).toEqual(workout.slice(1));
    const otherDay = getDayWorkout('numbered', 'Day 2');
    expect(applySwaps(otherDay, 'Day 2', swaps)).toEqual(otherDay);
  });

  it('keeps the original when the replacement id is unknown', () => {
    const workout = getDayWorkout('numbered', 'Day 1');
    const swapped = applySwaps(workout, 'Day 1', { 'Day 1': { [workout[0].id]: 'not-a-real-id' } });
    expect(swapped[0].id).toBe(workout[0].id);
  });

  it('handles missing or empty swaps safely', () => {
    const workout = getDayWorkout('numbered', 'Day 1');
    expect(applySwaps(workout, 'Day 1', undefined)).toBe(workout);
    expect(applySwaps(workout, 'Day 1', null)).toBe(workout);
    expect(applySwaps(workout, 'Day 1', {})).toBe(workout);
  });

  it('lists every program exercise exactly once', () => {
    const all = programExercises();
    expect(new Set(all.map(ex => ex.id)).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(0);
  });
});
