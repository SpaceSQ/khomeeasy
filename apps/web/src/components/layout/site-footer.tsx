import { getTranslations } from 'next-intl/server';

export async function SiteFooter({ databaseReady }: { databaseReady: boolean }) {
  const t = await getTranslations('Home');
  const safety = await getTranslations('Safety');

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-page flex-col gap-3 px-6 py-8 text-sm leading-6 text-muted">
        <p className="flex items-center gap-2 font-serif text-base font-semibold text-ink">
          <img src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
          {t('eyebrow')}
        </p>
        <p lang="en">{safety('trademark')}</p>
        <p>{safety('disclaimerEn')}</p>
        <p>{databaseReady ? t('dbReady') : t('dbAwaitingKey')}</p>
      </div>
    </footer>
  );
}
