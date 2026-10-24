import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveWebOrigin } from './web-origin';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const webOrigin = resolveWebOrigin(process.env.EXPO_PUBLIC_WEB_URL);

let client: SupabaseClient | null | undefined;

export function getMobileSupabase(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }
  if (!url || !anonKey) {
    client = null;
    return null;
  }
  client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
  return client;
}
