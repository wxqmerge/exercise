import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App.jsx';
import { getDayWorkout } from '../data/exercises';
import { getDayForDate } from '../utils/day';

const CONFIG = { dayMode: 'numbered', days: ['Day 1', 'Day 2', 'Day 3'] };

describe('App', () => {
  it('starts directly on the workout for the current Julian day', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    expect(await screen.findByText(`${day} · Exercise 1 of ${workout.length}`)).toBeInTheDocument();
  });

  it('offers an image search when the exercise has no image', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    const link = screen.getByRole('link', { name: /no image/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('tbm=isch'));
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(workout[0].name)));
  });

  it('moves to the next exercise when Next is clicked', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(`${day} · Exercise 2 of ${workout.length}`)).toBeInTheDocument();
  });

  it('shows a summary with saved reps and weight after finishing', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    for (let i = 0; i < workout.length; i++) {
      fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: i === workout.length - 1 ? 'Finish' : 'Next' }));
    }
    expect(screen.getByText('Workout complete')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBe(workout.length);
    expect(screen.getByText(`Total volume: ${workout.length * 500}`)).toBeInTheDocument();
  });
});
