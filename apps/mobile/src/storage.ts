import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKeys = {
  session: 'khomeeasy.session',
  settings: 'khomeeasy.settings',
  designs: 'khomeeasy.designs',
  hiddenExamples: 'khomeeasy.hidden-example-ids',
  account: 'khomeeasy.account'
} as const;

export type LocaleChoice = 'de' | 'en';
export type AccountRole = 'homeowner' | 'installer';

export type AppleSession = {
  appleUserId: string;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
};

export type AppSettings = {
  locale: LocaleChoice;
  role: AccountRole | null;
};

export type HouseDesign = {
  id: string;
  title: string;
  updatedAt: string;
  brief?: unknown;
};

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<AppleSession | null> {
  const value = parseJson<AppleSession>(await AsyncStorage.getItem(storageKeys.session));
  if (!value || typeof value.appleUserId !== 'string') {
    return null;
  }
  return value;
}

export async function saveSession(session: AppleSession): Promise<void> {
  await AsyncStorage.setItem(storageKeys.session, JSON.stringify(session));
}

export async function loadSettings(): Promise<AppSettings | null> {
  const value = parseJson<Partial<AppSettings>>(await AsyncStorage.getItem(storageKeys.settings));
  if (!value || (value.locale !== 'de' && value.locale !== 'en')) {
    return null;
  }
  return {
    locale: value.locale,
    role: value.role === 'homeowner' || value.role === 'installer' ? value.role : null
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(storageKeys.settings, JSON.stringify(settings));
}

export async function loadDesigns(): Promise<HouseDesign[]> {
  const value = parseJson<HouseDesign[]>(await AsyncStorage.getItem(storageKeys.designs));
  return Array.isArray(value) ? value.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string') : [];
}

export async function saveDesign(input: { title: string; brief: unknown }): Promise<HouseDesign> {
  const designs = await loadDesigns();
  const next: HouseDesign = {
    id: `d-${Date.now()}`,
    title: input.title,
    updatedAt: new Date().toISOString(),
    brief: input.brief
  };
  await AsyncStorage.setItem(storageKeys.designs, JSON.stringify([next, ...designs]));
  return next;
}

/** Ends the Apple session in this app. Settings and designs stay. */
export async function signOutApple(): Promise<void> {
  await AsyncStorage.removeItem(storageKeys.session);
}

/** Removes the Apple session and every record this app stored on the device. */
export async function deleteDeviceData(): Promise<void> {
  await AsyncStorage.multiRemove([
    storageKeys.session,
    storageKeys.settings,
    storageKeys.designs,
    storageKeys.hiddenExamples,
    storageKeys.account
  ]);
}
