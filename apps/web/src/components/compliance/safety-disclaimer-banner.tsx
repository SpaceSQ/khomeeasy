import { getTranslations } from 'next-intl/server';

export async function SafetyDisclaimerBanner() {
  const t = await getTranslations('Safety');

  return (
    <section
      id="safety"
      aria-labelledby="safety-heading"
      className="rounded-lg border border-ink/15 bg-white p-6 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink text-sm font-bold"
        >
          §
        </span>
        <div className="space-y-3 text-base leading-7">
          <h2 id="safety-heading" className="font-serif text-2xl font-semibold tracking-tight">
            {t('heading')}
          </h2>
          <p>{t('nav')}</p>
          <p>{t('partP')}</p>
          <p>{t('boundary')}</p>
          <p>{t('disclaimerDe')}</p>
          <p lang="en">{t('disclaimerEn')}</p>
          <p lang="en" className="text-sm text-muted">
            {t('trademark')}
          </p>
        </div>
      </div>
    </section>
  );
}
