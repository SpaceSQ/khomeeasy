import { getRequestConfig } from 'next-intl/server';
import { routing, type AppLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }

  const messages =
    locale === 'en'
      ? (await import('../../messages/en.json')).default
      : (await import('../../messages/de.json')).default;

  return {
    locale,
    messages,
    timeZone: 'Europe/Berlin'
  };
});
