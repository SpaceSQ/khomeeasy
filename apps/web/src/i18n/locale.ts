import type { AppLocale } from './routing';

export function toBcp47(locale: string): 'de-DE' | 'en-GB' {
  return locale === 'en' ? 'en-GB' : 'de-DE';
}

export function isAppLocale(value: string): value is AppLocale {
  return value === 'de' || value === 'en';
}
