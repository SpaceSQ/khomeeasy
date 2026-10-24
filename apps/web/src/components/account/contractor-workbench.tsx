'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AccountPanel } from '@/components/account/account-panel';
import { EvidenceBadge } from '@/components/compliance/evidence-badge';
import { PurchaseReceipts } from '@/components/account/purchase-receipts';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type InstallerFacts = {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  tier: 'free' | 'pro';
};

type QuoteRow = {
  id: string;
  status: string | null;
  submitted_at: string | null;
};

const FREE_YEARLY_CAP = 2;

export function ContractorWorkbench({
  accessToken,
  userId,
  email,
  onRoleChange
}: {
  accessToken: string;
  userId: string;
  email: string;
  onRoleChange?: (role: 'homeowner' | 'installer') => void;
}) {
  const t = useTranslations('Workbench');
  const account = useTranslations('Account');
  const help = useTranslations('Help');
  const [facts, setFacts] = useState<InstallerFacts | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[] | null>(null);
  const [quotesUnreadable, setQuotesUnreadable] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    let cancelled = false;
    fetch('/api/apple/purchases', { headers: { authorization: `Bearer ${accessToken}` } })
      .catch(() => undefined)
      .then(async () => {
        if (cancelled) {
          return;
        }
        const profileResult = await supabase
          .from('profiles')
          .select('full_name, city, postal_code, house_number, address_line')
          .eq('id', userId)
          .maybeSingle();
        const profile = profileResult.data as {
          full_name: string | null;
          city: string | null;
          postal_code: string | null;
          house_number: string | null;
          address_line: string | null;
        } | null;
        const installerResult = await supabase
          .from('installers')
          .select('id, company_name, city, postal_code, street_address, house_number, subscription_tier')
          .eq('claimed_by_user_id', userId)
          .maybeSingle();
        const installer = installerResult.data as {
          id: string;
          company_name: string | null;
          city: string | null;
          postal_code: string | null;
          street_address: string | null;
          house_number: string | null;
          subscription_tier: string | null;
        } | null;
        if (cancelled) {
          return;
        }
        setFacts({
          id: installer?.id ?? '',
          companyName: installer?.company_name ?? '',
          fullName: profile?.full_name ?? '',
          email,
          street: installer?.street_address ?? profile?.address_line ?? '',
          houseNumber: installer?.house_number ?? profile?.house_number ?? '',
          postalCode: installer?.postal_code ?? profile?.postal_code ?? '',
          city: installer?.city ?? profile?.city ?? '',
          tier: installer?.subscription_tier === 'pro' ? 'pro' : 'free'
        });
        if (!installer?.id) {
          setQuotes([]);
          return;
        }
        const quoteResult = await supabase.from('quotes').select('id, status, submitted_at').eq('installer_id', installer.id);
        if (cancelled) {
          return;
        }
        if (quoteResult.error) {
          setQuotesUnreadable(true);
          setQuotes([]);
          return;
        }
        setQuotesUnreadable(false);
        setQuotes((quoteResult.data as QuoteRow[] | null) ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setQuotesUnreadable(true);
          setQuotes([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, email, reload, userId]);

  const year = new Date().getUTCFullYear();
  const counted = (quotes ?? []).filter((quote) => {
    if (quote.status === 'declined') {
      return false;
    }
    if (!quote.submitted_at) {
      return true;
    }
    const submitted = new Date(quote.submitted_at);
    return Number.isFinite(submitted.getTime()) && submitted.getUTCFullYear() === year;
  });

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-3xl font-semibold">{t('title')}</h2>
        <p className="leading-7">{t('lede')}</p>
        <p className="leading-7 text-muted">{help('bodies.work')}</p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="font-serif text-2xl font-semibold">{account('profileTitle')}</h3>
        {facts ? (
          <dl className="mt-4 grid gap-3">
            <Fact label={account('companyName')} value={facts.companyName} />
            <Fact label={account('fullName')} value={facts.fullName} />
            <Fact label={account('email')} value={facts.email} />
            <Fact label={account('addressLine')} value={facts.street} />
            <Fact label={account('houseNumber')} value={facts.houseNumber} />
            <Fact label={account('postalCode')} value={facts.postalCode} />
            <Fact label={account('city')} value={facts.city} />
          </dl>
        ) : (
          <p className="mt-3 leading-7">{t('loading')}</p>
        )}
        <button
          type="button"
          className="mt-4 min-h-11 rounded-full border border-ink px-4 text-sm font-semibold"
          aria-pressed={editing}
          onClick={() => setEditing((current) => !current)}
        >
          {editing ? t('closeEdit') : t('edit')}
        </button>
        {editing ? (
          <div className="mt-6">
            <AccountPanel
              accessToken={accessToken}
              userId={userId}
              onSaved={(role) => {
                setEditing(false);
                setReload((current) => current + 1);
                onRoleChange?.(role);
              }}
            />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-serif text-2xl font-semibold">{t('requestsTitle')}</h3>
        <p className="leading-7">{facts?.tier === 'pro' ? t('capPro') : t('capFree')}</p>
        {facts?.tier === 'free' ? (
          <p className="font-semibold">{t('capCount', { count: String(counted.length), cap: String(FREE_YEARLY_CAP) })}</p>
        ) : null}
        {quotesUnreadable ? <p className="leading-7">{t('requestsUnreadable')}</p> : null}
        {!quotesUnreadable && quotes && quotes.length === 0 ? <p className="leading-7">{t('requestsEmpty')}</p> : null}
        {!quotesUnreadable && quotes && quotes.length > 0 ? (
          <ul className="space-y-3">
            {quotes.map((quote) => (
              <li key={quote.id} className="rounded-lg border border-line bg-white p-4">
                <p className="font-semibold">{t(`status.${statusKey(quote.status)}`)}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{t('replyNote')}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-serif text-2xl font-semibold">{help('topics.pricing')}</h3>
        <p className="leading-7">{help('installerSteps.claim')}</p>
        <p className="leading-7">{help('installerSteps.quota')}</p>
        <p className="leading-7">{help('installerPaid')}</p>
        <p className="leading-7">{help('installerSteps.quotes')}</p>
        <p className="leading-7">{t('rankNote')}</p>
        <p className="leading-7">{help('paymentBody')}</p>
        <EvidenceBadge level="E4" sourceUrl={help('priceSource')} verifiedAt={help('priceVerified')} />
        <PurchaseReceipts accessToken={accessToken} />
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }
  return (
    <div>
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="leading-7">{value}</dd>
    </div>
  );
}

function statusKey(status: string | null): 'invited' | 'viewed' | 'submitted' | 'declined' | 'other' {
  if (status === 'invited' || status === 'viewed' || status === 'submitted' || status === 'declined') {
    return status;
  }
  return 'other';
}
