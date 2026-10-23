import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ExampleGallery } from '@/components/examples/example-gallery';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { isAppLocale } from '@/i18n/locale';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = isAppLocale(params.locale) ? params.locale : 'de';
  const t = await getTranslations({ locale, namespace: 'Examples' });

  return {
    title: t('title'),
    description: t('lede')
  };
}

export default async function ExamplesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const supabase = await getSupabaseServerClient();

  return (
    <>
      <SiteHeader />
      <main id="content">
        <ExampleGallery />
      </main>
      <SiteFooter databaseReady={supabase !== null} />
    </>
  );
}
