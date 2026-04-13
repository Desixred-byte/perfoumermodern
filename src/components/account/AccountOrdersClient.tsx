"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

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
  tracking_number?: string;
  created_at: string;
  completed_at?: string;
};

type AccountOrdersClientProps = {
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

export function AccountOrdersClient({ locale, supabase: supabaseConfig }: AccountOrdersClientProps) {
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const copy =
    locale === "az"
      ? {
          title: "Keçmiş sifarişlər",
          emptySubtitle: "Hələ sifarişiniz yoxdur.",
          ctaCatalog: "Kataloqa keç",
          ctaCart: "Səbətə keç",
          orderNumber: "Sifariş №",
          date: "Tarix",
          items: "Məhsullar",
          total: "Cəmi",
          status: "Status",
          payment: "Ödəniş",
          tracking: "Təhvil kodu",
          noTracking: "Henüz təhvil kodu yoxdur",
          statusPending: "Gözləmədə",
          statusProcessing: "İşləyir",
          statusCompleted: "Tamamlandı",
          statusShipped: "Göndərildi",
          statusDelivered: "Çatdırıldı",
          statusCancelled: "Ləğv edildi",
          statusRefunded: "Geri ödəndi",
          paymentPending: "Gözləmədə",
          paymentCompleted: "Ödəndi",
          paymentFailed: "Uğursuz",
          paymentRefunded: "Geri ödəndi",
        }
      : locale === "ru"
        ? {
            title: "История заказов",
            emptySubtitle: "У вас еще нет заказов.",
            ctaCatalog: "Перейти в каталог",
            ctaCart: "Перейти в корзину",
            orderNumber: "Заказ №",
            date: "Дата",
            items: "Товары",
            total: "Итого",
            status: "Статус",
            payment: "Платеж",
            tracking: "Номер отслеживания",
            noTracking: "Номер отслеживания еще недоступен",
            statusPending: "В ожидании",
            statusProcessing: "Обработка",
            statusCompleted: "Завершено",
            statusShipped: "Отправлено",
            statusDelivered: "Доставлено",
            statusCancelled: "Отменено",
            statusRefunded: "Возвращено",
            paymentPending: "В ожидании",
            paymentCompleted: "Оплачено",
            paymentFailed: "Завершилось с ошибкой",
            paymentRefunded: "Возвращено",
          }
        : {
            title: "Past orders",
            emptySubtitle: "You don't have any orders yet.",
            ctaCatalog: "Open catalog",
            ctaCart: "Open cart",
            orderNumber: "Order №",
            date: "Date",
            items: "Items",
            total: "Total",
            status: "Status",
            payment: "Payment",
            tracking: "Tracking",
            noTracking: "Tracking number not available yet",
            statusPending: "Pending",
            statusProcessing: "Processing",
            statusCompleted: "Completed",
            statusShipped: "Shipped",
            statusDelivered: "Delivered",
            statusCancelled: "Cancelled",
            statusRefunded: "Refunded",
            paymentPending: "Pending",
            paymentCompleted: "Paid",
            paymentFailed: "Failed",
            paymentRefunded: "Refunded",
          };

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setError("Supabase is not configured");
        setLoading(false);
        return;
      }

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/profile/orders", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = "Failed to fetch orders";
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = `Error (${response.status}): ${errorData.error}`;
            }
          } catch {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: copy.statusPending,
      processing: copy.statusProcessing,
      completed: copy.statusCompleted,
      shipped: copy.statusShipped,
      delivered: copy.statusDelivered,
      cancelled: copy.statusCancelled,
      refunded: copy.statusRefunded,
    };
    return statusMap[status] || status;
  };

  const getPaymentLabel = (status: string) => {
    const paymentMap: Record<string, string> = {
      pending: copy.paymentPending,
      completed: copy.paymentCompleted,
      failed: copy.paymentFailed,
      refunded: copy.paymentRefunded,
    };
    return paymentMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-yellow-600 bg-yellow-50",
      processing: "text-blue-600 bg-blue-50",
      completed: "text-green-600 bg-green-50",
      shipped: "text-blue-600 bg-blue-50",
      delivered: "text-green-600 bg-green-50",
      cancelled: "text-red-600 bg-red-50",
      refunded: "text-orange-600 bg-orange-50",
    };
    return colors[status] || "text-zinc-600 bg-zinc-50";
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <div className="mt-4 text-sm text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.emptySubtitle}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-red-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-red-700 font-medium">Unable to load orders</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex min-h-9 items-center justify-center rounded-full border border-red-300 bg-white px-4 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
        <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
        <p className="mt-2 text-sm text-zinc-600">{copy.emptySubtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/catalog" className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            {copy.ctaCatalog}
          </Link>
          <Link href="/cart" className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800">
            {copy.ctaCart}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>

      {orders.map((order) => (
        <div key={order.id} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-zinc-900">
                {copy.orderNumber} {order.order_number}
              </h3>
              <p className="text-sm text-zinc-500">{copy.date}: {formatDate(order.created_at)}</p>
            </div>
            <div className="flex flex-col gap-2 text-right">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </div>
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.payment_status)}`}>
                {getPaymentLabel(order.payment_status)}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4">
            <h4 className="mb-3 text-sm font-medium text-zinc-700">{copy.items}</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm text-zinc-600">
                  <span>
                    {item.perfume_name} ({item.size_ml}ML) × {item.quantity}
                  </span>
                  <span>{item.total_price.toFixed(2)} {order.currency}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="flex justify-between text-base font-medium text-zinc-900">
              <span>{copy.total}</span>
              <span>
                {order.total_amount.toFixed(2)} {order.currency}
              </span>
            </div>
          </div>

          {order.tracking_number && (
            <div className="mt-4 border-t border-zinc-200 pt-4">
              <p className="text-sm text-zinc-600">
                {copy.tracking}: <span className="font-medium text-zinc-900">{order.tracking_number}</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
