import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TrackPayload = {
  sessionId?: string;
  anonymousId?: string;
  userId?: string | null;
  isLoggedIn?: boolean;
  deviceType?: string;
  os?: string;
  browser?: string;
  locale?: string;
  path?: string;
  referrer?: string;
};

function sanitizeText(value: unknown, fallback: string, maxLength = 120): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function toBool(value: unknown): boolean {
  return value === true;
}

export async function POST(request: Request) {
  let body: TrackPayload;
  try {
    body = (await request.json()) as TrackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const sessionId = sanitizeText(body.sessionId, "", 96);
  const anonymousId = sanitizeText(body.anonymousId, "", 96);
  if (!sessionId || !anonymousId) {
    return NextResponse.json({ error: "sessionId and anonymousId are required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
    return NextResponse.json({ error: "Supabase config missing." }, { status: 500 });
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey || supabaseAnonKey || "",
  );

  const payload = {
    session_id: sessionId,
    anonymous_id: anonymousId,
    user_id: sanitizeText(body.userId ?? "", "", 64) || null,
    is_logged_in: toBool(body.isLoggedIn),
    device_type: sanitizeText(body.deviceType, "unknown", 24),
    os: sanitizeText(body.os, "", 48),
    browser: sanitizeText(body.browser, "", 48),
    locale: sanitizeText(body.locale, "az", 10),
    path: sanitizeText(body.path, "/", 180),
    referrer: sanitizeText(body.referrer, "", 500),
  };

  const { data: existing } = await supabase
    .from("website_live_sessions")
    .select("session_id,page_views")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("website_live_sessions")
      .update({
        anonymous_id: payload.anonymous_id,
        user_id: payload.user_id,
        is_logged_in: payload.is_logged_in,
        device_type: payload.device_type,
        os: payload.os,
        browser: payload.browser,
        locale: payload.locale,
        path: payload.path,
        referrer: payload.referrer,
        last_seen: new Date().toISOString(),
        page_views: Number(existing.page_views ?? 0) + 1,
      })
      .eq("session_id", sessionId);
  } else {
    await supabase
      .from("website_live_sessions")
      .insert([
        {
          ...payload,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          page_views: 1,
        },
      ]);
  }

  await supabase
    .from("website_analytics_events")
    .insert([
      {
        ...payload,
      },
    ]);

  return NextResponse.json({ ok: true }, { status: 200 });
}
