import { useLang, useT } from './languageContext';
import { LANGS, type Lang } from './messages';

const SHORT_LABEL: Record<Lang, string> = { uk: 'UA', en: 'EN' };

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <nav className="lang-toggle" aria-label={t('langLabel')}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {SHORT_LABEL[code]}
        </button>
      ))}
    </nav>
  );
}
