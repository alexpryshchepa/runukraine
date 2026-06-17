import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Google Analytics', () => {
  it('embeds the GA4 gtag snippet with the measurement ID in index.html', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-8BWSJYMF3K');
    expect(html).toContain("gtag('config', 'G-8BWSJYMF3K')");
  });
});
