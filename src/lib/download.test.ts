import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadText } from './download';

describe('downloadText', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('creates an anchor with the given filename and clicks it', () => {
    const downloads: string[] = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    };

    downloadText('out.tcx', '<xml/>');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloads).toEqual(['out.tcx']);

    HTMLAnchorElement.prototype.click = original;
  });
});
