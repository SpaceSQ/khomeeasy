import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { PricingTables } from './PricingTables';

type Lookup = (path: string) => string;
type Locale = 'de' | 'en';
type Mark = 'free' | 'paid' | 'outside' | 'rule';

export const helpTopics = [
  'flow',
  'pricing',
  'guide',
  'examples',
  'fit',
  'rooms',
  'request',
  'account',
  'partners',
  'quotes',
  'handover',
  'work',
  'settings',
  'safety'
] as const;

const proseTopics = helpTopics.filter((topic) => topic !== 'flow' && topic !== 'pricing');

const ownerSteps: readonly (readonly [string, Mark])[] = [
  ['guide', 'free'],
  ['examples', 'free'],
  ['fit', 'free'],
  ['rooms', 'free'],
  ['save', 'free'],
  ['pass', 'paid'],
  ['files', 'paid'],
  ['site', 'outside']
];

const installerSteps: readonly (readonly [string, Mark])[] = [
  ['claim', 'free'],
  ['quota', 'free'],
  ['pass', 'paid'],
  ['quotes', 'paid'],
  ['rank', 'rule']
];

function MarkLabel({ kind, t }: { kind: Mark; t: Lookup }) {
  const label =
    kind === 'paid' ? t('Help.markPaid') : kind === 'outside' ? t('Help.markOutside') : kind === 'rule' ? t('Help.markRule') : t('Help.markFree');
  return (
    <View style={styles.markRow}>
      {kind === 'paid' ? <View style={styles.circle} /> : kind === 'outside' ? <View style={styles.triangle} /> : kind === 'rule' ? <View style={styles.diamond} /> : <View style={styles.square} />}
      <Text style={styles.mark}>{label}</Text>
    </View>
  );
}

function Lane({ title, steps, prefix, t }: { title: string; steps: readonly (readonly [string, Mark])[]; prefix: 'ownerSteps' | 'installerSteps'; t: Lookup }) {
  return (
    <View style={styles.lane}>
      <Text style={styles.laneTitle}>{title}</Text>
      {steps.map(([id, kind], index) => (
        <View key={id} style={styles.step}>
          <Text style={styles.stepIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.stepText}>{t(`Help.${prefix}.${id}`)}</Text>
          <MarkLabel kind={kind} t={t} />
        </View>
      ))}
    </View>
  );
}

export function ModuleHelpLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.linkHit}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export function HelpScreen({
  locale,
  topic,
  t,
  onJump
}: {
  locale: Locale;
  topic: string;
  t: Lookup;
  onJump: (topic: string) => void;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offsets = useRef<Record<string, number>>({});

  function remember(id: string, y: number) {
    offsets.current[id] = y;
    if (id === topic) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: false });
    }
  }

  useEffect(() => {
    const y = offsets.current[topic];
    if (y == null) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [topic]);

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.page}>
      <Text style={styles.title}>{t('Help.title')}</Text>
      <Text style={styles.body}>{t('Help.lede')}</Text>
      <View
        accessibilityRole="summary"
        style={styles.toc}
        onLayout={(event) => remember('toc', event.nativeEvent.layout.y)}
      >
        <Text style={styles.laneTitle}>{t('Help.tocTitle')}</Text>
        {helpTopics.map((item, index) => (
          <Pressable key={item} accessibilityRole="link" onPress={() => onJump(item)} style={styles.tocItem}>
            <Text style={styles.link}>
              {String(index + 1).padStart(2, '0')}  {t(`Help.topics.${item}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        onLayout={(event) => remember('flow', event.nativeEvent.layout.y)}
        style={styles.section}
      >
        <Text style={styles.heading}>{t('Help.flowTitle')}</Text>
        <Text style={styles.body}>{t('Help.flowLede')}</Text>
        <View style={styles.center}>
          <Text style={styles.centerText}>{t('Help.center')}</Text>
        </View>
        <Lane title={t('Help.ownerLane')} steps={ownerSteps} prefix="ownerSteps" t={t} />
        <Lane title={t('Help.installerLane')} steps={installerSteps} prefix="installerSteps" t={t} />
      </View>

      <View
        onLayout={(event) => remember('pricing', event.nativeEvent.layout.y)}
        style={styles.section}
      >
        <Text style={styles.heading}>{t('Help.topics.pricing')}</Text>
        <PricingTables locale={locale} t={t} />
      </View>

      {proseTopics.map((item) => (
        <View
          key={item}
          onLayout={(event) => remember(item, event.nativeEvent.layout.y)}
          style={styles.section}
        >
          <Text style={styles.heading}>{t(`Help.topics.${item}`)}</Text>
          <Text style={styles.body}>{t(`Help.bodies.${item}`)}</Text>
          {item === 'handover' ? (
            <View style={styles.section}>
              <Text style={styles.fine}>{t('Safety.disclaimerDe')}</Text>
              <Text style={styles.fine}>{t('Safety.disclaimerEn')}</Text>
            </View>
          ) : null}
        </View>
      ))}
      <Text style={styles.fine}>{t('Safety.trademark')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '600', color: '#1C1917' },
  heading: { fontSize: 22, fontWeight: '600', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  fine: { fontSize: 13, lineHeight: 20, color: '#3F3A36' },
  toc: { borderWidth: 2, borderColor: '#1C1917', borderRadius: 12, backgroundColor: '#fff', padding: 16, gap: 4 },
  tocItem: { minHeight: 44, justifyContent: 'center' },
  section: { gap: 10 },
  center: { alignSelf: 'center', borderWidth: 2, borderColor: '#1C1917', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10 },
  centerText: { fontSize: 18, fontWeight: '700', color: '#1C1917' },
  lane: { gap: 8, borderLeftWidth: 2, borderLeftColor: '#1C1917', paddingLeft: 12 },
  laneTitle: { fontSize: 18, fontWeight: '700', color: '#1C1917' },
  step: { borderWidth: 1, borderColor: '#1C1917', borderRadius: 12, backgroundColor: '#fff', padding: 12, gap: 6 },
  stepIndex: { fontSize: 12, fontWeight: '700', color: '#3F3A36' },
  stepText: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#1C1917' },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: '#1C1917' },
  square: { width: 12, height: 12, borderWidth: 2, borderColor: '#1C1917' },
  circle: { width: 12, height: 12, borderWidth: 2, borderColor: '#1C1917', borderRadius: 6 },
  diamond: { width: 12, height: 12, borderWidth: 2, borderColor: '#1C1917', transform: [{ rotate: '45deg' }] },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1C1917'
  },
  linkHit: { minHeight: 44, justifyContent: 'center' },
  link: { color: '#1C1917', fontWeight: '700', textDecorationLine: 'underline', fontSize: 16 }
});
