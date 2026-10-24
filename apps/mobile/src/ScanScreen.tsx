import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ensureAccountRole } from './account-sync';
import { parsePairPayload } from './pair';
import { loadPendingEmail, storageKeys, type AccountRole } from './storage';
import { getMobileSupabase, webOrigin } from './supabase';
import { ModuleHelpLink } from './HelpScreen';

type Lookup = (path: string) => string;

export function ScanScreen({ role, t, onOpenHelp }: { role: AccountRole; t: Lookup; onOpenHelp: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  async function onScan(value: string) {
    if (lockedRef.current) {
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    setMessageKey('Account.scanChecking');
    let succeeded = false;
    const parsed = parsePairPayload(value);
    if (!parsed) {
      setMessageKey('Account.scanInvalid');
      lockedRef.current = false;
      setLocked(false);
      return;
    }
    if (parsed.role !== role) {
      setMessageKey('Account.scanRole');
      lockedRef.current = false;
      setLocked(false);
      return;
    }
    const supabase = getMobileSupabase();
    if (!supabase || !webOrigin) {
      setMessageKey('Account.savedLocal');
      lockedRef.current = false;
      setLocked(false);
      return;
    }
    const savedAccount = await AsyncStorage.getItem(storageKeys.account);
    let session = (await supabase.auth.getSession()).data.session;
    if (!session || (session.expires_at ?? 0) * 1000 < Date.now() + 60_000) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
    }
    if (!session) {
      const pending = await loadPendingEmail();
      setMessageKey(pending ? 'Account.confirmEmail' : savedAccount ? 'Account.scanSignedOut' : 'Account.scanNeedsAccount');
      lockedRef.current = false;
      setLocked(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const roleReady = await ensureAccountRole(supabase, session.user.id, role);
      if (roleReady !== 'ready') {
        setMessageKey(roleReady === 'mismatch' ? 'Account.scanRole' : 'Account.scanFailed');
        return;
      }
      const response = await fetch(`${webOrigin}/api/login-challenges/approve`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: parsed.id, secret: parsed.secret })
      });
      if (response.status === 401) {
        const refreshed = await supabase.auth.refreshSession();
        if (!refreshed.data.session) {
          setMessageKey(savedAccount ? 'Account.scanSignedOut' : 'Account.scanNeedsAccount');
          return;
        }
        const retry = await fetch(`${webOrigin}/api/login-challenges/approve`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${refreshed.data.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: parsed.id, secret: parsed.secret })
        });
        if (retry.ok) {
          succeeded = true;
          setMessageKey('Account.scanDone');
          return;
        }
        setMessageKey(retry.status === 410 ? 'Account.scanExpired' : 'Account.scanFailed');
        return;
      }
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const error =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : '';
        if (response.status === 410 || error === 'expired') {
          setMessageKey('Account.scanExpired');
        } else if (response.status === 403 && (error === 'role' || error === 'mismatch')) {
          setMessageKey('Account.scanRole');
        } else {
          setMessageKey('Account.scanFailed');
        }
        return;
      }
      succeeded = true;
      setMessageKey('Account.scanDone');
    } catch {
      setMessageKey('Account.scanFailed');
    } finally {
      clearTimeout(timer);
      if (!succeeded) {
        lockedRef.current = false;
        setLocked(false);
      }
    }
  }

  const scanRef = useRef(onScan);
  scanRef.current = onScan;

  useEffect(() => {
    if (!CameraView.isModernBarcodeScannerAvailable) {
      return undefined;
    }
    const subscription = CameraView.onModernBarcodeScanned((event) => {
      scanRef.current(event.data).catch(() => setMessageKey('Account.scanFailed'));
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
      {CameraView.isModernBarcodeScannerAvailable ? (
        <Pressable
          accessibilityRole="button"
          style={styles.primary}
          disabled={locked}
          onPress={() => {
            CameraView.launchScanner({ barcodeTypes: ['qr'] }).catch(() => setMessageKey('Account.scanFailed'));
          }}
        >
          <Text style={styles.primaryText}>{t('Account.scanOpen')}</Text>
        </Pressable>
      ) : null}
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          onScan(data).catch(() => setMessageKey('Account.scanFailed'));
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
  result: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#1C1917' },
  camera: { flex: 1, minHeight: 240, borderRadius: 12, overflow: 'hidden' },
  primary: { alignSelf: 'flex-start', backgroundColor: '#1C1917', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#F6F3EE', fontWeight: '700' }
});
