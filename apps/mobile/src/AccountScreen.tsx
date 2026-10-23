import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  distanceUnitForCountry,
  matchInstallersByDistance,
  type MatchableInstaller
} from '@khomeeasy/scoring-engine';
import { ModuleHelpLink } from './HelpScreen';
import { storageKeys, type AccountRole, type LocaleChoice } from './storage';
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
  onOpenHelp,
  onScan
}: {
  locale: LocaleChoice;
  initialRole: AccountRole;
  t: Lookup;
  onOpenHelp: () => void;
  onScan: (role: AccountRole) => void;
}) {
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [draft, setDraft] = useState<Draft>(emptyDraft(initialRole));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [matchText, setMatchText] = useState<string | null>(null);
  const [matches, setMatches] = useState<{ id: string; name: string; place: string; distance: string }[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(storageKeys.account)
      .then((raw) => {
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw) as Partial<Draft>;
        if (parsed.role === 'installer' || parsed.role === 'homeowner') {
          setRole(parsed.role);
          setDraft({ ...emptyDraft(parsed.role), ...parsed, role: parsed.role });
        }
      })
      .catch(() => undefined);
  }, []);

  function choose(next: AccountRole) {
    setRole(next);
    setDraft((current) => ({ ...current, role: next }));
    setMessage(null);
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setMessage(null);
    if (!draft.email.includes('@') || !draft.postalCode.trim() || !draft.city.trim() || !draft.addressLine.trim()) {
      setMessage(t('Account.missing'));
      return;
    }
    if (role === 'installer' && (!draft.companyName.trim() || !draft.fullName.trim() || !draft.houseNumber.trim())) {
      setMessage(t('Account.missing'));
      return;
    }
    if (password.length < 8) {
      setMessage(t('Account.passwordShort'));
      return;
    }
    if (password !== confirm) {
      setMessage(t('Account.passwordMismatch'));
      return;
    }

    const stored = { ...draft, role };
    await AsyncStorage.setItem(storageKeys.account, JSON.stringify(stored));

    const supabase = getMobileSupabase();
    if (!supabase || !webOrigin) {
      setMessage(t('Account.savedLocal'));
      return;
    }

    const signUp = await supabase.auth.signUp({
      email: draft.email.trim(),
      password,
      options: { data: { full_name: draft.fullName.trim(), locale: locale === 'en' ? 'en-GB' : 'de-DE' } }
    });
    let session = signUp.data.session;
    if (!session) {
      const signIn = await supabase.auth.signInWithPassword({ email: draft.email.trim(), password });
      session = signIn.data.session;
      if (!session && signUp.error) {
        setMessage(t('Account.confirmEmail'));
        return;
      }
    }
    if (!session) {
      setMessage(t('Account.confirmEmail'));
      return;
    }

    const numberOrNull = (value: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    const { error: profileError } = await supabase.from('profiles').update({
      role,
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
    }).eq('id', session.user.id);

    if (profileError) {
      setMessage(t('Account.syncFailed'));
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
          companyName: draft.companyName.trim(),
          city: draft.city.trim(),
          postalCode: draft.postalCode.trim(),
          countryCode: draft.countryCode,
          streetAddress: draft.addressLine.trim(),
          houseNumber: draft.houseNumber.trim()
        })
      });
      if (!response.ok) {
        setMessage(t('Account.syncFailed'));
        return;
      }
    }

    if (role === 'homeowner') {
      const geocoded = await fetch(`${webOrigin}/api/account/geocode`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          street: draft.addressLine.trim(),
          city: draft.city.trim(),
          postalCode: draft.postalCode.trim(),
          countryCode: draft.countryCode
        })
      });
      if (!geocoded.ok) {
        setMatchText(t('Account.matchNone').replace('{unit}', distanceUnitForCountry(draft.countryCode)));
        setMatches([]);
      } else {
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
        const unit = distanceUnitForCountry(draft.countryCode);
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
            distance: t('Account.matchDistance')
              .replace('{distance}', item.distance.toFixed(1))
              .replace('{unit}', unit)
          }))
        );
      }
    }

    setPassword('');
    setConfirm('');
    setMessage(t('Account.saved'));
  }

  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{t('Account.title')}</Text>
      <Text style={styles.body}>{t('Account.help')}</Text>
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
      <Field label={t('Account.fullName')} value={draft.fullName} onChangeText={(value) => set('fullName', value)} />
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
      <Field label={t('Account.password')} value={password} onChangeText={setPassword} secure />
      <Field label={t('Account.confirmPassword')} value={confirm} onChangeText={setConfirm} secure />
      <Pressable accessibilityRole="button" style={styles.primary} onPress={() => save().catch(() => setMessage(t('Account.syncFailed')))}>
        <Text style={styles.primaryText}>{t('Account.save')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => onScan(role)}>
        <Text style={styles.secondaryText}>{t('Account.scan')}</Text>
      </Pressable>
      {message ? <Text style={styles.body}>{message}</Text> : null}
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
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
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
