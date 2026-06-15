import { useEffect, useState, type ReactNode } from 'react';
import { translate } from './i18n';
import { LANGS, type Lang } from './messages';
import { DEFAULT_LANG, LANG_STORAGE_KEY, LanguageContext } from './languageContext';

function isLang(value: string | null): value is Lang {
  return value !== null && (LANGS as string[]).includes(value);
}

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode, SSR) — fall back to default
  }
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, 'htmlTitle');
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore persistence failures
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
  );
}
