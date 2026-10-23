import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ManageWorkspace } from '@/components/account/manage-workspace';
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
  const t = await getTranslations({ locale, namespace: 'Login' });
  return { title: t('manageTitle'), description: t('manageLede') };
}

export default async function ManagePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const supabase = await getSupabaseServerClient();

  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto max-w-page px-6 py-16">
        <ManageWorkspace />
      </main>
      <SiteFooter databaseReady={supabase !== null} />
    </>
  );
}
