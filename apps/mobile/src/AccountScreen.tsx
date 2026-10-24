import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  distanceUnitForCountry,
  matchInstallersByDistance,
  type MatchableInstaller
} from '@khomeeasy/scoring-engine';
import { emailConfirmationRequired, writeAccountProfile } from './account-sync';
import { ModuleHelpLink } from './HelpScreen';
import {
  clearPendingEmail,
  loadPendingEmail,
  savePendingEmail,
  storageKeys,
  type AccountRole,
  type LocaleChoice
} from './storage';
import { getMobileSupabase, webOrigin } from './supabase';

type Lookup = (path: string) => string;

type Draft = {
  role: AccountRole;
  email: string;
  fullName: string;
  companyName: string;
  city: string;
  postalCode: string;
  countryCode: string;
  houseNumber: string;
  addressLine: string;
  areaSqm: string;
  floors: string;
  roomCount: string;
};

const emptyDraft = (role: AccountRole): Draft => ({
  role,
  email: '',
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
});

function profileIsComplete(draft: Draft): boolean {
  if (!draft.email.includes('@') || !draft.postalCode.trim() || !draft.city.trim() || !draft.addressLine.trim()) {
    return false;
  }
  if (draft.role === 'installer' && (!draft.companyName.trim() || !draft.fullName.trim() || !draft.houseNumber.trim())) {
    return false;
  }
  return true;
}

function countryCode(value: string): string {
  return value === 'AT' || value === 'CH' || value === 'GB' || value === 'DE' ? value : 'DE';
}

function numberOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function numberText(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? String(value) : '';
}

function profileRows(draft: Draft, t: Lookup): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      rows.push({ label, value: trimmed });
    }
  };
  if (draft.role === 'installer') {
    push(t('Account.companyName'), draft.companyName);
    push(t('Account.fullName'), draft.fullName);
    push(t('Account.email'), draft.email);
    push(t('Account.addressLine'), draft.addressLine);
    push(t('Account.houseNumber'), draft.houseNumber);
    push(t('Account.postalCode'), draft.postalCode);
    push(t('Account.city'), draft.city);
    return rows;
  }
  push(t('Account.name'), draft.fullName);
  push(t('Account.email'), draft.email);
  push(t('Account.addressLine'), draft.addressLine);
  push(t('Account.houseNumber'), draft.houseNumber);
  push(t('Account.city'), draft.city);
  push(t('Account.postalCode'), draft.postalCode);
  push(t('Account.area'), draft.areaSqm);
  push(t('Account.floors'), draft.floors);
  push(t('Account.rooms'), draft.roomCount);
  return rows;
}

