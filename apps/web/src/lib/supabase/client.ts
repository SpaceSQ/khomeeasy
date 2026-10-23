'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@khomeeasy/shared-types';
import { getSupabasePublicEnv } from './env';

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: BrowserClient | null | undefined;

export function getSupabaseBrowserClient(): BrowserClient | null {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const env = getSupabasePublicEnv();
  browserClient = env ? createBrowserClient<Database>(env.url, env.anonKey) : null;
  return browserClient;
}
