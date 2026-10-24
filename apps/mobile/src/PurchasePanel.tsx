import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  endConnection,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase
} from 'expo-iap';
import {
  PARTNER_WORKBENCH_MONTHLY_ID,
  PROJECT_PRO_PASS_ID,
  type ProductKind,
  type PurchaseAccountView,
  type PurchaseReceiptView
} from '@khomeeasy/shared-types';
import { PurchaseRequestError, claimTransaction, loadPurchaseAccount, releaseTransaction, sendSignedTransaction } from './purchase';
import { loadDesigns } from './storage';
import { getMobileSupabase } from './supabase';

type Lookup = (path: string) => string;
type Role = 'homeowner' | 'installer';
type Locale = 'de' | 'en';

const messageForCode: Record<string, string> = {
  needAccount: 'Purchase.needAccount',
  session: 'Purchase.needAccount',
  role: 'Purchase.roleMismatch',
  account: 'Purchase.roleMismatch',
  invalid: 'Purchase.failed',
  product: 'Purchase.unavailable',
  type: 'Purchase.unavailable',
  unavailable: 'Purchase.unavailable',
  conflict: 'Purchase.failed',
  pass_not_restored: 'Purchase.passNotRestored',
  missing: 'Purchase.failed',
  failed: 'Purchase.failed'
};

function formatWhen(value: string, locale: Locale): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatPrice(milliunits: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    style: 'currency',
    currency: currency || 'EUR'
  }).format(milliunits / 1000);
}

function productLabel(kind: ProductKind, t: Lookup): string {
  return kind === 'project_pass' ? t('Purchase.ownerProduct') : t('Purchase.contractorProduct');
}

