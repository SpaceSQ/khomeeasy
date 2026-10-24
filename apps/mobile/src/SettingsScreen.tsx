import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ModuleHelpLink } from './HelpScreen';
import { PricingTables } from './PricingTables';
import { PurchasePanel } from './PurchasePanel';
import {
  loadDesigns,
  saveSession,
  signOutApple,
  type AppleSession,
  type AccountRole,
  type LocaleChoice
} from './storage';

type Lookup = (path: string) => string;

function displayName(session: AppleSession, fallback: string): string {
  const name = [session.givenName, session.familyName].filter(Boolean).join(' ');
  return name || session.email || fallback;
}

export function SettingsScreen({
  locale,
  role,
  session,
  t,
  onOpenHelp,
  onOpenAccount,
  onSession,
  onSignedOut,
  onDelete
}: {
  locale: LocaleChoice;
  role: AccountRole;
  session: AppleSession | null;
  t: Lookup;
  onOpenHelp: () => void;
  onOpenAccount: () => void;
  onSession: (session: AppleSession) => void;
  onSignedOut: () => void;
  onDelete: () => void;
}) {
  const [available, setAvailable] = useState(false);
  const [designCount, setDesignCount] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAvailable(false);
      return;
    }
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    loadDesigns().then((designs) => setDesignCount(designs.length)).catch(() => setDesignCount(0));
  }, [session]);

  async function signIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ]
      });
      const next: AppleSession = {
        appleUserId: credential.user,
        email: credential.email,
        givenName: credential.fullName?.givenName ?? session?.givenName ?? null,
        familyName: credential.fullName?.familyName ?? session?.familyName ?? null
      };
      await saveSession(next);
      onSession(next);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      Alert.alert(t('Settings.signInFailed'));
    }
  }

  function confirmDelete() {
    Alert.alert(t('Settings.deleteConfirmTitle'), t('Settings.deleteConfirmBody'), [
      { text: t('Settings.cancel'), style: 'cancel' },
      { text: t('Settings.deleteConfirm'), style: 'destructive', onPress: onDelete }
    ]);
  }

  const countLabel = t('Settings.designCount').replace(
    /\{count, plural, one \{([^}]*)\} other \{([^}]*)\}\}/,
    (_, one: string, other: string) => (designCount === 1 ? one : other)
  ).replaceAll('#', String(designCount));

  return (
    <View style={styles.stack}>
      <Text style={styles.title}>{t('Settings.title')}</Text>
      <Text style={styles.heading}>{t('Settings.accountHeading')}</Text>
      {session ? (
        <Text style={styles.body}>
          {t('Settings.signedInAs').replace('{name}', displayName(session, t('Settings.accountHeading')))}
        </Text>
      ) : (
        <Text style={styles.body}>{t('Settings.signedOut')}</Text>
      )}
      {Platform.OS === 'ios' && available && !session ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={() => {
            signIn().catch(() => Alert.alert(t('Settings.signInFailed')));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && !available ? <Text style={styles.body}>{t('Settings.signInUnavailable')}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={!session}
        style={[styles.button, !session ? styles.buttonDisabled : null]}
        onPress={() => {
          signOutApple()
            .then(onSignedOut)
            .catch(() => undefined);
        }}
      >
        <Text style={styles.buttonText}>{t('Settings.logout')}</Text>
      </Pressable>
      <Text style={styles.body}>{t('Settings.logoutBody')}</Text>

      <Text style={styles.heading}>{t('Account.title')}</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={onOpenAccount}>
        <Text style={styles.buttonText}>{t('Account.profileTitle')}</Text>
      </Pressable>

      <Text style={styles.heading}>{t('Settings.designHeading')}</Text>
      <Text style={styles.body}>{countLabel}</Text>
      <Pressable accessibilityRole="button" style={styles.danger} onPress={confirmDelete}>
        <Text style={styles.dangerText}>{t('Settings.delete')}</Text>
      </Pressable>
      <Text style={styles.body}>{t('Settings.deleteBody')}</Text>
      <Text style={styles.heading}>{t('Help.topics.pricing')}</Text>
      <PurchasePanel role={role} locale={locale} t={t} />
      <Text style={styles.body}>{t('Help.settingsLede')}</Text>
      <PricingTables locale={locale} t={t} />
      <ModuleHelpLink label={t('Help.openHelp')} onPress={onOpenHelp} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  title: { fontSize: 28, fontWeight: '600', color: '#1C1917' },
  heading: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#1C1917' },
  body: { fontSize: 16, lineHeight: 24, color: '#3F3A36' },
  appleButton: { width: '100%', height: 44 },
  button: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#1C1917', fontWeight: '600' },
  danger: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1C1917',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  dangerText: { color: '#1C1917', fontWeight: '700', textDecorationLine: 'underline' }
});
