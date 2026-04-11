"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

type AccountOrdersClientProps = {
  locale: Locale;
};

export function AccountOrdersClient({ locale }: AccountOrdersClientProps) {
  const copy =
    locale === "az"
      ? {
          title: "Keçmiş sifarişlər",
          subtitle: "Sifariş tarixçəsi burada görünəcək. Hazırda bu bölmə hazırlanır.",
          ctaCatalog: "Kataloqa keç",
          ctaCart: "Səbətə keç",
        }
      : locale === "ru"
        ? {
            title: "История заказов",
            subtitle: "Здесь будет отображаться история заказов. Раздел в разработке.",
            ctaCatalog: "Перейти в каталог",
            ctaCart: "Перейти в корзину",
          }
        : {
            title: "Past orders",
            subtitle: "Order history will appear here. This section is currently being prepared.",
            ctaCatalog: "Open catalog",
            ctaCart: "Open cart",
          };

  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-[0_8px_22px_rgba(0,0,0,0.04)] sm:p-6">
      <h1 className="text-[1.35rem] tracking-[-0.02em] text-zinc-900 sm:text-[1.6rem]">{copy.title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{copy.subtitle}</p>
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
