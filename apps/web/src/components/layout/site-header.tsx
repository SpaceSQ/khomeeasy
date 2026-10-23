'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

export function SiteHeader() {
  const t = useTranslations('Header');

  return (
    <header className="border-b border-line">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-3 focus:py-2"
      >
        {t('skip')}
      </a>
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight">
          <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
          <span>{t('brand')}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <nav aria-label={t('nav')} className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/manage" className="underline decoration-ink/30 underline-offset-4">
              {t('manage')}
            </Link>
            <Link href="/help" className="underline decoration-ink/30 underline-offset-4">
              {t('help')}
            </Link>
            <Link href="/settings" className="underline decoration-ink/30 underline-offset-4">
              {t('settings')}
            </Link>
            <Link href="/login" className="underline decoration-ink/30 underline-offset-4">
              {t('login')}
            </Link>
            <Link href="/examples" className="underline decoration-ink/30 underline-offset-4">
              {t('examples')}
            </Link>
            <a href="#evidence" className="underline decoration-ink/30 underline-offset-4">
              {t('evidence')}
            </a>
            <a href="#safety" className="underline decoration-ink/30 underline-offset-4">
              {t('safety')}
            </a>
            <a href="#advisor" className="underline decoration-ink/30 underline-offset-4">
              {t('advisor')}
            </a>
          </nav>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
