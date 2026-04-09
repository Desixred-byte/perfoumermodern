"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type ProductCardProps = {
  perfume: Perfume;
  locale?: Locale;
};

export function ProductCard({ perfume, locale = "az" }: ProductCardProps) {
  const startingPrice = perfume.sizes[0]?.price;
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const t = getDictionary(locale);

  const handleCardClick = () => {
    if (typeof window === "undefined") {
      return;
    }

    const sourceUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    sessionStorage.setItem(
      "perfoumer:last-list-context",
      JSON.stringify({
        sourceUrl,
        scrollY: window.scrollY,
        timestamp: Date.now(),
      }),
    );
  };

  return (
    <Link
      href={`/perfumes/${perfume.slug}`}
      onClick={handleCardClick}
      className="product-card group relative block rounded-[1.65rem] bg-white p-2.5 shadow-sm ring-1 ring-zinc-200 sm:rounded-3xl sm:p-4"
    >
      <div className="product-media relative overflow-hidden rounded-[1.2rem] p-2 sm:rounded-2xl sm:p-3">
        <div
          className={[
            "absolute inset-2 rounded-[0.9rem] bg-[linear-gradient(100deg,rgba(255,255,255,0.15)_10%,rgba(255,255,255,0.6)_35%,rgba(255,255,255,0.15)_60%)] bg-[length:220%_100%] transition-opacity duration-500 sm:inset-3 sm:rounded-xl",
            isImageLoaded ? "pointer-events-none opacity-0" : "animate-[catalogImageShimmer_1.3s_ease-in-out_infinite] opacity-100",
          ].join(" ")}
        />
        <div className="relative mx-auto h-40 w-full sm:h-56 lg:h-72">
          <Image
            src={perfume.image}
            alt={perfume.imageAlt || perfume.name}
            fill
            sizes="(max-width: 639px) 44vw, (max-width: 1023px) 42vw, (max-width: 1279px) 28vw, 22vw"
            className={[
              "product-image rounded-[0.9rem] object-contain transition-opacity duration-500 sm:rounded-xl",
              isImageLoaded ? "opacity-100" : "opacity-0",
            ].join(" ")}
            onLoad={() => setIsImageLoaded(true)}
          />
        </div>
      </div>
      <div className="px-1 pt-3 transition-transform duration-300 md:group-hover:-translate-y-0.5 sm:pt-4">
        <h3 className="line-clamp-2 text-base leading-tight font-medium text-zinc-900 transition-colors duration-300 md:group-hover:text-zinc-800 sm:text-xl">
          {perfume.name}
        </h3>
        <p className="mt-1 text-xs text-zinc-500 transition-colors duration-300 md:group-hover:text-zinc-500 sm:text-sm">
          {startingPrice
            ? `${startingPrice} ₼ / ${t.productCard.starting}`
            : t.productCard.quote}
        </p>
      </div>
    </Link>
  );
}
