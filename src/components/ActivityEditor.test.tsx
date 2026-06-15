import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityEditor } from './ActivityEditor';

describe('ActivityEditor', () => {
  it('pre-fills both fields and fires change handlers', () => {
    const onNameChange = vi.fn();
    const onStartChange = vi.fn();
    render(
      <ActivityEditor
        name="My Run"
        startInput="2026-06-01T08:00"
        onNameChange={onNameChange}
        onStartChange={onStartChange}
      />,
    );
    const nameInput = screen.getByLabelText('Activity name') as HTMLInputElement;
    const startInput = screen.getByLabelText('Start time') as HTMLInputElement;
    expect(nameInput.value).toBe('My Run');
    expect(startInput.value).toBe('2026-06-01T08:00');

    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(onNameChange).toHaveBeenCalledWith('New Name');

    fireEvent.change(startInput, { target: { value: '2026-06-01T09:30' } });
    expect(onStartChange).toHaveBeenCalledWith('2026-06-01T09:30');
  });
});
