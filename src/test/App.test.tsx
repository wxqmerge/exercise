import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App.jsx';
import { ODD_EVEN_WORKOUTS, NUMBERED_WORKOUTS } from '../data/exercises';

describe('App', () => {
  it('shows day selection from config', async () => {
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Odd' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Even' })).toBeInTheDocument();
  });

  it('starts the odd workout when a day is selected', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Odd' }));
    const odd = ODD_EVEN_WORKOUTS.Odd;
    expect(screen.getByText(odd[0].name)).toBeInTheDocument();
    expect(screen.getByText(`Odd · Exercise 1 of ${odd.length}`)).toBeInTheDocument();
  });

  it('offers an image search when the exercise has no image', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Odd' }));
    const first = ODD_EVEN_WORKOUTS.Odd[0];
    const link = screen.getByRole('link', { name: /no image/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('tbm=isch'));
    expect(link).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(first.name)));
  });

  it('moves to the next exercise when Next is clicked', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Odd' }));
    const odd = ODD_EVEN_WORKOUTS.Odd;
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(odd[1].name)).toBeInTheDocument();
    expect(screen.getByText(`Odd · Exercise 2 of ${odd.length}`)).toBeInTheDocument();
  });

  it('shows a summary with saved reps and weight after finishing', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Odd' }));
    const odd = ODD_EVEN_WORKOUTS.Odd;
    for (let i = 0; i < odd.length; i++) {
      fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '50' } });
      fireEvent.click(screen.getByRole('button', { name: i === odd.length - 1 ? 'Finish' : 'Next' }));
    }
    expect(screen.getByText('Workout complete')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBe(odd.length);
    expect(screen.getByText(`Total volume: ${odd.length * 500}`)).toBeInTheDocument();
  });

  it('shows numbered days when config uses numbered mode', async () => {
    globalThis.__TEST_MOCK_DATA__.config = { dayMode: 'numbered', days: ['Day 1', 'Day 2', 'Day 3'] };
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Day 1' }));
    expect(screen.getByText(NUMBERED_WORKOUTS[1][0].name)).toBeInTheDocument();
    expect(screen.getByText(`Day 1 · Exercise 1 of ${NUMBERED_WORKOUTS[1].length}`)).toBeInTheDocument();
  });
});
