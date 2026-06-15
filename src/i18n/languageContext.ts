import { createContext, useContext } from 'react';
import { translate, type TParams } from './i18n';
import type { Lang } from './messages';

export const LANG_STORAGE_KEY = 'runukraine.lang';
export const DEFAULT_LANG: Lang = 'uk';

export type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

/**
 * Default context (no provider) deliberately uses English so components
 * rendered in isolation — e.g. unit tests — get stable English strings.
 */
export const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
});

export function useLang(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Returns a translator bound to the active language. */
export function useT(): (key: string, params?: TParams) => string {
  const { lang } = useContext(LanguageContext);
  return (key, params) => translate(lang, key, params);
}