export function PurchasePanel({
  role,
  locale,
  t,
  designTitle,
  buildType,
  constructionPhase,
  areaSqm,
  onBeforePurchase
}: {
  role: Role;
  locale: Locale;
  t: Lookup;
  designTitle?: string;
  buildType?: string | null;
  constructionPhase?: string | null;
  areaSqm?: number | null;
  onBeforePurchase?: () => Promise<void> | void;
}) {
  const kind: ProductKind = role === 'installer' ? 'workbench_subscription' : 'project_pass';
  const productId = kind === 'project_pass' ? PROJECT_PRO_PASS_ID : PARTNER_WORKBENCH_MONTHLY_ID;
  const [account, setAccount] = useState<PurchaseAccountView | null>(null);
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [storeReady, setStoreReady] = useState(Platform.OS === 'ios');

  useEffect(() => {
    let alive = true;
    loadPurchaseAccount()
      .then((next) => {
        if (alive) {
          setAccount(next);
        }
      })
      .catch(() => {
        if (alive) {
          setMessageKey('Purchase.failed');
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  async function userId(): Promise<string | null> {
    const supabase = getMobileSupabase();
    if (!supabase) {
      return null;
    }
    const session = (await supabase.auth.getSession()).data.session;
    return session?.user.id ?? null;
  }

  async function titleForPurchase(): Promise<string> {
    if (designTitle?.trim()) {
      return designTitle.trim().slice(0, 120);
    }
    const designs = await loadDesigns().catch(() => []);
    return designs[0]?.title?.trim().slice(0, 120) || t('Purchase.defaultProjectTitle');
  }

  const confirmRef = useRef<(purchase: Purchase, mode: 'purchase' | 'restore') => Promise<void>>(async () => undefined);

  async function confirm(purchase: Purchase, mode: 'purchase' | 'restore') {
    const signedTransaction = purchase.purchaseToken;
    if (!signedTransaction || purchase.productId !== productId || !claimTransaction(purchase.id)) {
      return;
    }
    setBusy(true);
    setMessageKey('Purchase.verifying');
    try {
      const title = await titleForPurchase();
      const next = await sendSignedTransaction({
        signedTransaction,
        mode,
        designTitle: title,
        buildType,
        constructionPhase,
        areaSqm
      });
      await finishTransaction({ purchase, isConsumable: kind === 'project_pass' && mode === 'purchase' });
      setAccount(next);
      setMessageKey(mode === 'restore' ? 'Purchase.restored' : null);
    } catch (error) {
      releaseTransaction(purchase.id);
      const code = error instanceof PurchaseRequestError ? error.code : 'failed';
      setMessageKey(messageForCode[code] ?? 'Purchase.failed');
    } finally {
      setBusy(false);
    }
  }

  confirmRef.current = confirm;

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setStoreReady(false);
      return;
    }
    let alive = true;
    const updates = purchaseUpdatedListener((purchase) => {
      if (!alive || purchase.productId !== productId) {
        return;
      }
      confirmRef.current(purchase, 'purchase').catch(() => setMessageKey('Purchase.failed'));
    });
    const errors = purchaseErrorListener((error) => {
      if (!alive || isUserCancelledError(error)) {
        setBusy(false);
        return;
      }
      setBusy(false);
      setMessageKey('Purchase.failed');
    });
    initConnection()
      .then(() => {
        if (alive) {
          setStoreReady(true);
        }
      })
      .catch(() => {
        if (alive) {
          setStoreReady(false);
        }
      });
    return () => {
      alive = false;
      updates.remove();
      errors.remove();
      endConnection().catch(() => undefined);
    };
  }, [productId]);

  async function buy() {
    if (Platform.OS !== 'ios' || !storeReady) {
      setMessageKey('Purchase.unavailable');
      return;
    }
    const id = await userId();
    if (!id) {
      setMessageKey('Purchase.needAccount');
      return;
    }
    if (onBeforePurchase) {
      await onBeforePurchase();
    }
    setBusy(true);
    setMessageKey(null);
    try {
      const result = await requestPurchase({
        type: kind === 'project_pass' ? 'in-app' : 'subs',
        request: {
          apple: { sku: productId, appAccountToken: id, andDangerouslyFinishTransactionAutomatically: false }
        }
      });
      const purchase = Array.isArray(result) ? result[0] : result;
      if (purchase && typeof purchase === 'object' && 'purchaseToken' in purchase && purchase.purchaseToken) {
        await confirm(purchase as Purchase, 'purchase');
      }
    } catch (error) {
      if (!isUserCancelledError(error)) {
        setMessageKey('Purchase.unavailable');
      }
      setBusy(false);
    }
  }

  async function restore() {
    if (kind !== 'workbench_subscription') {
      setMessageKey('Purchase.passNotRestored');
      const next = await loadPurchaseAccount().catch(() => null);
      if (next) {
        setAccount(next);
      }
      return;
    }
    setBusy(true);
    setMessageKey(null);
    try {
      const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      const subscription = purchases.find((purchase) => purchase.productId === PARTNER_WORKBENCH_MONTHLY_ID && purchase.purchaseToken);
      if (!subscription) {
        setMessageKey('Purchase.restoreEmpty');
        return;
      }
      await confirm(subscription, 'restore');
    } catch (error) {
      if (!isUserCancelledError(error)) {
        setMessageKey('Purchase.failed');
      }
    } finally {
      setBusy(false);
    }
  }

  const unlockedProjects = account?.projects.filter((project) => project.isProUnlocked) ?? [];
  const receipt = account?.receipts.find((item) => item.productKind === kind) ?? null;
  const verified = formatWhen(t('Help.priceVerified'), locale);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('Help.topics.pricing')}</Text>
      <Text style={styles.body}>{kind === 'project_pass' ? t('Purchase.ownerIntro') : t('Purchase.contractorIntro')}</Text>
      <View style={styles.badge}>
        <View style={styles.triangle} />
        <Text style={styles.badgeText}>{t('Evidence.levels.E4.label')}</Text>
      </View>
      <Text style={styles.fine}>{t('Evidence.verified').replace('{date}', verified)}</Text>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(t('Help.priceSource'))}>
        <Text style={styles.link}>{t('Evidence.source')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={kind === 'project_pass' ? t('Purchase.ownerButton') : t('Purchase.contractorButton')}
        disabled={busy}
        style={[styles.primary, busy ? styles.disabled : null]}
        onPress={() => {
          buy().catch(() => setMessageKey('Purchase.failed'));
        }}
      >
        <Text style={styles.primaryText}>{kind === 'project_pass' ? t('Purchase.ownerButton') : t('Purchase.contractorButton')}</Text>
      </Pressable>
      {kind === 'workbench_subscription' ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={styles.secondary}
          onPress={() => {
            restore().catch(() => setMessageKey('Purchase.failed'));
          }}
        >
          <Text style={styles.secondaryText}>{t('Purchase.restore')}</Text>
        </Pressable>
      ) : (
        <Text style={styles.fine}>{t('Purchase.passNotRestored')}</Text>
      )}
      {messageKey ? <Text style={styles.body}>{t(messageKey)}</Text> : null}
      {receipt ? <ReceiptBlock receipt={receipt} locale={locale} t={t} /> : null}
      {kind === 'project_pass' ? (
        <View style={styles.stack}>
          <Text style={styles.body}>{unlockedProjects.length > 0 ? t('Purchase.unlockedFor').replace('{title}', unlockedProjects.map((project) => project.title).join(', ')) : t('Purchase.locked')}</Text>
          {(['pdf', 'quotes', 'handover'] as const).map((row) => (
            <Text key={row} style={styles.body}>
              {t(`Help.ownerRows.${row}`)} — {unlockedProjects.length > 0 ? t('Help.cellYes') : t('Help.cellNo')}
            </Text>
          ))}
          <Text style={styles.fine}>{t('Safety.boundary')}</Text>
          <Text style={styles.fine}>{t('Safety.disclaimerDe')}</Text>
          <Text style={styles.fine}>{t('Safety.disclaimerEn')}</Text>
          <Text style={styles.fine}>{t('Safety.trademark')}</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          <Text style={styles.body}>
            {account?.subscriptionActive ? t('Purchase.capLifted') : account?.installerProfileMissing ? t('Purchase.profileMissing') : t('Purchase.capRemains')}
          </Text>
          <Text style={styles.fine}>{t('Purchase.rankUnchanged')}</Text>
        </View>
      )}
    </View>
  );
}

