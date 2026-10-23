import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountScreen } from './src/AccountScreen';
import { LaunchSplash } from './src/LaunchSplash';
import { HelpScreen, ModuleHelpLink } from './src/HelpScreen';
import { InterviewScreen } from './src/InterviewScreen';
import { ScanScreen } from './src/ScanScreen';
import type { AccountRole } from './src/storage';
import { SettingsScreen } from './src/SettingsScreen';
import {
  deleteDeviceData,
  loadSession,
  loadSettings,
  saveSettings,
  type AppleSession
} from './src/storage';
import {
  assessExample,
  evidenceCatalog,
  exampleIds,
  exampleProfiles,
  type ExampleAssessment,
  type ExampleId,
  type ExampleProfile,
  type EvidenceId
} from '@khomeeasy/scoring-engine';
import de from '../web/messages/de.json';
import en from '../web/messages/en.json';

const STORAGE_KEY = 'khomeeasy.hidden-example-ids';
const catalogs = { de, en } as const;
type Locale = keyof typeof catalogs;

function lookup(locale: Locale, path: string): string {
  const value = path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, catalogs[locale]);
  return typeof value === 'string' ? value : path;
}

function formatCount(template: string, count: number): string {
  const match = template.match(/one \{([^}]*)\} other \{([^}]*)\}/);
  const branch = match ? (count === 1 ? match[1] : match[2]) : template;
  return (branch ?? template).replaceAll('#', String(count));
}

function formatDate(value: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function isExampleId(value: unknown): value is ExampleId {
  return typeof value === 'string' && (exampleIds as readonly string[]).includes(value);
}

function Shape({ kind }: { kind: 'diamond' | 'square' | 'circle' | 'triangle' | 'dashed' }) {
  if (kind === 'diamond') {
    return <View style={styles.diamond} />;
  }
  if (kind === 'circle') {
    return <View style={styles.circle} />;
  }
  if (kind === 'triangle') {
    return <View style={styles.triangle} />;
  }
  if (kind === 'dashed') {
    return <View style={styles.dashed} />;
  }
  return <View style={styles.square} />;
}

function EvidenceRow({ id, locale }: { id: EvidenceId; locale: Locale }) {
  const item = evidenceCatalog[id];
  const shapeByLevel = { E1: 'diamond', E2: 'square', E3: 'circle', E4: 'triangle' } as const;
  const shape = shapeByLevel[item.level];
  const verified = lookup(locale, 'Evidence.verified').replace('{date}', formatDate(item.verifiedAt, locale));

  return (
    <View style={styles.evidenceBlock}>
      <View style={styles.badge}>
        <Shape kind={shape} />
        <Text style={styles.badgeText}>{lookup(locale, `Evidence.levels.${item.level}.label`)}</Text>
      </View>
      <Text style={styles.muted}>{verified}</Text>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(item.sourceUrl)}>
        <Text style={styles.link}>{lookup(locale, 'Evidence.source')}</Text>
      </Pressable>
    </View>
  );
}

