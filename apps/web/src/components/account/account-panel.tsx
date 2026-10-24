'use client';

import { FormEvent, useEffect, useState } from 'react';
import { distanceUnitForCountry, matchInstallersByDistance, type MatchableInstaller } from '@khomeeasy/scoring-engine';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Role = 'homeowner' | 'installer';
type ProfileRow = {
  role: string;
  full_name: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  house_number: string | null;
  address_line: string | null;
  area_sqm: number | null;
  floors: number | null;
  room_count: number | null;
};
type InstallerRow = {
  company_name: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  street_address: string | null;
  house_number: string | null;
};
type DirectoryRow = {
  id: string | null;
  company_name: string | null;
  city: string | null;
  postal_code: string | null;
  knx_official_rank: string | null;
  verified_projects_count: number | null;
  avg_response_hours: number | null;
  latitude: number | null;
  longitude: number | null;
  public_street: string | null;
};
type Country = 'DE' | 'AT' | 'CH' | 'GB';

type Draft = {
  role: Role;
  fullName: string;
  companyName: string;
  city: string;
  postalCode: string;
  countryCode: Country;
  houseNumber: string;
  addressLine: string;
  areaSqm: string;
  floors: string;
  roomCount: string;
};

const emptyDraft: Draft = {
  role: 'homeowner',
  fullName: '',
  companyName: '',
  city: '',
  postalCode: '',
  countryCode: 'DE',
  houseNumber: '',
  addressLine: '',
  areaSqm: '',
  floors: '',
  roomCount: ''
};

function isCountry(value: string): value is Country {
  return value === 'DE' || value === 'AT' || value === 'CH' || value === 'GB';
}

