import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type OrderItem = {
  perfume_slug: string;
  perfume_name: string;
  size_ml: number;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  items: OrderItem[];
  delivery_address?: Record<string, unknown>;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase config missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Parse and format orders
    const formattedOrders: Order[] = (orders ?? []).map((order: Record<string, unknown>) => ({
      id: String(order.id ?? ""),
      order_number: String(order.order_number ?? ""),
      status: String(order.status ?? "pending"),
      payment_status: String(order.payment_status ?? "pending"),
      total_amount: Number(order.total_amount ?? 0),
      currency: String(order.currency ?? "AZN"),
      items: Array.isArray(order.items_json) ? order.items_json : [],
      delivery_address: order.delivery_address_json as Record<string, unknown> | undefined,
      tracking_number: order.tracking_number ? String(order.tracking_number) : undefined,
      created_at: String(order.created_at ?? ""),
      updated_at: String(order.updated_at ?? ""),
      completed_at: order.completed_at ? String(order.completed_at) : undefined,
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length,
    });
  } catch (error) {
    console.error("Orders API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
