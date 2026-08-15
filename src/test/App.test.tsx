import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App.jsx';
import { getDayWorkout } from '../data/exercises';
import { getDayForDate } from '../utils/day';

const CONFIG = { dayMode: 'numbered', days: ['Day 1', 'Day 2', 'Day 3'] };

describe('App', () => {
  it('shows the key gate when no key is stored', async () => {
    localStorage.removeItem('exercise-key');
    render(<App />);
    expect(await screen.findByText(/enter your key to continue/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Key')).toBeInTheDocument();
  });

  it('uses the key from the URL path', async () => {
    const prevLocation = window.location;
    window.location = { ...prevLocation, pathname: '/my-url-key/' };
    localStorage.removeItem('exercise-key');
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    expect(await screen.findByText(`${day} · Exercise 1 of ${workout.length}`)).toBeInTheDocument();
    expect(localStorage.getItem('exercise-key')).toBe('my-url-key');
    window.location = prevLocation;
  });

  it('loads without a key when the server does not require one', async () => {
    globalThis.__TEST_MOCK_DATA__.keyRequired = false;
    localStorage.removeItem('exercise-key');
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    expect(await screen.findByText(`${day} · Exercise 1 of ${workout.length}`)).toBeInTheDocument();
    expect(screen.queryByText(/enter your key to continue/i)).not.toBeInTheDocument();
  });

  it('unlocks the app after entering the key', async () => {
    localStorage.removeItem('exercise-key');
    render(<App />);
    await screen.findByText(/enter your key to continue/i);
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'my-key' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    expect(await screen.findByText(`${day} · Exercise 1 of ${workout.length}`)).toBeInTheDocument();
  });

  it('offers to change the key when the server rejects it', async () => {
    globalThis.__TEST_MOCK_DATA__.configStatus = 401;
    render(<App />);
    expect(await screen.findByText(/invalid key/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change key' }));
    expect(await screen.findByText(/enter your key to continue/i)).toBeInTheDocument();
  });

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
    expect(link).toHaveAttribute('href', expect.stringContaining('tbs=iftype:animated'));
    expect(link).toHaveAttribute('href', expect.stringContaining('exercise%20gif'));
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

  it('exports a backup file', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.some(c => c[0] === '/api/export')).toBe(true);
    await vi.waitFor(() =>
      expect((URL.createObjectURL as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(1),
    );
  });

  it('imports a backup file', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    await screen.findByText(/Exercise 1 of/);
    const backup = {
      version: 1,
      images: { 'test-exercise': { filename: 'test-exercise.jpg', mimeType: 'image/jpeg', data: 'aGVsbG8=' } },
    };
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import backup'), { target: { files: [file] } });
    expect(await screen.findByText(/imported 1 image/i)).toBeInTheDocument();
  });

  it('goes back to the previous exercise with the left arrow', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(`${day} · Exercise 2 of ${workout.length}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText(`${day} · Exercise 1 of ${workout.length}`)).toBeInTheDocument();
  });

  it('switches the workout day with the Day pulldown', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    const otherDay = CONFIG.days.find(d => d !== day);
    const otherWorkout = getDayWorkout(CONFIG.dayMode, otherDay);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: otherDay } });
    expect(await screen.findByText(`${otherDay} · Exercise 1 of ${otherWorkout.length}`)).toBeInTheDocument();
  });

  it('shows the replacement exercise when a swap is configured', async () => {
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    const [original, replacement] = workout;
    globalThis.__TEST_MOCK_DATA__.config = {
      dayMode: 'numbered',
      dayCount: 3,
      days: CONFIG.days,
      exerciseSwaps: { [day]: { [original.id]: replacement.id } },
    };
    render(<App />);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    expect(screen.getByText(replacement.name)).toBeInTheDocument();
    expect(screen.queryByText(original.name)).not.toBeInTheDocument();
  });

  it('keeps each day\'s entries separate', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const otherDay = CONFIG.days.find(d => d !== day);
    const otherWorkout = getDayWorkout(CONFIG.dayMode, otherDay);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: otherDay } });
    await screen.findByText(`${otherDay} · Exercise 1 of ${otherWorkout.length}`);
    const stored = JSON.parse(localStorage.getItem('exercise-entries'));
    expect(stored[day][workout[0].id].weights[0]).toBe('50');
    expect(stored[otherDay]).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: day } });
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    const storedAgain = JSON.parse(localStorage.getItem('exercise-entries'));
    expect(storedAgain[day][workout[0].id].weights[0]).toBe('50');
  });

  it('can switch day from the summary screen', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    for (let i = 0; i < workout.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: i === workout.length - 1 ? 'Finish' : 'Next' }));
    }
    expect(screen.getByText('Workout complete')).toBeInTheDocument();
    const otherDay = CONFIG.days.find(d => d !== day);
    const otherWorkout = getDayWorkout(CONFIG.dayMode, otherDay);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: otherDay } });
    expect(await screen.findByText(`${otherDay} · Exercise 1 of ${otherWorkout.length}`)).toBeInTheDocument();
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

  it('downloads the workout as a .tab file', async () => {
    render(<App />);
    const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
    const workout = getDayWorkout(CONFIG.dayMode, day);
    await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
    fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await vi.waitFor(() =>
      expect((URL.createObjectURL as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(1),
    );
    const text = await ((URL.createObjectURL as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as Blob).text();
    expect(text.split('\n')[0]).toBe('Day\tExercise\tSet 1\tSet 2\tSet 3');
    expect(text).toContain(`${day}\t${workout[0].name}\t50/10\t0/10\t0/10`);
  });

  describe('Settings', () => {
    const openSettings = async () => {
      render(<App />);
      const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
      const workout = getDayWorkout(CONFIG.dayMode, day);
      await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByText('All workouts');
    };

    it('opens the settings page from the workout screen', async () => {
      await openSettings();
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });

    it('lists all numbered workouts grouped by day', async () => {
      await openSettings();
      expect(screen.getByText(/Day 1/)).toBeInTheDocument();
      expect(screen.getByText(/Day 2/)).toBeInTheDocument();
      expect(screen.getByText(/Day 3/)).toBeInTheDocument();
      expect(screen.getAllByText('Goblet Squat').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Suitcase Carry').length).toBeGreaterThan(0);
    });

    it('shows 0/0/0/0/0/0 for exercises with no saved entry', async () => {
      await openSettings();
      const total = 5 + 5 + 5;
      expect(screen.getAllByText('0/0/0/0/0/0').length).toBe(total);
    });

    it('shows the odd/even workouts when that mode is selected', async () => {
      await openSettings();
      fireEvent.change(screen.getByLabelText('Day mode'), { target: { value: 'odd-even' } });
      expect(screen.getByRole('heading', { name: /Odd/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Even/ })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Day 1/ })).not.toBeInTheDocument();
    });

    it('changes how many day sections are listed', async () => {
      await openSettings();
      fireEvent.change(screen.getByLabelText('Day count'), { target: { value: '2' } });
      expect(screen.getByText(/Day 1/)).toBeInTheDocument();
      expect(screen.getByText(/Day 2/)).toBeInTheDocument();
      expect(screen.queryByText(/Day 3/)).not.toBeInTheDocument();
    });

    it('shows entries saved under a different day for the same exercise', async () => {
      globalThis.__TEST_MOCK_DATA__.config = { dayMode: 'odd-even', dayCount: 3, days: ['Odd', 'Even'] };
      render(<App />);
      const day = getDayForDate(new Date(), 'odd-even', ['Odd', 'Even']);
      const workout = getDayWorkout('odd-even', day);
      await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
      fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByText('All workouts');
      fireEvent.change(screen.getByLabelText('Day mode'), { target: { value: 'numbered' } });
      expect(screen.getByText('50/10/0/10/0/10')).toBeInTheDocument();
    });

    it('shows the last saved weight/rep for each exercise', async () => {
      render(<App />);
      const day = getDayForDate(new Date(), CONFIG.dayMode, CONFIG.days);
      const workout = getDayWorkout(CONFIG.dayMode, day);
      await screen.findByText(`${day} · Exercise 1 of ${workout.length}`);
      fireEvent.change(screen.getByLabelText('Set 1 weight'), { target: { value: '50' } });
      fireEvent.change(screen.getByLabelText('Set 1 reps'), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText('Set 2 weight'), { target: { value: '45' } });
      fireEvent.change(screen.getByLabelText('Set 2 reps'), { target: { value: '12' } });
      fireEvent.change(screen.getByLabelText('Set 3 weight'), { target: { value: '40' } });
      fireEvent.change(screen.getByLabelText('Set 3 reps'), { target: { value: '15' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByText('All workouts');
      expect(screen.getByText('50/10/45/12/40/15')).toBeInTheDocument();
    });

    it('saves an exercise replacement and applies it to the workout screen', async () => {
      await openSettings();
      fireEvent.change(screen.getByLabelText('Replace Goblet Squat on Day 1'), { target: { value: 'suitcase-carry' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Saved')).toBeInTheDocument();
      expect(globalThis.__TEST_MOCK_DATA__.config.exerciseSwaps).toEqual({ 'Day 1': { 'goblet-squat': 'suitcase-carry' } });
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.change(screen.getByLabelText('Day'), { target: { value: 'Day 1' } });
      expect(await screen.findByText('Day 1 · Exercise 1 of 5')).toBeInTheDocument();
      expect(screen.getByText('Suitcase Carry')).toBeInTheDocument();
      expect(screen.queryByText('Goblet Squat')).not.toBeInTheDocument();
    });

    it('saves the day mode and applies it to the workout screen', async () => {
      await openSettings();
      fireEvent.change(screen.getByLabelText('Day mode'), { target: { value: 'odd-even' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Saved')).toBeInTheDocument();
      expect(globalThis.__TEST_MOCK_DATA__.config.days).toEqual(['Odd', 'Even']);
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      const options = screen.getAllByRole('option').map(o => o.textContent);
      expect(options).toEqual(['Odd', 'Even']);
    });
  });
});
