import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Lookup = (path: string) => string;
type Locale = 'de' | 'en';

const ownerOrder = ['fit', 'compare', 'rooms', 'band', 'examples', 'save', 'pdf', 'quotes', 'handover'] as const;
const ownerPaidOnly = new Set<string>(['pdf', 'quotes', 'handover']);
const installerOrder = ['claim', 'quota', 'quote', 'gallery', 'heat', 'rank'] as const;

function cell(t: Lookup, row: string, side: 'free' | 'paid', audience: 'owner' | 'installer'): string {
  if (audience === 'owner') {
    return side === 'free' && ownerPaidOnly.has(row) ? t('Help.cellNo') : t('Help.cellYes');
  }
  if (row === 'quota') {
    return side === 'free' ? t('Help.cellTwo') : t('Help.cellUnlimited');
  }
  if (row === 'quote') {
    return side === 'free' ? t('Help.cellWithinTwo') : t('Help.cellYes');
  }
  if (row === 'gallery' || row === 'heat') {
    return side === 'free' ? t('Help.cellNo') : t('Help.cellYes');
  }
  if (row === 'rank') {
    return t('Help.cellForbidden');
  }
  return t('Help.cellYes');
}

function CompareTable({
  title,
  paidHeader,
  rows,
  audience,
  t
}: {
  title: string;
  paidHeader: string;
  rows: readonly string[];
  audience: 'owner' | 'installer';
  t: Lookup;
}) {
  return (
    <View accessibilityRole="summary" style={styles.tableWrap}>
      <Text style={styles.tableTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.head, styles.capability]}>{t('Help.tableCapability')}</Text>
            <Text style={[styles.head, styles.col]}>{t('Help.tableFree')}</Text>
            <Text style={[styles.head, styles.paidCol]}>{paidHeader}</Text>
          </View>
          {rows.map((row) => (
            <View key={row} style={styles.row}>
              <Text style={[styles.cell, styles.capability]}>{t(`Help.${audience}Rows.${row}`)}</Text>
              <Text style={[styles.cell, styles.col]}>{cell(t, row, 'free', audience)}</Text>
              <Text style={[styles.cell, styles.paidCol]}>{cell(t, row, 'paid', audience)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function PricingTables({ locale, t }: { locale: Locale; t: Lookup }) {
  const verified = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${t('Help.priceVerified')}T00:00:00Z`));

  return (
    <View style={styles.stack}>
      <CompareTable title={t('Help.ownerTitle')} paidHeader={t('Help.ownerPaid')} rows={ownerOrder} audience="owner" t={t} />
      <CompareTable
        title={t('Help.installerTitle')}
        paidHeader={t('Help.installerPaid')}
        rows={installerOrder}
        audience="installer"
        t={t}
      />
      <Text style={styles.heading}>{t('Help.paymentTitle')}</Text>
      <Text style={styles.body}>{t('Help.paymentBody')}</Text>
      <Text style={styles.body}>{t('Help.founding')}</Text>
      <Text style={styles.body}>{t('Help.sponsored')}</Text>
      <View style={styles.badge}>
        <View style={styles.triangle} accessibilityElementsHidden />
        <Text style={styles.badgeText}>{t('Evidence.levels.E4.label')}</Text>
      </View>
      <Text style={styles.body}>{t('Evidence.verified').replace('{date}', verified)}</Text>
      <Text style={styles.body}>{t('Help.priceNote')}</Text>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(t('Help.priceSource')).catch(() => undefined)}>
        <Text style={styles.link}>{t('Evidence.source')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  tableWrap: { gap: 8 },
  tableTitle: { fontSize: 22, fontWeight: '600', color: '#1C1917' },
  table: { minWidth: 680, borderWidth: 1, borderColor: '#1C1917', backgroundColor: '#fff' },
  headRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#1C1917', backgroundColor: '#F6F3EE' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#D9D2C8' },
  head: { padding: 10, fontSize: 14, fontWeight: '700', color: '#1C1917' },
  cell: { padding: 10, fontSize: 15, lineHeight: 22, color: '#1C1917' },
  capability: { width: 280 },
  col: { width: 160 },
  paidCol: { width: 240 },
  heading: { fontSize: 18, fontWeight: '700', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 999,
    backgroundColor: '#F8EBD9',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
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
  badgeText: { fontWeight: '700', color: '#1C1917' },
  link: { color: '#1C1917', fontWeight: '700', textDecorationLine: 'underline', fontSize: 16 }
});
