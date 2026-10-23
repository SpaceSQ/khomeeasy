import { getTranslations } from 'next-intl/server';

export async function AiActDisclosure() {
  const t = await getTranslations('AiAct');

  return (
    <aside
      id="advisor"
      data-ai-generated="true"
      role="note"
      aria-label={t('label')}
      className="rounded-lg border border-ink bg-ink px-6 py-5 text-paper"
    >
      <p className="flex items-center gap-3 font-semibold">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center border border-paper text-xs font-bold tracking-wide"
        >
          {t('mark')}
        </span>
        <span>{t('heading')}</span>
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6">{t('body')}</p>
    </aside>
  );
}
