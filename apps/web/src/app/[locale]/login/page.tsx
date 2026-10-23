import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { isAppLocale } from '@/i18n/locale';
import { Link } from '@/i18n/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { EmailSignIn } from '@/components/account/email-sign-in';
import { LoginPanel } from './login-panel';

export async function generateMetadata({
  params
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = isAppLocale(params.locale) ? params.locale : 'de';
  const t = await getTranslations({ locale, namespace: 'Login' });
  return { title: t('title'), description: t('lede') };
}

export default async function LoginPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations('Login');
  const help = await getTranslations('Help');
  const supabase = await getSupabaseServerClient();

  return (
    <>
      <SiteHeader />
      <main id="content" className="mx-auto max-w-page px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brass">{t('eyebrow')}</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{t('lede')}</p>
        <div className="mt-8 flex flex-col gap-12">
          <EmailSignIn />
          <LoginPanel />
        </div>
        <p className="mt-8">
          <Link href="/help#account" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/30 underline-offset-4">
            {help('moduleLink')}
          </Link>
        </p>
      </main>
      <SiteFooter databaseReady={supabase !== null} />
    </>
  );
}
