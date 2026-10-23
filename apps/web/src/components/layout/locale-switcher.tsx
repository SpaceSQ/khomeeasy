'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const locales = [
  { id: 'de', hrefLang: 'de-DE', labelKey: 'de' },
  { id: 'en', hrefLang: 'en-GB', labelKey: 'en' }
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('LocaleSwitcher');

  return (
    <nav aria-label={t('label')} className="flex items-center gap-1">
      {locales.map((item) => {
        const current = locale === item.id;
        return (
          <Link
            key={item.id}
            href={pathname}
            locale={item.id}
            hrefLang={item.hrefLang}
            aria-current={current ? 'page' : undefined}
            className={
              current
                ? 'rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper'
                : 'rounded-full px-3 py-1 text-sm font-semibold text-ink underline decoration-ink/40 underline-offset-4'
            }
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
