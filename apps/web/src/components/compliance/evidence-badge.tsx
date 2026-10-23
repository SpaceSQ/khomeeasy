'use client';

import type { EvidenceLevel } from '@khomeeasy/shared-types';
import { useLocale, useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const levelClassName: Record<EvidenceLevel, string> = {
  E1: 'bg-[#E7EEF6]',
  E2: 'bg-[#F3EDE3]',
  E3: 'bg-[#E7F0E8]',
  E4: 'bg-[#F8EBD9]'
};

function EvidenceShape({ level }: { level: EvidenceLevel }) {
  const common = 'h-4 w-4 shrink-0 fill-current';

  if (level === 'E1') {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden="true">
        <path d="M8 1.25 14.75 8 8 14.75 1.25 8 Z" />
      </svg>
    );
  }

  if (level === 'E2') {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden="true">
        <rect x="2.25" y="2.25" width="11.5" height="11.5" />
      </svg>
    );
  }

  if (level === 'E3') {
    return (
      <svg viewBox="0 0 16 16" className={common} aria-hidden="true">
        <circle cx="8" cy="8" r="6.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className={common} aria-hidden="true">
      <path d="M8 1.8 14.4 14.2 H1.6 Z" />
    </svg>
  );
}

function formatVerifiedAt(value: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = value.split('-').map((part) => Number(part));
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export type EvidenceBadgeProps = {
  level: EvidenceLevel;
  sourceUrl: string;
  verifiedAt: string;
  className?: string;
};

export function EvidenceBadge({ level, sourceUrl, verifiedAt, className }: EvidenceBadgeProps) {
  const t = useTranslations('Evidence');
  const locale = useLocale();
  const label = t(`levels.${level}.label`);
  const href = safeHttpUrl(sourceUrl);
  const verified = formatVerifiedAt(verifiedAt, locale);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex min-h-8 items-center gap-2 rounded-full border border-ink/20 px-3 py-1 text-left text-sm font-semibold text-ink',
            levelClassName[level],
            className
          )}
        >
          <EvidenceShape level={level} />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-muted">{t(`levels.${level}.description`)}</p>
        <p className="mt-3">{t('verified', { date: verified })}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-semibold text-brass underline"
          >
            {t('source')}
          </a>
        ) : (
          <p className="mt-2 break-all">{sourceUrl}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
