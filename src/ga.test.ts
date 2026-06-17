import { describe, it, expect } from 'vitest';
// Vite serves the raw file contents as a string (typed by vite/client's `*?raw`
// module declaration), so this stays type-checked without pulling in node types.
import html from '../index.html?raw';

describe('Google Analytics', () => {
  it('embeds the GA4 gtag snippet with the measurement ID in index.html', () => {
    expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-8BWSJYMF3K');
    expect(html).toContain("gtag('config', 'G-8BWSJYMF3K')");
  });
});
