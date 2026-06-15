import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { LanguageProvider } from './i18n/LanguageProvider';

beforeEach(() => localStorage.clear());

function renderApp() {
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  );
}

describe('App localization', () => {
  it('renders the first step in Ukrainian by default', () => {
    renderApp();
    expect(screen.getByText('1. Файл вашого тренування')).toBeInTheDocument();
  });

  it('switches the interface to English via the language toggle', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /EN/i }));
    expect(screen.getByText('1. Your activity file')).toBeInTheDocument();
  });
});
