import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ensureAccountRole } from './account-sync';
import { parsePairPayload } from './pair';
import { accessTokenStillValid, approveUrl, shouldRefreshAccessToken } from './scan-session';
import { loadPendingEmail, storageKeys, type AccountRole } from './storage';
import { getMobileSupabase, webOrigin } from './supabase';
import { ModuleHelpLink } from './HelpScreen';

type Lookup = (path: string) => string;

export function ScanScreen({ role, t, onOpenHelp }: { role: AccountRole; t: Lookup; onOpenHelp: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);

  function finish(next: string) {
    heldRef.current = true;
    setHeld(true);
    setMessageKey(next);
  }

  function scanAgain() {
    heldRef.current = false;
    setHeld(false);
    setMessageKey(null);
  }

  async function onScan(value: string) {
    if (heldRef.current) {
      return;
    }
    heldRef.current = true;
    setHeld(true);
    setMessageKey('Account.scanChecking');
    const parsed = parsePairPayload(value);
    if (!parsed) {
      finish('Account.scanInvalid');
      return;
    }
    if (parsed.role !== role) {
      finish('Account.scanRole');
      return;
    }
    const supabase = getMobileSupabase();
    if (!supabase || !webOrigin) {
      finish('Account.savedLocal');
      return;
    }
    const savedAccount = await AsyncStorage.getItem(storageKeys.account);
    const stored = (await supabase.auth.getSession()).data.session;
    let session = stored;
    if (stored && shouldRefreshAccessToken(stored.expires_at, Date.now())) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session ?? (accessTokenStillValid(stored.expires_at, Date.now()) ? stored : null);
    }
    if (!session) {
      const pending = await loadPendingEmail();
      finish(pending ? 'Account.confirmEmail' : savedAccount ? 'Account.scanSignedOut' : 'Account.scanNeedsAccount');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const roleReady = await ensureAccountRole(supabase, session.user.id, role);
      if (roleReady !== 'ready') {
        finish(roleReady === 'mismatch' ? 'Account.scanRole' : 'Account.scanFailed');
        return;
      }
      const response = await fetch(approveUrl(webOrigin), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: parsed.id, secret: parsed.secret })
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const error =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : '';
        if (response.status === 401) {
          finish(savedAccount ? 'Account.scanSignedOut' : 'Account.scanNeedsAccount');
        } else if (response.status === 410 || error === 'expired') {
          finish('Account.scanExpired');
        } else if (response.status === 403 && (error === 'role' || error === 'mismatch')) {
          finish('Account.scanRole');
        } else {
          finish('Account.scanFailed');
        }
        return;
      }
      finish('Account.scanDone');
    } catch {
      finish('Account.scanFailed');
    } finally {
      clearTimeout(timer);
    }
  }

  const scanRef = useRef(onScan);
  scanRef.current = onScan;

  useEffect(() => {
    if (!CameraView.isModernBarcodeScannerAvailable) {
      return undefined;
    }
    const subscription = CameraView.onModernBarcodeScanned((event) => {
      scanRef.current(event.data).catch(() => finish('Account.scanFailed'));
    });
    return () => subscription.remove();
  }, []);

  const message = messageKey ? <Text style={styles.result}>{t(messageKey)}</Text> : null;

  if (!permission?.granted) {
    return (
      <View style={styles.stack}>
        <Text style={styles.title}>{t('Account.scan')}</Text>
        {message}
        <Text style={styles.body}>{t('Account.camera')}</Text>
        <Pressable accessibilityRole="button" style={styles.primary} onPress={() => requestPermission()}>
          <Text style={styles.primaryText}>{t('Account.cameraAllow')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{t('Account.scan')}</Text>
      <Text style={styles.body}>{role === 'installer' ? t('Account.installerScanHelp') : t('Account.ownerScanHelp')}</Text>
      {message}
      {messageKey && messageKey !== 'Account.scanChecking' ? (
        <Pressable accessibilityRole="button" style={styles.primary} onPress={scanAgain}>
          <Text style={styles.primaryText}>{t('Account.scanAgain')}</Text>
        </Pressable>
      ) : CameraView.isModernBarcodeScannerAvailable ? (
        <Pressable
          accessibilityRole="button"
          style={styles.primary}
          onPress={() => {
            CameraView.launchScanner({ barcodeTypes: ['qr'] }).catch(() => finish('Account.scanFailed'));
          }}
        >
          <Text style={styles.primaryText}>{t('Account.scanOpen')}</Text>
        </Pressable>
      ) : null}
      <CameraView
        style={styles.camera}
        facing="back"
        active={!held}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={held ? undefined : ({ data }) => {
          onScan(data).catch(() => finish('Account.scanFailed'));
        }}
      />
      <ModuleHelpLink label={t('Help.moduleLink')} onPress={onOpenHelp} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, gap: 12 },
  title: { fontSize: 28, fontWeight: '600', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  result: { minHeight: 52, fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#1C1917' },
  camera: { flex: 1, minHeight: 240, borderRadius: 12, overflow: 'hidden' },
  primary: { alignSelf: 'flex-start', backgroundColor: '#1C1917', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#F6F3EE', fontWeight: '700' }
});
