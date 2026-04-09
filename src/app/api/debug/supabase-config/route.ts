import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

function mask(value: string) {
  if (!value) return "";
  if (value.length <= 10) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function GET() {
  const cfg = getSupabasePublicConfigFromServer();

  return Response.json({
    configured: Boolean(cfg),
    urlPresent: Boolean(cfg?.url),
    keyPresent: Boolean(cfg?.anonKey),
    urlPreview: cfg?.url ? mask(cfg.url) : "",
    keyPreview: cfg?.anonKey ? mask(cfg.anonKey) : "",
    keyPrefix: cfg?.anonKey ? cfg.anonKey.slice(0, 15) : "",
  });
}

