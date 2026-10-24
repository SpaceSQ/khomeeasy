'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { pairPayload, type AccountRole } from '@/lib/login-pair';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function LoginPanel() {
  const t = useTranslations('Login');
  const [role, setRole] = useState<AccountRole>('homeowner');
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'pending' | 'ready' | 'expired' | 'error'>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function start() {
      setStatus('loading');
      setImage(null);
      setEmail(null);
      const created = await fetch('/api/login-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!created.ok) {
        if (!stopped) {
          setStatus('error');
        }
        return;
      }
      const payload = (await created.json()) as { id: string; secret: string; role: AccountRole };
      const dataUrl = await QRCode.toDataURL(pairPayload(payload.role, payload.id, payload.secret), {
        margin: 1,
        width: 280
      });
      if (stopped) {
        return;
      }
      setImage(dataUrl);
      setStatus('pending');
      timer = setInterval(async () => {
        const response = await fetch('/api/login-challenges/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: payload.id, secret: payload.secret })
        });
        const body = (await response.json().catch(() => null)) as { status?: string; tokenHash?: string; error?: string } | null;
        if (stopped) {
          return;
        }
        if (!response.ok || !body || body.error) {
          setStatus('error');
          if (timer) {
            clearInterval(timer);
          }
          return;
        }
        if (body.status === 'expired' || body.status === 'consumed') {
          setStatus('expired');
          if (timer) {
            clearInterval(timer);
          }
        }
        if (body.status === 'ready' && body.tokenHash) {
          if (timer) {
            clearInterval(timer);
          }
          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            setStatus('error');
            return;
          }
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: body.tokenHash,
            type: 'magiclink'
          });
          if (error) {
            setStatus('error');
            return;
          }
          setEmail(data.user?.email ?? null);
          setStatus('ready');
        }
      }, 2000);
    }

    start().catch(() => {
      if (!stopped) {
        setStatus('error');
      }
    });

    return () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [role]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h2 className="font-serif text-2xl font-semibold">{t('scanTitle')}</h2>
      <div className="flex flex-col gap-3">
        {(['homeowner', 'installer'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={
              role === item
                ? 'min-h-14 rounded-lg border border-ink bg-ink px-4 py-3 text-left text-base font-semibold text-paper'
                : 'min-h-14 rounded-lg border border-ink px-4 py-3 text-left text-base font-semibold'
            }
            onClick={() => setRole(item)}
            aria-pressed={role === item}
          >
            {item === 'homeowner' ? t('owner') : t('installer')}
          </button>
        ))}
      </div>
      <p className="leading-7 text-muted">{role === 'homeowner' ? t('ownerHelp') : t('installerHelp')}</p>
      {image ? (
        <img src={image} alt={t('qrAlt')} width={280} height={280} className="h-auto w-[280px] border border-line bg-white p-3" />
      ) : null}
      <p className="font-semibold" role="status">
        {t(status)}
      </p>
      {email ? (
        <p className="leading-7">
          {t('signedIn', { email })}{' '}
          <Link href="/manage" className="font-semibold underline decoration-ink/30 underline-offset-4">
            {t('manage')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