function CaseCard({
  profile,
  locale,
  onRemove
}: {
  profile: ExampleProfile;
  locale: Locale;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const result: ExampleAssessment = assessExample(profile);
  const t = (path: string) => lookup(locale, path);
  const facts: { label: string; value: string }[] = [];

  if (profile.areaSqm !== null) {
    facts.push({ label: t('Examples.factArea'), value: `${profile.areaSqm.toLocaleString(locale === 'en' ? 'en-GB' : 'de-DE')} m²` });
  }
  if (profile.gardenSqm !== null) {
    facts.push({ label: t('Examples.factGarden'), value: `${profile.gardenSqm.toLocaleString(locale === 'en' ? 'en-GB' : 'de-DE')} m²` });
  }
  if (profile.guestRooms !== null) {
    facts.push({ label: t('Examples.factRooms'), value: String(profile.guestRooms) });
  }
  if (profile.buildings !== null && profile.buildings > 1) {
    facts.push({ label: t('Examples.factBuildings'), value: t('Examples.severalBuildings') });
  }
  if (profile.adults !== null) {
    const people = [formatCount(t('Examples.adults'), profile.adults)];
    if (profile.children) {
      people.push(formatCount(t('Examples.children'), profile.children));
    }
    if (profile.dogs) {
      people.push(formatCount(t('Examples.dogs'), profile.dogs));
    }
    facts.push({ label: t('Examples.factHousehold'), value: people.join(', ') });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t(`Examples.cases.${profile.id}.title`)}</Text>
      <Text style={styles.body}>{t(`Examples.cases.${profile.id}.story`)}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Shape kind={result.fit === 'incomplete' ? 'dashed' : 'triangle'} />
          <Text style={styles.metaText}>{t(`Examples.fit.${result.fit}`)}</Text>
        </View>
        <Text style={styles.metaText}>
          {t('Examples.tierLabel')}: {result.tier ? t(`Examples.tier.${result.tier}`) : t('Examples.tier.none')}
        </Text>
      </View>
      <Text style={styles.metaText}>
        {t('Examples.wiringLabel')}: {t(`Examples.wiring.${result.wiring}`)}
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setOpen((value) => !value)}>
          <Text style={styles.secondaryButtonText}>{t('Examples.openScheme')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={onRemove}>
          <Text style={styles.secondaryButtonText}>{t('Examples.remove')}</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.detail}>
          {facts.map((fact) => (
            <Text key={fact.label} style={styles.body}>
              <Text style={styles.strong}>{fact.label}. </Text>
              {fact.value}
            </Text>
          ))}
          <Text style={styles.body}>
            <Text style={styles.strong}>{t('Examples.factBudget')}. </Text>
            {t('Examples.budgetMissing')}
          </Text>
          <Text style={styles.section}>{t('Examples.whyTitle')}</Text>
          {result.reasons.map((code) => (
            <Text key={code} style={styles.bullet}>
              · {t(`Examples.reasons.${code}`)}
            </Text>
          ))}
          <Text style={styles.section}>{t('Examples.schemeTitle')}</Text>
          {result.functions.map((code) => (
            <Text key={code} style={styles.bullet}>
              · {t(`Examples.functions.${code}`)}
            </Text>
          ))}
          <Text style={styles.section}>{t('Examples.pointsTitle')}</Text>
          {result.points.map((code, index) => (
            <Text key={code} style={styles.bullet}>
              {index + 1}. {t(`Examples.points.${code}`)}
            </Text>
          ))}
          {result.budget === 'typical_house_context' ? (
            <View>
              <EvidenceRow id="budget" locale={locale} />
              <Text style={styles.body}>{t('Examples.budgetContext')}</Text>
              {profile.areaSqm !== null && profile.areaSqm > 250 ? (
                <Text style={styles.body}>{t('Examples.areaAbove')}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.strong}>{t('Examples.noHousePrice')}</Text>
          )}
          {result.evidence.includes('basalte') ? (
            <View>
              <EvidenceRow id="basalte" locale={locale} />
              <Text style={styles.body}>{t('Examples.basalteNote')}</Text>
            </View>
          ) : null}
          {result.evidence.includes('handover') ? (
            <View>
              <EvidenceRow id="handover" locale={locale} />
              <Text style={styles.body}>{t('Examples.handoverNote')}</Text>
            </View>
          ) : null}
          <Text style={styles.fine}>{t('Examples.limit')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const pathStages = [
  'guide',
  'examples',
  'fit',
  'rooms',
  'request',
  'partners',
  'quotes',
  'handover',
  'work'
] as const;

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [locale, setLocale] = useState<Locale>('de');
  const [screen, setScreen] = useState<'guide' | 'examples' | 'settings' | 'interview' | 'account' | 'scan' | 'help'>('guide');
  const [helpTopic, setHelpTopic] = useState('toc');
  const [accountRole, setAccountRole] = useState<AccountRole>('homeowner');
  const [settingsReady, setSettingsReady] = useState(false);
  const [hidden, setHidden] = useState<ExampleId[]>([]);
  const [session, setSession] = useState<AppleSession | null>(null);
  const t = (path: string) => lookup(locale, path);
  const visible = exampleProfiles.filter((profile) => !hidden.includes(profile.id));

  useEffect(() => {
    loadSettings()
      .then((settings) => {
        if (settings) {
          setLocale(settings.locale);
          if (settings.role) {
            setAccountRole(settings.role);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setSettingsReady(true));
    loadSession().then(setSession).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!settingsReady) {
      return;
    }
    saveSettings({ locale, role: accountRole }).catch(() => undefined);
  }, [locale, accountRole, settingsReady]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) {
          return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHidden(parsed.filter(isExampleId));
        }
      })
      .catch(() => undefined);
  }, []);

  function openHelp(topic: string) {
    setHelpTopic(topic);
    setScreen('help');
  }

  function persist(next: ExampleId[]) {
    setHidden(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }

  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <LaunchSplash t={t} onFinished={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="KHomeEasy" onPress={() => setScreen('guide')} style={styles.brandLockup}>
          <Image source={require('./assets/logo.png')} style={styles.logo} />
          <Text style={styles.brand}>KHomeEasy</Text>
        </Pressable>
        <View style={styles.locales}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: screen === 'guide' }} onPress={() => setScreen('guide')}>
            <Text style={styles.navText}>{t('Settings.home')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: screen === 'help' }} onPress={() => openHelp('toc')}>
            <Text style={styles.navText}>{t('Help.open')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: screen === 'settings' }} onPress={() => setScreen('settings')}>
            <Text style={styles.navText}>{t('Settings.open')}</Text>
          </Pressable>
          {(['de', 'en'] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === item }}
              onPress={() => setLocale(item)}
              style={locale === item ? styles.localeOn : styles.localeOff}
            >
              <Text style={locale === item ? styles.localeOnText : styles.localeOffText}>
                {t(`LocaleSwitcher.${item}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {screen === 'help' ? (
        <HelpScreen locale={locale} topic={helpTopic} t={t} onJump={setHelpTopic} />
      ) : (
      <ScrollView contentContainerStyle={styles.scroll}>
        {screen === 'scan' ? (
          <ScanScreen role={accountRole} t={t} onOpenHelp={() => openHelp('account')} />
        ) : screen === 'account' ? (
          <AccountScreen
            locale={locale}
            initialRole={accountRole}
            t={t}
            onOpenHelp={() => openHelp('account')}
            onScan={(role) => {
              setAccountRole(role);
              setScreen('scan');
            }}
          />
        ) : screen === 'interview' ? (
          <InterviewScreen t={t} onOpenHelp={() => openHelp('fit')} />
        ) : screen === 'settings' ? (
          <SettingsScreen
            locale={locale}
            session={session}
            t={t}
            onOpenHelp={() => openHelp('toc')}
            onSession={setSession}
            onSignedOut={() => setSession(null)}
            onDelete={() => {
              deleteDeviceData()
                .then(() => {
                  setSession(null);
                  setHidden([]);
                  setLocale('de');
                  setScreen('guide');
                })
                .catch(() => undefined);
            }}
          />
        ) : screen === 'guide' ? (
          <View style={styles.scroll}>
            <Text style={styles.eyebrow}>{t('Home.eyebrow')}</Text>
            <Text style={styles.title}>{t('Home.pathTitle')}</Text>
            <Text style={styles.body}>{t('Home.pathLede')}</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('Account.helpTitle')}</Text>
              <Text style={styles.body}>{t('Account.help')}</Text>
              <Pressable
                accessibilityRole="button"
                style={styles.primary}
                onPress={() => {
                  setAccountRole('homeowner');
                  setScreen('account');
                }}
              >
                <Text style={styles.primaryText}>{t('Account.owner')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => {
                  setAccountRole('installer');
                  setScreen('account');
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('Account.installer')}</Text>
              </Pressable>
              <ModuleHelpLink label={t('Help.moduleLink')} onPress={() => openHelp('account')} />
            </View>
            <Pressable accessibilityRole="button" style={styles.primary} onPress={() => setScreen('interview')}>
              <Text style={styles.primaryText}>{t('Guide.start')}</Text>
            </Pressable>
            {pathStages.map((id, index) => {
              const status = id === 'guide' || id === 'examples' ? 'Now' : id === 'work' ? 'Outside' : 'Next';
              return (
                <View key={id} style={styles.card}>
                  <Text style={styles.metaText}>
                    {String(index + 1).padStart(2, '0')} · {t(`Home.status${status}`)}
                  </Text>
                  <Text style={styles.cardTitle}>{t(`Home.${id}Title`)}</Text>
                  <Text style={styles.body}>
                    <Text style={styles.strong}>{t('Home.youLabel')}. </Text>
                    {t(`Home.${id}You`)}
                  </Text>
                  <Text style={styles.body}>
                    <Text style={styles.strong}>{t('Home.getLabel')}. </Text>
                    {t(`Home.${id}Get`)}
                  </Text>
                  {id === 'examples' ? (
                    <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => setScreen('examples')}>
                      <Text style={styles.secondaryButtonText}>{t('Home.secondaryCta')}</Text>
                    </Pressable>
                  ) : null}
                  <ModuleHelpLink label={t('Help.moduleLink')} onPress={() => openHelp(id)} />
                </View>
              );
            })}
            <Text style={styles.fine}>{t('Safety.boundary')}</Text>
          </View>
        ) : (
          <View style={styles.scroll}>
            <Pressable accessibilityRole="button" onPress={() => setScreen('guide')}>
              <Text style={styles.link}>{t('Home.primaryCta')}</Text>
            </Pressable>
            <Text style={styles.eyebrow}>{t('Examples.eyebrow')}</Text>
            <Text style={styles.title}>{t('Examples.title')}</Text>
            <Text style={styles.body}>{t('Examples.lede')}</Text>
        {visible.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.body}>{t('Examples.empty')}</Text>
            <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => persist([])}>
              <Text style={styles.secondaryButtonText}>{t('Examples.restore')}</Text>
            </Pressable>
          </View>
        ) : (
          visible.map((profile) => (
            <CaseCard
              key={profile.id}
              profile={profile}
              locale={locale}
              onRemove={() => persist([...hidden, profile.id])}
            />
          ))
        )}
        {hidden.length > 0 && visible.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => persist([])}>
            <Text style={styles.link}>{t('Examples.restore')}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.fine}>{t('Safety.trademark')}</Text>
        <Text style={styles.fine}>{t('Safety.disclaimerEn')}</Text>
        <ModuleHelpLink label={t('Help.moduleLink')} onPress={() => openHelp('examples')} />
          </View>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const ink = '#1C1917';
const paper = '#F6F3EE';
const muted = '#3F3A36';
const line = '#D9D2C8';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: paper },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: line
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brand: { fontSize: 22, fontWeight: '600', color: ink },
  locales: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  localeOn: { backgroundColor: ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  localeOff: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  localeOnText: { color: paper, fontWeight: '600' },
  localeOffText: { color: ink, fontWeight: '600', textDecorationLine: 'underline' },
  navText: { color: ink, fontWeight: '700', textDecorationLine: 'underline', fontSize: 16 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  eyebrow: { color: '#6B4423', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  title: { fontSize: 28, fontWeight: '600', color: ink },
  body: { fontSize: 16, lineHeight: 24, color: muted },
  strong: { fontWeight: '700', color: ink },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: line, borderRadius: 12, padding: 16, gap: 10 },
  cardTitle: { fontSize: 22, fontWeight: '600', color: ink },
  metaRow: { gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 14, fontWeight: '600', color: ink, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { borderWidth: 1, borderColor: ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: ink, fontWeight: '600' },
  primary: { alignSelf: 'flex-start', backgroundColor: ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: paper, fontWeight: '700' },
  detail: { gap: 8, borderTopWidth: 1, borderTopColor: line, paddingTop: 12 },
  section: { fontSize: 16, fontWeight: '700', color: ink, marginTop: 8 },
  bullet: { fontSize: 16, lineHeight: 24, color: muted },
  fine: { fontSize: 13, lineHeight: 20, color: muted },
  link: { color: ink, fontWeight: '700', textDecorationLine: 'underline', fontSize: 15 },
  evidenceBlock: { gap: 4, marginTop: 8 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: { fontWeight: '700', color: ink },
  muted: { color: muted },
  diamond: { width: 10, height: 10, backgroundColor: ink, transform: [{ rotate: '45deg' }] },
  square: { width: 10, height: 10, backgroundColor: ink },
  circle: { width: 12, height: 12, borderRadius: 6, backgroundColor: ink },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ink
  },
  dashed: { width: 12, height: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: ink }
});
