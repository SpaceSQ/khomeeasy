import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PricingTables } from '@/components/help/pricing-tables';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { isAppLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = isAppLocale(params.locale) ? params.locale : 'de';
  const t = await getTranslations({ locale, namespace: 'Settings' });
  const help = await getTranslations({ locale, namespace: 'Help' });
  return { title: t('title'), description: help('lede') };
}

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Settings');
  const help = await getTranslations('Help');
  const supabase = await getSupabaseServerClient();

  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto max-w-page px-6 py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8">{help('settingsLede')}</p>
        <p className="mt-4">
          <Link href="/help#pricing" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/30 underline-offset-4">
            {help('openHelp')}
          </Link>
        </p>
        <div className="mt-10">
          <PricingTables />
        </div>
      </main>
      <SiteFooter databaseReady={supabase !== null} />
    </>
  );
}
