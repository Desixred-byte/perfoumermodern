import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CreateOrderBody = {
  payment_order_id?: string;
  payment_status?: "pending" | "completed" | "failed" | "refunded";
  total_amount?: number;
  selected_address_id?: string;
  items?: Array<{
    perfume_slug: string;
    perfume_name: string;
    size_ml: number;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
};

function generateOrderNumber() {
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return `ORD-${date}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const body = (await request.json().catch(() => ({}))) as CreateOrderBody;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: "Supabase config missing" }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "No order items provided" }, { status: 400 });
    }

    const totalAmount = Number(body.total_amount ?? 0);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return NextResponse.json({ error: "Invalid total amount" }, { status: 400 });
    }

    const paymentOrderId = typeof body.payment_order_id === "string" ? body.payment_order_id.trim() : "";

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (paymentOrderId) {
      const { data: existing } = await serviceClient
        .from("orders")
        .select("id,order_number")
        .eq("user_id", user.id)
        .eq("kapital_order_id", paymentOrderId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: true, existing: true, order: existing });
      }
    }

    let deliveryAddress: Record<string, unknown> | null = null;
    if (typeof body.selected_address_id === "string" && body.selected_address_id.trim()) {
      const { data: address } = await serviceClient
        .from("checkout_addresses")
        .select("full_name,phone,line1,line2,city,postal_code,country")
        .eq("id", body.selected_address_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (address) {
        deliveryAddress = {
          fullName: address.full_name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          postalCode: address.postal_code,
          country: address.country,
        };
      }
    }

    const paymentStatus = body.payment_status ?? "completed";
    const status = paymentStatus === "completed" ? "processing" : "pending";

    const { data: createdOrder, error: createError } = await serviceClient
      .from("orders")
      .insert([
        {
          user_id: user.id,
          order_number: generateOrderNumber(),
          status,
          payment_method: "kapital_bank",
          payment_status: paymentStatus,
          total_amount: totalAmount,
          currency: "AZN",
          items_json: items,
          delivery_address_json: deliveryAddress,
          kapital_order_id: paymentOrderId || null,
        },
      ])
      .select("id,order_number")
      .single();

    if (createError) {
      console.error("Create order API error:", createError);
      return NextResponse.json({ error: `Failed to create order: ${createError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, existing: false, order: createdOrder });
  } catch (error) {
    console.error("Create order API unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
