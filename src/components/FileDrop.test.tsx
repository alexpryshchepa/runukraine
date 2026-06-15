import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileDrop } from './FileDrop';

describe('FileDrop', () => {
  it('reads the chosen file and calls onFile with its text and name', async () => {
    const onFile = vi.fn();
    render(<FileDrop onFile={onFile} label="Choose file" />);
    const input = screen.getByLabelText('Choose file') as HTMLInputElement;
    const file = new File(['<tcx/>'], 'run.tcx', { type: 'application/xml' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onFile).toHaveBeenCalledWith('<tcx/>', 'run.tcx'));
  });
});
