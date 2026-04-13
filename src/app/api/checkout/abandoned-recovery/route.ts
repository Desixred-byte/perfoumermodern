import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RecoveryItem = {
  perfume_slug?: string;
  perfume_name?: string;
  size_ml?: number;
  quantity?: number;
  line_total?: number;
};

type RecoveryBody = {
  locale?: string;
  source?: "cart" | "checkout";
  recoveryChannel?: "email" | "whatsapp";
  email?: string;
  phone?: string;
  subtotal?: number;
  items?: RecoveryItem[];
};

function normalizePhone(value: string | undefined) {
  return (value || "").replace(/[^\d+]/g, "").trim();
}

function normalizeLocale(value: string | undefined): "az" | "en" | "ru" {
  if (value === "en" || value === "ru") return value;
  return "az";
}

function buildIncentive(locale: "az" | "en" | "ru") {
  if (locale === "en") return "Come back within 24h and get free standard shipping.";
  if (locale === "ru") return "Вернитесь в течение 24 часов и получите бесплатную стандартную доставку.";
  return "24 saat ərzində geri qayıdın və standart çatdırılma pulsuz olsun.";
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const body = (await request.json().catch(() => ({}))) as RecoveryBody;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const items = Array.isArray(body.items)
      ? body.items
          .filter((item) => typeof item === "object" && item !== null)
          .slice(0, 40)
          .map((item) => ({
            perfume_slug: String(item.perfume_slug || "").trim(),
            perfume_name: String(item.perfume_name || "").trim(),
            size_ml: Number(item.size_ml || 0),
            quantity: Number(item.quantity || 0),
            line_total: Number(item.line_total || 0),
          }))
      : [];

    if (!items.length) {
      return NextResponse.json({ error: "No cart items provided" }, { status: 400 });
    }

    const locale = normalizeLocale(body.locale);
    const recoveryChannel = body.recoveryChannel === "whatsapp" ? "whatsapp" : "email";
    const email = String(body.email || user.email || "").trim().toLowerCase();
    const phone = normalizePhone(body.phone);

    if (recoveryChannel === "email" && !email) {
      return NextResponse.json({ error: "Email is required for email recovery" }, { status: 400 });
    }

    if (recoveryChannel === "whatsapp" && !phone) {
      return NextResponse.json({ error: "Phone is required for WhatsApp recovery" }, { status: 400 });
    }

    const subtotal = Number.isFinite(body.subtotal) ? Number(body.subtotal) : 0;
    const recommendations = items
      .slice(0, 2)
      .map((item) => item.perfume_name || item.perfume_slug)
      .filter(Boolean);

    const writeClient = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : authClient;

    const { data, error } = await writeClient
      .from("abandoned_cart_recovery")
      .insert([
        {
          user_id: user.id,
          source: body.source === "checkout" ? "checkout" : "cart",
          locale,
          recovery_channel: recoveryChannel,
          email: email || null,
          phone: phone || null,
          cart_subtotal: subtotal,
          cart_items_json: items,
          recommendations_json: recommendations,
          incentive_text: buildIncentive(locale),
          status: "queued",
          scheduled_for: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      ])
      .select("id,status,scheduled_for")
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to queue recovery: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, queued: data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
