import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/ui/App';
import { ErrorBoundary } from '../../src/ui/components/ErrorBoundary';

describe('frontend foundation', () => {
  it('shows an honest preview with no login or fake chore controls', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A calmer home');
    expect(screen.getByText(/Chore setup and scheduling are coming next/)).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
  it('navigates locally and moves focus to the new heading', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await userEvent.click(screen.getByRole('link', { name: /See how it works/ }));
    const heading = screen.getByRole('heading', { level: 1, name: 'Your home, at your pace.' });
    expect(heading).toHaveFocus();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(document.title).toBe('Our Home · About local mode'));
  });
  it('recovers from an unknown route', async () => {
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'This page isn’t here.' })).toBeVisible();
    await userEvent.click(screen.getByRole('link', { name: 'Back to home' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A calmer home');
  });
  it('provides a recovery screen when a component fails', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Broken(): never { throw new Error('test component failure'); }
    try {
      render(<ErrorBoundary><Broken /></ErrorBoundary>);
      expect(screen.getByRole('heading', { name: 'Something didn’t load.' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();
    } finally { log.mockRestore(); }
  });
});
