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

  it('shows the image when one is available for the exercise', async () => {
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    globalThis.__TEST_MOCK_DATA__.images = { [workout[0].id]: '/api/images/test.jpg' };
    render(<App />);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    const img = screen.getByAltText(workout[0].name);
    expect(img).toHaveAttribute('src', '/api/images/test.jpg');
  });

  it('shows the exercise description when present', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    expect(screen.getByText(workout[0].description)).toBeInTheDocument();
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

  it('rejects a link without an image extension', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: 'https://example.com/page.html' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/not an image link/i)).toBeInTheDocument();
    expect(screen.queryByAltText(workout[0].name)).not.toBeInTheDocument();
  });

  it('removes a saved image', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: 'https://example.com/a.gif' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByAltText(workout[0].name);
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(await screen.findByRole('link', { name: /no image/i })).toBeInTheDocument();
  });

  it('falls back to the paste box when the image fails to load', async () => {
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    globalThis.__TEST_MOCK_DATA__.images = { [workout[0].id]: 'https://example.com/broken.jpg' };
    render(<App />);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.error(screen.getByAltText(workout[0].name));
    const input = screen.getByLabelText('Image URL');
    expect(input).toHaveValue('https://example.com/broken.jpg');
  });

  it('downloads and saves the image to the app', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: 'https://example.com/squat.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const img = await screen.findByAltText(workout[0].name);
    expect(img).toHaveAttribute('src', `/api/images/${workout[0].id}.jpg`);
  });

  it('imports a local image file', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    const file = new File(['fakeimagebytes'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Import image'), { target: { files: [file] } });
    const img = await screen.findByAltText(workout[0].name);
    expect(img).toHaveAttribute('src', `/api/images/${workout[0].id}.jpg`);
  });

  it('falls back to saving the link when the download fails', async () => {
    globalThis.__TEST_MOCK_DATA__.imagesSaveResult = { ok: false };
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: 'https://example.com/squat.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/saved link only/i)).toBeInTheDocument();
    expect(screen.getByAltText(workout[0].name)).toHaveAttribute('src', 'https://example.com/squat.jpg');
  });

  it('zooms the image to full screen on click', async () => {
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    globalThis.__TEST_MOCK_DATA__.images = { [workout[0].id]: '/api/images/test.jpg' };
    render(<App />);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.click(screen.getByAltText(workout[0].name));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves to the next exercise when Next is clicked', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Set 1 reps'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(`${day} · Exercise 2 of ${workout.length}`)).toBeInTheDocument();
  });

  it('shows a summary with saved reps and weight after finishing', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    for (let i = 0; i < workout.length; i++) {
      fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: i === workout.length - 1 ? 'Finish' : 'Next' }));
    }
    expect(screen.getByText('Workout complete')).toBeInTheDocument();
    expect(screen.getAllByText('10 / 10 / 10').length).toBe(workout.length);
    expect(screen.getAllByText('50').length).toBe(workout.length);
    expect(screen.getByText(`Total volume: ${workout.length * 500}`)).toBeInTheDocument();
  });
});