export function AccountPanel({
  accessToken,
  userId,
  onSaved
}: {
  accessToken: string;
  userId: string;
  onSaved?: (role: Role) => void;
}) {
  const t = useTranslations('Account');
  const help = useTranslations('Help');
  const login = useTranslations('Login');
  const locale = useLocale();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [matchText, setMatchText] = useState<string | null>(null);
  const [matches, setMatches] = useState<{ id: string; name: string; place: string; distance: string }[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    supabase
      .from('profiles')
      .select('role, full_name, city, postal_code, country_code, house_number, address_line, area_sqm, floors, room_count')
      .eq('id', userId)
      .maybeSingle()
      .then((result) => {
        const data = result.data as ProfileRow | null;
        if (!data) {
          return;
        }
        const role = data.role === 'installer' ? 'installer' : 'homeowner';
        const country = data.country_code && isCountry(data.country_code) ? data.country_code : 'DE';
        setDraft((current) => ({
          ...current,
          role,
          fullName: data.full_name ?? '',
          city: data.city ?? '',
          postalCode: data.postal_code ?? '',
          countryCode: country,
          houseNumber: data.house_number ?? '',
          addressLine: data.address_line ?? '',
          areaSqm: data.area_sqm == null ? '' : String(data.area_sqm),
          floors: data.floors == null ? '' : String(data.floors),
          roomCount: data.room_count == null ? '' : String(data.room_count)
        }));
        if (role === 'installer') {
          supabase
            .from('installers')
            .select('company_name, city, postal_code, country_code, street_address, house_number')
            .eq('claimed_by_user_id', userId)
            .maybeSingle()
            .then((installerResult) => {
              const installer = installerResult.data as InstallerRow | null;
              if (!installer) {
                return;
              }
              const installerCountry = installer.country_code && isCountry(installer.country_code) ? installer.country_code : country;
              setDraft((current) => ({
                ...current,
                companyName: installer.company_name ?? '',
                city: installer.city ?? current.city,
                postalCode: installer.postal_code ?? current.postalCode,
                countryCode: installerCountry,
                addressLine: installer.street_address ?? current.addressLine,
                houseNumber: installer.house_number ?? current.houseNumber
              }));
            })
            .then(() => undefined, () => undefined);
        }
      })
      .then(() => undefined, () => undefined);
  }, [userId]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setMatchText(null);
    setMatches([]);
    if (!draft.postalCode.trim() || !draft.city.trim() || !draft.addressLine.trim()) {
      setMessage(t('missing'));
      return;
    }
    if (draft.role === 'installer' && (!draft.companyName.trim() || !draft.fullName.trim() || !draft.houseNumber.trim())) {
      setMessage(t('missing'));
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage(t('syncFailed'));
      return;
    }
    setPending(true);
    const numberOrNull = (value: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: draft.role,
        full_name: draft.fullName.trim() || null,
        locale: locale === 'en' ? 'en-GB' : 'de-DE',
        country_code: draft.countryCode,
        postal_code: draft.postalCode.trim(),
        city: draft.city.trim() || null,
        house_number: draft.houseNumber.trim() || null,
        address_line: draft.addressLine.trim() || null,
        area_sqm: numberOrNull(draft.areaSqm),
        floors: numberOrNull(draft.floors),
        room_count: numberOrNull(draft.roomCount)
      } as never)
      .eq('id', userId);
    if (profileError) {
      setPending(false);
      setMessage(t('syncFailed'));
      return;
    }
    if (draft.role === 'installer') {
      const response = await fetch('/api/account/installer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: draft.companyName.trim(),
          city: draft.city.trim(),
          postalCode: draft.postalCode.trim(),
          countryCode: draft.countryCode,
          streetAddress: draft.addressLine.trim(),
          houseNumber: draft.houseNumber.trim()
        })
      });
      setPending(false);
      setMessage(response.ok ? t('saved') : t('syncFailed'));
      if (response.ok) {
        onSaved?.('installer');
      }
      return;
    }
    const geocoded = await fetch('/api/account/geocode', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street: draft.addressLine.trim(),
        city: draft.city.trim(),
        postalCode: draft.postalCode.trim(),
        countryCode: draft.countryCode
      })
    });
    if (!geocoded.ok) {
      setPending(false);
      setMatchText(t('matchNone').replace('{unit}', distanceUnitForCountry(draft.countryCode)));
      setMessage(t('saved'));
      onSaved?.('homeowner');
      return;
    }
    const origin = (await geocoded.json()) as { latitude: number; longitude: number };
    const directory = await supabase
      .from('installer_directory')
      .select('id, company_name, city, postal_code, knx_official_rank, verified_projects_count, avg_response_hours, latitude, longitude, public_street');
    const rows = (directory.data ?? []) as DirectoryRow[];
    const located: MatchableInstaller[] = rows.flatMap((row) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      const rank = row.knx_official_rank;
      if (!row.id || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return [];
      }
      if (rank !== 'Silver' && rank !== 'Gold' && rank !== 'Platinum') {
        return [];
      }
      return [
        {
          id: row.id,
          companyName: row.company_name ?? '',
          city: row.city ?? '',
          postalCode: row.postal_code ?? '',
          knxOfficialRank: rank,
          verifiedProjectsCount: Number(row.verified_projects_count ?? 0),
          avgResponseHours: row.avg_response_hours == null ? null : Number(row.avg_response_hours),
          latitude,
          longitude,
          publicStreet: row.public_street
        }
      ];
    });
    const unit = distanceUnitForCountry(draft.countryCode);
    const result = matchInstallersByDistance(origin, located, unit);
    setMatchText(
      result.radius == null
        ? t('matchNone').replace('{unit}', unit)
        : t('matchRadius').replace('{radius}', String(result.radius)).replace('{unit}', unit)
    );
    setMatches(
      result.matches.map((item) => ({
        id: item.id,
        name: item.companyName,
        place: [item.publicStreet, item.postalCode, item.city].filter(Boolean).join(', '),
        distance: t('matchDistance').replace('{distance}', item.distance.toFixed(1)).replace('{unit}', unit)
      }))
    );
    setPending(false);
    setMessage(t('saved'));
    onSaved?.('homeowner');
  }

  return (
    <form onSubmit={(event) => save(event).catch(() => setMessage(t('syncFailed')))} className="flex max-w-3xl flex-col gap-4">
      <h2 className="font-serif text-3xl font-semibold">{t('title')}</h2>
      <p className="leading-7">{t('help')}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={draft.role === 'homeowner'} className={draft.role === 'homeowner' ? 'min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-paper' : 'min-h-11 rounded-full border border-ink px-4 text-sm font-semibold'} onClick={() => set('role', 'homeowner')}>
          {t('owner')}
        </button>
        <button type="button" aria-pressed={draft.role === 'installer'} className={draft.role === 'installer' ? 'min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-paper' : 'min-h-11 rounded-full border border-ink px-4 text-sm font-semibold'} onClick={() => set('role', 'installer')}>
          {t('installer')}
        </button>
      </div>
      <p className="leading-7 text-muted">{draft.role === 'homeowner' ? t('ownerNote') : t('installerNote')}</p>
      <p className="text-sm font-semibold">{login('paymentOnlyApple')}</p>
      {draft.role === 'installer' ? <Field label={t('companyName')} value={draft.companyName} onChange={(value) => set('companyName', value)} /> : null}
      <Field label={t('fullName')} value={draft.fullName} onChange={(value) => set('fullName', value)} />
      <Field label={t('addressLine')} value={draft.addressLine} onChange={(value) => set('addressLine', value)} />
      <Field label={t('houseNumber')} value={draft.houseNumber} onChange={(value) => set('houseNumber', value)} />
      <Field label={t('city')} value={draft.city} onChange={(value) => set('city', value)} />
      <Field label={t('postalCode')} value={draft.postalCode} onChange={(value) => set('postalCode', value)} />
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {t('country')}
        <select value={draft.countryCode} onChange={(event) => set('countryCode', isCountry(event.target.value) ? event.target.value : 'DE')} className="min-h-11 rounded-lg border border-ink bg-white px-3 text-base font-normal">
          {(['DE', 'AT', 'CH', 'GB'] as const).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      {draft.role === 'homeowner' ? (
        <>
          <Field label={t('area')} value={draft.areaSqm} onChange={(value) => set('areaSqm', value)} />
          <Field label={t('floors')} value={draft.floors} onChange={(value) => set('floors', value)} />
          <Field label={t('rooms')} value={draft.roomCount} onChange={(value) => set('roomCount', value)} />
        </>
      ) : null}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center self-start rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-40">
        {t('save')}
      </button>
      {message ? <p role="status">{message}</p> : null}
      {matchText ? (
        <p>
          {t('matchTitle')}. {matchText}
        </p>
      ) : null}
      <ul className="space-y-2">
        {matches.map((item) => (
          <li key={item.id}>
            {item.name} — {item.place} — {item.distance}
          </li>
        ))}
      </ul>
      <Link href="/help#account" className="inline-flex min-h-11 items-center font-semibold underline decoration-ink/30 underline-offset-4">
        {help('moduleLink')}
      </Link>
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-ink bg-white px-3 text-base font-normal" />
    </label>
  );
}
