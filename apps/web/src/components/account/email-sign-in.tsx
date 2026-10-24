'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function EmailSignIn() {
  const t = useTranslations('Login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!email.includes('@') || password.length === 0) {
      setMessage(t('emailMissing'));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage(t('error'));
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setPending(false);
    if (error) {
      const code = (error.code ?? '').toLowerCase();
      const detail = error.message.toLowerCase();
      const unconfirmed = code === 'email_not_confirmed' || detail.includes('email not confirmed');
      setMessage(t(unconfirmed ? 'emailUnconfirmed' : 'emailFailed'));
      return;
    }
    router.push('/manage');
    router.refresh();
  }

  return (
    <form noValidate onSubmit={(event) => submit(event).catch(() => setMessage(t('emailFailed')))} className="flex max-w-xl flex-col gap-4">
      <h2 className="font-serif text-2xl font-semibold">{t('emailTitle')}</h2>
      <p className="leading-7 text-muted">{t('emailLede')}</p>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('email')}
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 rounded-lg border border-ink bg-white px-3 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('password')}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 rounded-lg border border-ink bg-white px-3 text-base font-normal"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center self-start rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-40"
      >
        {t('emailSubmit')}
      </button>
      {message ? (
        <p className="font-semibold" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
