import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parsePairPayload } from './pair';
import { getMobileSupabase, webOrigin } from './supabase';
import { ModuleHelpLink } from './HelpScreen';
import type { AccountRole } from './storage';

type Lookup = (path: string) => string;

export function ScanScreen({ role, t, onOpenHelp }: { role: AccountRole; t: Lookup; onOpenHelp: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  async function onScan(value: string) {
    if (locked) {
      return;
    }
    const parsed = parsePairPayload(value);
    if (!parsed) {
      setMessage(t('Account.scanInvalid'));
      return;
    }
    if (parsed.role !== role) {
      setMessage(t('Account.scanRole'));
      return;
    }
    const supabase = getMobileSupabase();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!supabase || !session || !webOrigin) {
      setMessage(t('Account.scanNeedsAccount'));
      return;
    }
    setLocked(true);
    const response = await fetch(`${webOrigin}/api/login-challenges/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: parsed.id, secret: parsed.secret })
    });
    setMessage(response.ok ? t('Account.scanDone') : t('Account.scanFailed'));
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
          onScan(data).catch(() => setMessage(t('Account.scanFailed')));
        }}
      />
      {message ? <Text style={styles.body}>{message}</Text> : null}
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