function ReceiptBlock({ receipt, locale, t }: { receipt: PurchaseReceiptView; locale: Locale; t: Lookup }) {
  return (
    <View style={styles.receipt}>
      <Text style={styles.heading}>{t('Purchase.receiptTitle')}</Text>
      <Text style={styles.body}>
        {t('Purchase.receiptProduct')}: {productLabel(receipt.productKind, t)}
      </Text>
      <Text style={styles.body}>
        {t('Purchase.receiptPrice')}: {formatPrice(receipt.priceMilliunits, receipt.currency, locale)}
      </Text>
      <Text style={styles.body}>
        {t('Purchase.receiptDate')}: {formatWhen(receipt.purchasedAt, locale)}
      </Text>
      <Text style={styles.body}>
        {t('Purchase.receiptTransaction')}: {receipt.transactionId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D2C8', borderRadius: 12, padding: 16 },
  stack: { gap: 8 },
  receipt: { gap: 4, borderTopWidth: 1, borderTopColor: '#D9D2C8', paddingTop: 10 },
  heading: { fontSize: 18, fontWeight: '700', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  fine: { fontSize: 13, lineHeight: 20, color: '#3F3A36' },
  link: { color: '#1C1917', fontWeight: '700', textDecorationLine: 'underline' },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: { fontWeight: '700', color: '#1C1917' },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1C1917'
  },
  primary: { alignSelf: 'flex-start', backgroundColor: '#1C1917', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#F6F3EE', fontWeight: '700' },
  secondary: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  secondaryText: { color: '#1C1917', fontWeight: '600' },
  disabled: { opacity: 0.4 }
});
