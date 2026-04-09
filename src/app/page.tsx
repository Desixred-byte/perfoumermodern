import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { getFeaturedPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";

export default async function Home() {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const featured = await getFeaturedPerfumes();
  const stats = [
    { value: "98%", ...t.home.stats[0] },
    { value: "900+", ...t.home.stats[1] },
    { value: "15k+", ...t.home.stats[2] },
    { value: "4.9/5", ...t.home.stats[3] },
  ];

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-5 md:px-10 md:pt-4 md:pb-6 xl:max-w-none xl:px-6 xl:pt-4 xl:pb-6">
        <Hero locale={locale} />
      </div>

      <main id="products" className="mx-auto mt-10 max-w-[1540px] px-6 md:px-10">
        <section className="text-center">
          <p className="text-sm text-zinc-500">{t.home.bestSelling}</p>
          <h2 className="mx-auto mt-2 max-w-[14ch] text-5xl leading-[1.05] font-semibold text-zinc-800 md:text-6xl">
            {t.home.selectedTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            {t.home.selectedDescription}
          </p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {featured.map((perfume) => (
            <ProductCard key={perfume.id} perfume={perfume} locale={locale} />
          ))}
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            href="/catalog"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-zinc-400 bg-transparent px-8 text-base font-medium text-zinc-700 transition-all duration-300 hover:bg-white/75 hover:shadow-[0_8px_24px_rgba(31,31,31,0.08)]"
          >
            {t.home.showMore}
          </Link>
        </div>

        <section id="about" className="mt-20 pb-8 md:mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm text-zinc-500">{t.home.statsEyebrow}</p>
            <h2 className="mt-3 text-5xl leading-[0.95] tracking-[-0.02em] font-medium text-zinc-800 md:text-[4.9rem]">
              {t.home.statsTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-500">
              {t.home.statsDescription}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            {stats.map((stat) => (
              <article
                key={stat.title}
                className="flex min-h-[320px] flex-col rounded-[1.85rem] bg-white/45 p-6 shadow-[0_8px_30px_rgba(31,31,31,0.03)] ring-1 ring-white/70"
              >
                <p className="text-[1.05rem] font-medium text-zinc-700">{stat.title}</p>
                <p className="stat-value mt-8 text-[4.9rem] leading-[0.94] tracking-[-0.03em] text-zinc-800 md:text-[5.4rem]">
                  {stat.value}
                </p>
                <p className="mt-auto pt-6 text-[0.98rem] leading-[1.28] text-zinc-500 md:text-[1.02rem]">
                  {stat.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
