import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoutePicker } from './RoutePicker';
import type { Route } from '../types';

const routes: Route[] = [
  { name: 'Kyiv 10K', points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }], cumulative: [0, 1000], length: 10000 },
];

describe('RoutePicker', () => {
  it('lists routes with their distance and fires onSelect', () => {
    const onSelect = vi.fn();
    render(<RoutePicker routes={routes} selected={null} onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Kyiv 10K/ });
    expect(button).toHaveTextContent('10.00 km');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(routes[0]);
  });
  it('shows a hint when there are no routes', () => {
    render(<RoutePicker routes={[]} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/no routes available/i)).toBeInTheDocument();
  });
});
