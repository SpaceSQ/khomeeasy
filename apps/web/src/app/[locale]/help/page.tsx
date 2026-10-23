import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SafetyDisclaimerBanner } from '@/components/compliance/safety-disclaimer-banner';
import { PricingTables } from '@/components/help/pricing-tables';
import { WorkFlow } from '@/components/help/work-flow';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { isAppLocale } from '@/i18n/locale';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const topics = [
  'flow',
  'pricing',
  'guide',
  'examples',
  'fit',
  'rooms',
  'request',
  'account',
  'partners',
  'quotes',
  'handover',
  'work',
  'settings',
  'safety'
] as const;

const proseTopics = topics.filter((topic) => topic !== 'flow' && topic !== 'pricing');

export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = isAppLocale(params.locale) ? params.locale : 'de';
  const t = await getTranslations({ locale, namespace: 'Help' });
  return { title: t('title'), description: t('lede') };
}

export default async function HelpPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Help');
  const safety = await getTranslations('Safety');
  const supabase = await getSupabaseServerClient();

  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto max-w-page px-6 py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8">{t('lede')}</p>
        <nav aria-label={t('tocTitle')} className="mt-8 rounded-lg border-2 border-ink bg-white p-5">
          <h2 className="font-serif text-2xl font-semibold">{t('tocTitle')}</h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {topics.map((topic, index) => (
              <li key={topic}>
                <a
                  href={`#${topic}`}
                  className="inline-flex min-h-11 items-center gap-3 text-base font-semibold underline decoration-ink/30 underline-offset-4"
                >
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  {t(`topics.${topic}`)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="flow" className="scroll-mt-8 mt-14">
          <WorkFlow />
        </section>

        <section id="pricing" className="scroll-mt-8 mt-14">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">{t('topics.pricing')}</h2>
          <div className="mt-8">
            <PricingTables />
          </div>
        </section>

        {proseTopics.map((topic) => (
          <section key={topic} id={topic} className="scroll-mt-8 mt-14 max-w-3xl">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">{t(`topics.${topic}`)}</h2>
            <p className="mt-4 leading-7">{t(`bodies.${topic}`)}</p>
            {topic === 'handover' ? (
              <div className="mt-4 space-y-2 text-sm leading-6 text-muted">
                <p>{safety('disclaimerDe')}</p>
                <p lang="en">{safety('disclaimerEn')}</p>
              </div>
            ) : null}
          </section>
        ))}

        <div className="mt-14">
          <SafetyDisclaimerBanner />
        </div>
      </main>
      <SiteFooter databaseReady={supabase !== null} />
    </>
  );
}
