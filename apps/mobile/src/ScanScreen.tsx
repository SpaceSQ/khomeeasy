import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ensureAccountRole } from './account-sync';
import { parsePairPayload } from './pair';
import { loadPendingEmail, type AccountRole } from './storage';
import { getMobileSupabase, webOrigin } from './supabase';
import { ModuleHelpLink } from './HelpScreen';

type Lookup = (path: string) => string;

export function ScanScreen({ role, t, onOpenHelp }: { role: AccountRole; t: Lookup; onOpenHelp: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  async function onScan(value: string) {
    if (locked) {
      return;
    }
    const parsed = parsePairPayload(value);
    if (!parsed) {
      setMessageKey('Account.scanInvalid');
      return;
    }
    if (parsed.role !== role) {
      setMessageKey('Account.scanRole');
      return;
    }
    const supabase = getMobileSupabase();
    if (!supabase || !webOrigin) {
      setMessageKey('Account.savedLocal');
      return;
    }
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      const pending = await loadPendingEmail();
      setMessageKey(pending ? 'Account.confirmEmail' : 'Account.scanNeedsAccount');
      return;
    }
    setLocked(true);
    try {
      const roleReady = await ensureAccountRole(supabase, session.user.id, role);
      if (roleReady !== 'ready') {
        setLocked(false);
        setMessageKey(roleReady === 'mismatch' ? 'Account.scanRole' : 'Account.scanFailed');
        return;
      }
      const response = await fetch(`${webOrigin}/api/login-challenges/approve`, {
        method: 'POST',
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
        setLocked(false);
        setMessageKey(response.status === 403 && (error === 'role' || error === 'mismatch') ? 'Account.scanRole' : 'Account.scanFailed');
        return;
      }
      setMessageKey('Account.scanDone');
    } catch {
      setLocked(false);
      setMessageKey('Account.scanFailed');
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.stack}>
        <Text style={styles.title}>{t('Account.scan')}</Text>
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
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          onScan(data).catch(() => setMessageKey('Account.scanFailed'));
        }}
      />
      {messageKey ? <Text style={styles.body}>{t(messageKey)}</Text> : null}
      <ModuleHelpLink label={t('Help.moduleLink')} onPress={onOpenHelp} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  title: { fontSize: 28, fontWeight: '600', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  camera: { height: 320, borderRadius: 12, overflow: 'hidden' },
  primary: { alignSelf: 'flex-start', backgroundColor: '#1C1917', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#F6F3EE', fontWeight: '700' }
});
