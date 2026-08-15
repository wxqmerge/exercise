import { describe, it, expect } from 'vitest';
import { julianDate, getDayForDate } from '../utils/day';

describe('julianDate', () => {
  it('returns 1 for Jan 1', () => {
    expect(julianDate(new Date(2026, 0, 1))).toBe(1);
  });

  it('counts to 365 in a common year', () => {
    expect(julianDate(new Date(2026, 11, 31))).toBe(365);
  });

  it('counts to 366 in a leap year', () => {
    expect(julianDate(new Date(2024, 11, 31))).toBe(366);
  });
});

describe('getDayForDate', () => {
  const numbered = ['Day 1', 'Day 2', 'Day 3'];

  it('maps Julian dates divisible by 3 to Day 3', () => {
    expect(getDayForDate(new Date(2026, 0, 3), 'numbered', numbered)).toBe('Day 3');
    expect(getDayForDate(new Date(2026, 0, 6), 'numbered', numbered)).toBe('Day 3');
    expect(getDayForDate(new Date(2026, 5, 17), 'numbered', numbered)).toBe('Day 3');
  });

  it('cycles Day 1, Day 2, Day 3 by Julian date', () => {
    expect(getDayForDate(new Date(2026, 0, 1), 'numbered', numbered)).toBe('Day 1');
    expect(getDayForDate(new Date(2026, 0, 2), 'numbered', numbered)).toBe('Day 2');
    expect(getDayForDate(new Date(2026, 0, 4), 'numbered', numbered)).toBe('Day 1');
  });

  it('uses odd/even Julian date for odd-even mode', () => {
    expect(getDayForDate(new Date(2026, 0, 1), 'odd-even', ['Odd', 'Even'])).toBe('Odd');
    expect(getDayForDate(new Date(2026, 0, 2), 'odd-even', ['Odd', 'Even'])).toBe('Even');
  });
});