async function loadRemoteDraft(supabase: SupabaseClient, userId: string, email: string): Promise<Draft | null> {
  const profile = await supabase
    .from('profiles')
    .select('role, full_name, country_code, postal_code, city, house_number, address_line, area_sqm, floors, room_count')
    .eq('id', userId)
    .maybeSingle();
  if (profile.error || !profile.data) {
    return null;
  }
  const role: AccountRole = profile.data.role === 'installer' ? 'installer' : 'homeowner';
  const next = emptyDraft(role);
  next.email = email;
  next.fullName = typeof profile.data.full_name === 'string' ? profile.data.full_name : '';
  next.countryCode = countryCode(typeof profile.data.country_code === 'string' ? profile.data.country_code : 'DE');
  next.postalCode = typeof profile.data.postal_code === 'string' ? profile.data.postal_code : '';
  next.city = typeof profile.data.city === 'string' ? profile.data.city : '';
  next.houseNumber = typeof profile.data.house_number === 'string' ? profile.data.house_number : '';
  next.addressLine = typeof profile.data.address_line === 'string' ? profile.data.address_line : '';
  next.areaSqm = numberText(profile.data.area_sqm);
  next.floors = numberText(profile.data.floors);
  next.roomCount = numberText(profile.data.room_count);
  if (role === 'installer') {
    const installer = await supabase
      .from('installers')
      .select('company_name, city, postal_code, country_code, street_address, house_number')
      .eq('claimed_by_user_id', userId)
      .maybeSingle();
    if (!installer.error && installer.data) {
      next.companyName = typeof installer.data.company_name === 'string' ? installer.data.company_name : '';
      next.city = typeof installer.data.city === 'string' ? installer.data.city : next.city;
      next.postalCode = typeof installer.data.postal_code === 'string' ? installer.data.postal_code : next.postalCode;
      next.countryCode = countryCode(typeof installer.data.country_code === 'string' ? installer.data.country_code : next.countryCode);
      next.addressLine = typeof installer.data.street_address === 'string' ? installer.data.street_address : next.addressLine;
      next.houseNumber = typeof installer.data.house_number === 'string' ? installer.data.house_number : next.houseNumber;
    }
  }
  return next;
}

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboard
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboard?: 'default' | 'email-address' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboard === 'email-address' ? false : undefined}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function AccountScreen({
  locale,
  initialRole,
  t,
  onOpenHelp
}: {
  locale: LocaleChoice;
  initialRole: AccountRole;
  t: Lookup;
  onOpenHelp: () => void;
}) {
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [draft, setDraft] = useState<Draft>(emptyDraft(initialRole));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [matchText, setMatchText] = useState<string | null>(null);
  const [matches, setMatches] = useState<{ id: string; name: string; place: string; distance: string }[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(storageKeys.account);
      let next = emptyDraft(initialRole);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Draft>;
          if (parsed.role === 'installer' || parsed.role === 'homeowner') {
            next = { ...emptyDraft(parsed.role), ...parsed, role: parsed.role };
          }
        } catch {
          next = emptyDraft(initialRole);
        }
      }
      const pending = await loadPendingEmail();
      const supabase = getMobileSupabase();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (supabase && session?.user) {
        const remote = await loadRemoteDraft(supabase, session.user.id, session.user.email ?? next.email);
        if (remote && profileIsComplete(remote)) {
          next = remote;
        } else if (remote) {
          next = { ...next, ...remote, email: remote.email || next.email, companyName: remote.companyName || next.companyName };
        }
      }
      if (cancelled) {
        return;
      }
      setRole(next.role);
      setDraft(next);
      setSavedDraft(profileIsComplete(next) ? next : null);
      setHasSession(Boolean(session));
      setEditing(!profileIsComplete(next));
      if (!session && profileIsComplete(next)) {
        setMessageKey(pending ? 'Account.confirmEmail' : 'Account.signInToFinish');
      }
      setReady(true);
    })().catch(() => {
      if (!cancelled) {
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialRole]);

  function choose(next: AccountRole) {
    setRole(next);
    setDraft((current) => ({ ...current, role: next }));
    setMessageKey(null);
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function establishSession(supabase: SupabaseClient, email: string, stored: Draft): Promise<Session | null> {
    let response: Response;
    try {
      response = await fetch(`${webOrigin}/api/account/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: stored.role,
          fullName: stored.fullName.trim(),
          companyName: stored.companyName.trim(),
          city: stored.city.trim(),
          postalCode: stored.postalCode.trim(),
          countryCode: countryCode(stored.countryCode),
          streetAddress: stored.addressLine.trim(),
          houseNumber: stored.houseNumber.trim(),
          locale: locale === 'en' ? 'en-GB' : 'de-DE',
          areaSqm: numberOrNull(stored.areaSqm),
          floors: numberOrNull(stored.floors),
          roomCount: numberOrNull(stored.roomCount)
        })
      });
    } catch {
      setMessageKey('Account.syncFailed');
      return null;
    }
    if (response.status === 401) {
      setMessageKey('Account.passwordRejected');
      return null;
    }
    if (!response.ok) {
      setMessageKey('Account.syncFailed');
      return null;
    }
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.data.session) {
      await clearPendingEmail();
      return signIn.data.session;
    }
    if (emailConfirmationRequired(signIn.error)) {
      await savePendingEmail(email);
      setMessageKey('Account.confirmEmail');
      return null;
    }
    setMessageKey('Account.syncFailed');
    return null;
  }

  async function save() {
    setMessageKey(null);
    setMatchText(null);
    const stored = { ...draft, role };
    if (!profileIsComplete(stored)) {
      setMessageKey('Account.missing');
      return;
    }
    const supabase = getMobileSupabase();
    let session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session) {
      if (password.length < 8) {
        setMessageKey('Account.passwordShort');
        return;
      }
      if (password !== confirm) {
        setMessageKey('Account.passwordMismatch');
        return;
      }
    }
    await AsyncStorage.setItem(storageKeys.account, JSON.stringify(stored));
    setSavedDraft(stored);
    if (!supabase || !webOrigin) {
      setHasSession(false);
      setEditing(false);
      setMessageKey('Account.savedLocal');
      return;
    }
    if (!session) {
      session = await establishSession(supabase, stored.email.trim().toLowerCase(), stored);
      if (!session) {
        setHasSession(false);
        setEditing(false);
        return;
      }
    }
    setHasSession(true);
    const wrote = await writeAccountProfile(supabase, session.user.id, {
      role,
      fullName: stored.fullName,
      locale: locale === 'en' ? 'en-GB' : 'de-DE',
      countryCode: countryCode(stored.countryCode),
      postalCode: stored.postalCode,
      city: stored.city,
      houseNumber: stored.houseNumber,
      addressLine: stored.addressLine,
      areaSqm: numberOrNull(stored.areaSqm),
      floors: numberOrNull(stored.floors),
      roomCount: numberOrNull(stored.roomCount)
    });
    if (!wrote) {
      setMessageKey('Account.syncFailed');
      return;
    }
    if (role === 'installer') {
      const response = await fetch(`${webOrigin}/api/account/installer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: stored.companyName.trim(),
          city: stored.city.trim(),
          postalCode: stored.postalCode.trim(),
          countryCode: countryCode(stored.countryCode),
          streetAddress: stored.addressLine.trim(),
          houseNumber: stored.houseNumber.trim()
        })
      });
      if (!response.ok) {
        setMessageKey('Account.syncFailed');
        return;
      }
    }
    if (role === 'homeowner') {
      await loadMatches(supabase, session.access_token, stored);
    }
    setPassword('');
    setConfirm('');
    await clearPendingEmail();
    setEditing(false);
    setMessageKey('Account.saved');
  }

  async function loadMatches(supabase: SupabaseClient, accessToken: string, stored: Draft) {
    const geocoded = await fetch(`${webOrigin}/api/account/geocode`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        street: stored.addressLine.trim(),
        city: stored.city.trim(),
        postalCode: stored.postalCode.trim(),
        countryCode: countryCode(stored.countryCode)
      })
    });
    if (!geocoded.ok) {
      setMatchText(t('Account.matchNone').replace('{unit}', distanceUnitForCountry(stored.countryCode)));
      setMatches([]);
      return;
    }
    const origin = (await geocoded.json()) as { latitude: number; longitude: number };
    const directory = await supabase
      .from('installer_directory')
      .select('id, company_name, city, postal_code, knx_official_rank, verified_projects_count, avg_response_hours, latitude, longitude, public_street');
    const rows = (directory.data ?? []) as Record<string, unknown>[];
    const located: MatchableInstaller[] = rows.flatMap((row) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      const rank = row.knx_official_rank;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return [];
      }
      if (rank !== 'Silver' && rank !== 'Gold' && rank !== 'Platinum') {
        return [];
      }
      return [{
        id: String(row.id),
        companyName: String(row.company_name ?? ''),
        city: String(row.city ?? ''),
        postalCode: String(row.postal_code ?? ''),
        knxOfficialRank: rank,
        verifiedProjectsCount: Number(row.verified_projects_count ?? 0),
        avgResponseHours: row.avg_response_hours == null ? null : Number(row.avg_response_hours),
        latitude,
        longitude,
        publicStreet: row.public_street == null ? null : String(row.public_street)
      }];
    });
    const unit = distanceUnitForCountry(stored.countryCode);
    const result = matchInstallersByDistance(origin, located, unit);
    setMatchText(
      result.radius == null
        ? t('Account.matchNone').replace('{unit}', unit)
        : t('Account.matchRadius').replace('{radius}', String(result.radius)).replace('{unit}', unit)
    );
    setMatches(
      result.matches.map((item) => ({
        id: item.id,
        name: item.companyName,
        place: [item.publicStreet, item.postalCode, item.city].filter(Boolean).join(', '),
        distance: t('Account.matchDistance').replace('{distance}', item.distance.toFixed(1)).replace('{unit}', unit)
      }))
    );
  }

  const summary = profileIsComplete(draft) && !editing;
  const showPassword = !hasSession;

  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{t('Account.title')}</Text>
      <Text style={styles.body}>{t('Account.help')}</Text>
      {ready && summary ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Account.profileTitle')}
          accessibilityHint={t('Account.profileHint')}
          onPress={() => {
            setEditing(true);
            setMessageKey(null);
          }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{t('Account.profileTitle')}</Text>
          <Text style={styles.body}>{role === 'installer' ? t('Account.installer') : t('Account.owner')}</Text>
          {profileRows({ ...draft, role }, t).map((row) => (
            <View key={row.label} style={styles.profileRow}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.body}>{row.value}</Text>
            </View>
          ))}
          <Text style={styles.hint}>{t('Account.profileHint')}</Text>
        </Pressable>
      ) : null}
      {ready && !summary ? (
        <>
          <Pressable accessibilityRole="button" style={role === 'homeowner' ? styles.primary : styles.secondary} onPress={() => choose('homeowner')}>
            <Text style={role === 'homeowner' ? styles.primaryText : styles.secondaryText}>{t('Account.owner')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={role === 'installer' ? styles.primary : styles.secondary} onPress={() => choose('installer')}>
            <Text style={role === 'installer' ? styles.primaryText : styles.secondaryText}>{t('Account.installer')}</Text>
          </Pressable>
          <Text style={styles.body}>{role === 'homeowner' ? t('Account.ownerNote') : t('Account.installerNote')}</Text>
          {role === 'installer' ? (
            <Field label={t('Account.companyName')} value={draft.companyName} onChangeText={(value) => set('companyName', value)} />
          ) : null}
          <Field label={role === 'installer' ? t('Account.fullName') : t('Account.name')} value={draft.fullName} onChangeText={(value) => set('fullName', value)} />
          <Field label={t('Account.addressLine')} value={draft.addressLine} onChangeText={(value) => set('addressLine', value)} />
          <Field label={t('Account.houseNumber')} value={draft.houseNumber} onChangeText={(value) => set('houseNumber', value)} />
          <Field label={t('Account.city')} value={draft.city} onChangeText={(value) => set('city', value)} />
          <Field label={t('Account.postalCode')} value={draft.postalCode} onChangeText={(value) => set('postalCode', value)} />
          {role === 'homeowner' ? (
            <>
              <Field label={t('Account.area')} value={draft.areaSqm} onChangeText={(value) => set('areaSqm', value)} keyboard="number-pad" />
              <Field label={t('Account.floors')} value={draft.floors} onChangeText={(value) => set('floors', value)} keyboard="number-pad" />
              <Field label={t('Account.rooms')} value={draft.roomCount} onChangeText={(value) => set('roomCount', value)} keyboard="number-pad" />
            </>
          ) : null}
          <Field label={t('Account.email')} value={draft.email} onChangeText={(value) => set('email', value)} keyboard="email-address" />
          {savedDraft ? (
            <Pressable
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => {
                setDraft(savedDraft);
                setRole(savedDraft.role);
                setEditing(false);
                setMessageKey(null);
              }}
            >
              <Text style={styles.secondaryText}>{t('Settings.cancel')}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      {ready && showPassword ? (
        <>
          <Field label={t('Account.password')} value={password} onChangeText={setPassword} secure />
          <Field label={t('Account.confirmPassword')} value={confirm} onChangeText={setConfirm} secure />
        </>
      ) : null}
      {ready && (!summary || showPassword) ? (
        <Pressable accessibilityRole="button" style={styles.primary} onPress={() => save().catch(() => setMessageKey('Account.syncFailed'))}>
          <Text style={styles.primaryText}>{t('Account.save')}</Text>
        </Pressable>
      ) : null}
      {messageKey ? <Text style={styles.body}>{t(messageKey)}</Text> : null}
      {matchText ? <Text style={styles.body}>{t('Account.matchTitle')}. {matchText}</Text> : null}
      {matches.map((item) => (
        <Text key={item.id} style={styles.body}>
          {item.name} — {item.place} — {item.distance}
        </Text>
      ))}
      <ModuleHelpLink label={t('Help.moduleLink')} onPress={onOpenHelp} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  title: { fontSize: 28, fontWeight: '600', color: '#1C1917' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  hint: { fontSize: 14, lineHeight: 20, color: '#3F3A36', textDecorationLine: 'underline' },
  card: {
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: '#fff'
  },
  profileRow: { gap: 2 },
  field: { gap: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#1C1917' },
  input: {
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1C1917',
    backgroundColor: '#fff'
  },
  primary: { alignSelf: 'stretch', backgroundColor: '#1C1917', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  primaryText: { color: '#F6F3EE', fontWeight: '700', fontSize: 16 },
  secondary: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#1C1917', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  secondaryText: { color: '#1C1917', fontWeight: '700', fontSize: 16 }
});
