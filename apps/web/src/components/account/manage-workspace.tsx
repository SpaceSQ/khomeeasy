'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountPanel } from '@/components/account/account-panel';
import { ContractorWorkbench } from '@/components/account/contractor-workbench';
import { InterviewPanel } from '@/components/guide/interview-panel';
import { PurchaseReceipts } from '@/components/account/purchase-receipts';
import { Link, useRouter } from '@/i18n/navigation';
import { workspaceForRole, type WorkspaceKind } from '@/lib/workspace';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Section = 'guide' | 'account' | 'files' | 'work';

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
  const [section, setSection] = useState<Section | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceKind | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      setEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setAccessToken(session?.access_token ?? null);
      if (!session) {
        setWorkspace(null);
        setSection(null);
        setReady(true);
        return;
      }
      const profile = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      const kind = profile.error ? 'unknown' : workspaceForRole((profile.data as { role?: string } | null)?.role);
      setWorkspace(kind);
      setSection(kind === 'installer' ? 'work' : kind === 'owner' ? 'guide' : 'account');
      if (kind === 'owner') {
        const result = await supabase
          .from('projects')
          .select('id, title, is_pro_unlocked')
          .eq('owner_id', session.user.id);
        setProjects((result.data as ProjectRow[] | null) ?? []);
      }
      setReady(true);
    }).catch(() => {
      setWorkspace('unknown');
      setSection('account');
      setReady(true);
    });
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    router.push('/login');
    router.refresh();
  }

  if (!ready || (userId && workspace === null)) {
    return <p>{t('manageLoading')}</p>;
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
          <p className="mt-3 max-w-3xl leading-7">{workspace === 'installer' ? t('installerLede') : workspace === 'owner' ? t('manageLede') : t('roleMissing')}</p>
          <p className="mt-2 text-sm font-semibold">{t('signedIn', { email })}</p>
        </div>
        <button type="button" onClick={() => signOut().catch(() => undefined)} className="min-h-11 rounded-full border border-ink px-4 text-sm font-semibold">
          {t('signOut')}
        </button>
      </div>
      {workspace === 'owner' ? (
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
      ) : null}
      {workspace === 'installer' && section === 'work' ? (
        <ContractorWorkbench
          accessToken={accessToken}
          userId={userId}
          email={email}
          onRoleChange={(next) => {
            const kind = workspaceForRole(next);
            setWorkspace(kind);
            setSection(kind === 'installer' ? 'work' : 'guide');
          }}
        />
      ) : null}
      {workspace === 'owner' && section === 'guide' ? <InterviewPanel /> : null}
      {workspace !== 'installer' && section === 'account' ? (
        <AccountPanel
          accessToken={accessToken}
          userId={userId}
          onSaved={(next) => {
            const kind = workspaceForRole(next);
            setWorkspace(kind);
            setSection(kind === 'installer' ? 'work' : 'guide');
          }}
        />
      ) : null}
      {workspace === 'owner' && section === 'files' ? <PaidFiles projects={projects} accessToken={accessToken} /> : null}
    </div>
  );
}

function PaidFiles({ projects, accessToken }: { projects: ProjectRow[]; accessToken: string }) {
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
      <PurchaseReceipts accessToken={accessToken} />
    </section>
  );
}
