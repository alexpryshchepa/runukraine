import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from './LanguageProvider';
import { useT, LANG_STORAGE_KEY } from './languageContext';
import { LanguageToggle } from './LanguageToggle';

function Probe() {
  const t = useT();
  return <p>{t('title')}</p>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('useT without a provider', () => {
  it('falls back to English', () => {
    render(<Probe />);
    expect(screen.getByText(/track merger/)).toBeInTheDocument();
  });
});

describe('LanguageProvider', () => {
  it('defaults to Ukrainian and syncs the document language', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText(/об'єднувач/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('uk');
  });

  it('restores a persisted language choice', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText(/track merger/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('LanguageToggle', () => {
  it('switches the active language and persists the choice', () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
        <Probe />
      </LanguageProvider>,
    );
    // starts Ukrainian
    expect(screen.getByText(/об'єднувач/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /EN/i }));

    expect(screen.getByText(/track merger/)).toBeInTheDocument();
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
