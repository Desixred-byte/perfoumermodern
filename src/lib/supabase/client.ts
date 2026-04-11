"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

let browserClient: SupabaseClient | null = null;
let browserClientKey: string | null = null;

function resolveConfig(config?: Partial<SupabasePublicConfig>): SupabasePublicConfig | null {
  const url = config?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = config?.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabaseBrowserClient(config?: Partial<SupabasePublicConfig>): SupabaseClient | null {
  const resolved = resolveConfig(config);
  if (!resolved) {
    return null;
  }

  const configKey = `${resolved.url}::${resolved.anonKey}`;
  if (browserClient && browserClientKey === configKey) {
    return browserClient;
  }

  browserClient = createClient(resolved.url, resolved.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      multiTab: false,
    },
  });
  browserClientKey = configKey;

  return browserClient;
}

export function isSupabaseConfigured(config?: Partial<SupabasePublicConfig>) {
  return resolveConfig(config) !== null;
}
