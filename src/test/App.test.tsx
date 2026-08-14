import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App.jsx';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('exercise-app')).toBeInTheDocument();
  });

  it('loads config from the API', async () => {
    render(<App />);
    expect(await screen.findByText(/Connected to API/)).toBeInTheDocument();
  });
});
