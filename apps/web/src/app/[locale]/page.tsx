import type { Metadata } from 'next';
import { canExposeInstallerContact } from '@khomeeasy/shared-types';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AiActDisclosure } from '@/components/compliance/ai-act-disclosure';
import { EvidenceBadge } from '@/components/compliance/evidence-badge';
import { SafetyDisclaimerBanner } from '@/components/compliance/safety-disclaimer-banner';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { landingFacts } from '@/content/landing-facts';
import { isAppLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = isAppLocale(params.locale) ? params.locale : 'de';
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      languages: {
        'de-DE': '/',
        'en-GB': '/en'
      }
    }
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  const t = await getTranslations('Home');
  const help = await getTranslations('Help');
  const facts = await getTranslations('Facts');
  const supabase = await getSupabaseServerClient();
  const hideSilverContact = !canExposeInstallerContact({
    knx_official_rank: 'Silver',
    claimed_by_user_id: null
  });

  const stages = [
    { id: 'guide', status: 'now' },
    { id: 'examples', status: 'now' },
    { id: 'fit', status: 'next' },
    { id: 'rooms', status: 'next' },
    { id: 'request', status: 'next' },
    { id: 'partners', status: 'next' },
    { id: 'quotes', status: 'next' },
    { id: 'handover', status: 'next' },
    { id: 'work', status: 'outside' }
  ] as const;

  return (
    <>
      <SiteHeader />
      <main id="content">
        <section className="border-b border-line">
          <div className="mx-auto max-w-page px-6 py-16 sm:py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass">{t('eyebrow')}</p>
            <h1 className="mt-4 max-w-4xl text-balance font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{t('lede')}</p>
            <div className="mt-8 max-w-2xl rounded-lg border border-ink bg-white p-5">
              <h2 className="font-serif text-2xl font-semibold">{t('accountHelpTitle')}</h2>
              <p className="mt-3 leading-7">{t('accountHelp')}</p>
              <Link href="/login" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-ink/30 underline-offset-4">
                {t('accountHelpCta')}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#path"
                className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper"
              >
                {t('primaryCta')}
              </a>
              <Link
                href="/examples"
                className="inline-flex min-h-11 items-center rounded-full border border-ink px-5 py-3 text-sm font-semibold"
              >
                {t('secondaryCta')}
              </Link>
            </div>
          </div>
        </section>

        <section id="path" className="mx-auto max-w-page px-6 py-16" aria-labelledby="path-heading">
          <h2 id="path-heading" className="max-w-3xl font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('pathTitle')}
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">{t('pathLede')}</p>
          <ol className="mt-10 flex flex-col gap-0">
            {stages.map((stage, index) => (
              <li key={stage.id} className="grid grid-cols-[auto_1fr] gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink text-sm font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {index < stages.length - 1 ? <span className="w-px flex-1 bg-ink/30" aria-hidden="true" /> : null}
                </div>
                <div className="pb-8">
                  <p className="text-sm font-semibold">
                    {stage.status === 'now' ? t('statusNow') : stage.status === 'next' ? t('statusNext') : t('statusOutside')}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl font-semibold">{t(`${stage.id}Title`)}</h3>
                  <p className="mt-3 leading-7">
                    <span className="font-semibold">{t('youLabel')}. </span>
                    {t(`${stage.id}You`)}
                  </p>
                  <p className="mt-2 leading-7 text-muted">
                    <span className="font-semibold text-ink">{t('getLabel')}. </span>
                    {t(`${stage.id}Get`)}
                  </p>
                  {stage.id === 'examples' ? (
                    <Link href="/examples" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-ink/30 underline-offset-4">
                      {t('secondaryCta')}
                    </Link>
                  ) : null}
                  <Link
                    href={`/help#${stage.id}`}
                    className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-ink/30 underline-offset-4"
                  >
                    {help('moduleLink')}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="evidence" className="border-y border-line bg-white/60" aria-labelledby="evidence-heading">
          <div className="mx-auto max-w-page px-6 py-16">
            <h2 id="evidence-heading" className="font-serif text-3xl font-semibold tracking-tight">
              {t('evidenceTitle')}
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-muted">{t('evidenceLede')}</p>
            <Link href="/help#fit" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-ink/30 underline-offset-4">
              {help('moduleLink')}
            </Link>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {landingFacts.map((fact) => (
                <article key={fact.id} className="flex h-full flex-col gap-4 rounded-lg border border-line bg-white p-5">
                  <EvidenceBadge level={fact.level} sourceUrl={fact.sourceUrl} verifiedAt={fact.verifiedAt} />
                  <h3 className="font-serif text-2xl font-semibold leading-snug">{facts(`${fact.id}Title`)}</h3>
                  <p className="leading-7 text-muted">{facts(`${fact.id}Body`)}</p>
                  {fact.id === 'budget' ? <p className="text-sm leading-6 text-muted">{t('budgetNote')}</p> : null}
                  {fact.id === 'ranking' && hideSilverContact ? (
                    <p className="text-sm font-semibold leading-6">{t('silverExample')}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-page px-6 py-16" aria-labelledby="ranking-heading">
          <h2 id="ranking-heading" className="font-serif text-3xl font-semibold tracking-tight">
            {t('rankingTitle')}
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8">{t('rankingBody')}</p>
          <Link href="/help#partners" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-ink/30 underline-offset-4">
            {help('moduleLink')}
          </Link>
        </section>

        <div className="mx-auto flex max-w-page flex-col gap-6 px-6 pb-16">
          <SafetyDisclaimerBanner />
          <AiActDisclosure />
        </div>
      </main>
      <SiteFooter databaseReady={supabase !== null} />
    </>
  );
}
