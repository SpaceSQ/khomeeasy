'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountPanel } from '@/components/account/account-panel';
import { InterviewPanel } from '@/components/guide/interview-panel';
import { Link, useRouter } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Section = 'guide' | 'account' | 'files';

type ProjectRow = {
  id: string;
  title: string;
  is_pro_unlocked: boolean | null;
};

export function ManageWorkspace() {
  const t = useTranslations('Login');
  const help = useTranslations('Help');
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('guide');
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setAccessToken(session?.access_token ?? null);
      setReady(true);
      if (!session) {
        return;
      }
      supabase
        .from('projects')
        .select('id, title, is_pro_unlocked')
        .eq('owner_id', session.user.id)
        .then(
          (result) => setProjects((result.data as ProjectRow[] | null) ?? []),
          () => setProjects([])
        );
    });
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  }

  if (!ready) {
    return <p>{t('loading')}</p>;
  }

  if (!email || !userId || !accessToken) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h1 className="font-serif text-4xl font-semibold">{t('manageTitle')}</h1>
        <p className="leading-7">{t('needSession')}</p>
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/30 underline-offset-4">
          {t('emailSubmit')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold">{t('manageTitle')}</h1>
          <p className="mt-3 max-w-3xl leading-7">{t('manageLede')}</p>
          <p className="mt-2 text-sm font-semibold">{t('signedIn', { email })}</p>
        </div>
        <button type="button" onClick={() => signOut().catch(() => undefined)} className="min-h-11 rounded-full border border-ink px-4 text-sm font-semibold">
          {t('signOut')}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['guide', 'account', 'files'] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={section === item}
            onClick={() => setSection(item)}
            className={section === item ? 'min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-paper' : 'min-h-11 rounded-full border border-ink px-4 text-sm font-semibold'}
          >
            {item === 'guide' ? t('sectionGuide') : item === 'account' ? t('sectionAccount') : help('topics.pricing')}
          </button>
        ))}
        <Link href="/examples" className="inline-flex min-h-11 items-center rounded-full border border-ink px-4 text-sm font-semibold">
          {help('topics.examples')}
        </Link>
        <Link href="/help" className="inline-flex min-h-11 items-center rounded-full border border-ink px-4 text-sm font-semibold">
          {help('open')}
        </Link>
      </div>
      {section === 'guide' ? <InterviewPanel /> : null}
      {section === 'account' ? <AccountPanel accessToken={accessToken} userId={userId} /> : null}
      {section === 'files' ? <PaidFiles projects={projects} /> : null}
    </div>
  );
}

function PaidFiles({ projects }: { projects: ProjectRow[] }) {
  const t = useTranslations('Login');
  const help = useTranslations('Help');
  const unlocked = projects.filter((project) => project.is_pro_unlocked === true);

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      <h2 className="font-serif text-3xl font-semibold">{help('topics.pricing')}</h2>
      <p className="leading-7">{t('paymentOnlyApple')}</p>
      <p className="leading-7">{help('paymentBody')}</p>
      <ul className="space-y-3">
        {(['pdf', 'quotes', 'handover'] as const).map((row) => (
          <li key={row} className="rounded-lg border border-line bg-white p-4">
            <p className="font-semibold">{help(`ownerRows.${row}`)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{unlocked.length > 0 ? unlocked.map((project) => project.title).join(', ') : help('cellNo')}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
