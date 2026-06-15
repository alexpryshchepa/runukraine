import { messages, type Lang } from './messages';

export type { Lang };
export { LANGS, messages } from './messages';

export type TParams = Record<string, string | number>;

/** Resolve a dot-path key (e.g. `errors.tcxInvalidXml`) to a string, or undefined. */
function lookup(table: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, table);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translate `key` into `lang`. Falls back to English, then to the key itself
 * when the key is missing everywhere. `params` fill `{name}` placeholders.
 */
export function translate(lang: Lang, key: string, params?: TParams): string {
  const raw = lookup(messages[lang], key) ?? lookup(messages.en, key) ?? key;
  return interpolate(raw, params);
}
