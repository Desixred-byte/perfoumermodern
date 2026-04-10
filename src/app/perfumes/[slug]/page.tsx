import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront, User } from "@phosphor-icons/react/dist/ssr";

import { DetailAccordion } from "@/components/DetailAccordion";
import { DetailBackButton } from "@/components/DetailBackButton";
import { Footer } from "@/components/Footer";
import { NoteGroup } from "@/components/NoteGroup";
import { ProductInfoModalButton } from "@/components/ProductInfoModalButton";
import { ProductCard } from "@/components/ProductCard";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { PerfumeCommentsSection } from "@/components/community/PerfumeCommentsSection";
import { PerfumeScentSummaryPanel } from "@/components/community/PerfumeScentSummaryPanel";
import { PerfumeWishlistButton } from "@/components/community/PerfumeWishlistButton";
import { PerfumeHeroCover } from "@/components/perfume/PerfumeHeroCover";
import { getPerfumeBySlug, getPerfumes, getRelatedPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getDictionary } from "@/lib/i18n";
import { absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

type PerfumeDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  return perfumes.map((perfume) => ({ slug: perfume.slug }));
}

export async function generateMetadata({
  params,
}: PerfumeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const perfume = await getPerfumeBySlug(slug);

  if (!perfume) {
    return {
      title: "Məhsul tapılmadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = `/perfumes/${perfume.slug}`;
  const perfumePreviewImage = perfume.image || absoluteUrl("/perfoumerlogo.png");
  return {
    title: `${perfume.name} - ${perfume.brand}`,
    description: `${perfume.brand} ${perfume.name} ətiri: ${perfume.gender} üçün notlar, ölçülər və qiymətlər.`,
    keywords: buildAzeriPageKeywords([
      `${perfume.name} ətri`,
      `${perfume.brand} ətri`,
      `${perfume.brand} parfum`,
      `${perfume.gender} ətri`,
      `${perfume.name} qiyməti`,
      `${perfume.name} notları`,
      "ətir ölçüləri",
      "ətir sifarişi",
    ]),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${perfume.name} - ${perfume.brand}`,
      description: `${perfume.brand} ${perfume.name} ətiri üçün notlar, ölçülər və qiymətlər.`,
      url: absoluteUrl(canonicalPath),
      images: [
        {
          url: perfumePreviewImage,
          alt: perfume.imageAlt || perfume.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${perfume.name} - ${perfume.brand}`,
      description: `${perfume.brand} ${perfume.name} ətiri üçün notlar, ölçülər və qiymətlər.`,
      images: [perfumePreviewImage],
    },
  };
}

export default async function PerfumeDetailPage({
  params,
}: PerfumeDetailPageProps) {
  const whatsappLink = "https://wa.me/994507078070";
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const { slug } = await params;
  const [perfume, relatedPerfumes] = await Promise.all([
    getPerfumeBySlug(slug),
    getRelatedPerfumes(slug),
  ]);

  if (!perfume) notFound();

  const detailSections = [
    {
      title: t.detail.about,
      content: t.detail.aboutText,
    },
    {
      title: t.detail.delivery,
      content: t.detail.deliveryText,
    },
    {
      title: t.detail.returns,
      content: t.detail.returnsText,
    },
  ];

  return (
    <div className="detail-page-enter bg-[#f3f3f2]">
      <ScrollToTopOnMount />
      <div className="mx-auto max-w-[1540px] px-6 md:px-10">
        <div className="grid gap-8 xl:grid-cols-[0.98fr_1fr] xl:gap-12 xl:items-start">
          <div className="self-start xl:sticky xl:top-32">
            <PerfumeHeroCover src={perfume.image} alt={perfume.imageAlt || perfume.name} />
          </div>

          <div className="space-y-6 xl:pt-2">
            <DetailBackButton locale={locale} />

            <p className="flex flex-wrap items-center gap-2 text-[1.05rem] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Storefront size={16} weight="fill" className="text-zinc-500" />
                {t.detail.store}
              </span>
              <span>|</span>
              <Link
                href={`/catalog?brand=${encodeURIComponent(perfume.brand)}`}
                className="transition-colors duration-300 md:hover:text-zinc-800"
              >
                {perfume.brand}
              </Link>
            </p>

            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <h1 className="max-w-3xl text-[3.8rem] leading-[0.94] tracking-[-0.04em] text-zinc-800 md:text-[5.15rem]">
                {perfume.name}
              </h1>

              <PerfumeWishlistButton
                perfumeSlug={perfume.slug}
                locale={locale}
                supabase={supabaseConfig}
              />
            </div>

            <p className="mt-3 flex items-center gap-2 text-lg text-zinc-500">
              <User size={18} weight="fill" className="text-zinc-500" />
              <span>
                {perfume.gender} <span className="text-zinc-400">{t.detail.perfume}</span>
              </span>
            </p>

            <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,249,246,0.94)_100%)] shadow-[0_16px_38px_rgba(24,24,24,0.05)] ring-1 ring-zinc-200/80 md:rounded-[1.9rem] md:shadow-[0_22px_54px_rgba(24,24,24,0.06)]">
              <div className="flex items-center justify-between border-b border-zinc-200/70 px-4 py-3.5 md:px-6 md:py-4">
                <p className="text-[0.78rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                  {t.detail.sizePrice}
                </p>
                <p className="hidden text-sm text-zinc-400 md:block">{t.detail.choose}</p>
              </div>
              {perfume.sizes.length ? (
                perfume.sizes.map((size) => (
                  <div
                    key={size.label}
                    className="group flex items-center gap-3 border-b border-zinc-200/55 px-3.5 py-3.5 last:border-b-0 md:gap-4 md:px-6 md:py-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-white shadow-[0_8px_16px_rgba(24,24,24,0.05)] ring-1 ring-zinc-200/80 md:h-15 md:w-15 md:rounded-[1.1rem] md:shadow-[0_10px_22px_rgba(24,24,24,0.06)]">
                      <Image
                        src={perfume.image}
                        alt={perfume.imageAlt || perfume.name}
                        width={50}
                        height={50}
                        className="h-8 w-8 object-contain transition-transform duration-300 md:h-12 md:w-12 md:group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[1.03rem] tracking-[-0.01em] text-zinc-800 md:text-[1.24rem] md:tracking-[-0.02em]">
                        <span className="font-semibold md:font-medium">{size.ml}</span>
                        <span className="ml-1 text-zinc-500">ml</span>
                      </p>
                      <p className="mt-0.5 text-[0.68rem] tracking-[0.14em] text-zinc-400 uppercase md:text-[0.8rem] md:tracking-[0.18em]">
                        {t.detail.premiumSize}
                      </p>
                    </div>
                    <div className="ml-auto rounded-[0.95rem] border border-zinc-200/80 bg-white/80 px-2.5 py-1.5 text-right shadow-[0_6px_14px_rgba(24,24,24,0.04)] md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
                      <p className="stat-value text-[1.34rem] leading-none tracking-[-0.025em] text-zinc-900 md:text-[2.2rem] md:tracking-[-0.04em]">
                        {size.price}
                        <span className="ml-1 text-[0.78em] text-zinc-700">₼</span>
                      </p>
                      <p className="mt-0.5 text-[0.62rem] tracking-[0.12em] text-zinc-400 uppercase md:mt-1 md:text-[0.74rem] md:tracking-[0.16em]">
                        {t.detail.readyPrice}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-5 text-zinc-500">{t.detail.noPrice}</div>
              )}
            </div>

            <div className="rounded-[1.95rem] bg-white/96 p-6 shadow-[0_20px_54px_rgba(24,24,24,0.05)] ring-1 ring-zinc-200/80 md:p-8">
              <div className="space-y-8">
                <NoteGroup title={t.detail.topNotes} notes={perfume.notes.top} />
                <NoteGroup title={t.detail.heartNotes} notes={perfume.notes.heart} />
                <NoteGroup title={t.detail.baseNotes} notes={perfume.notes.base} />
              </div>
            </div>

            <div className="space-y-6 pb-2">
              <ProductInfoModalButton locale={locale} />

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="#detail-sections"
                  className="detail-cta detail-cta-secondary inline-flex min-h-13 items-center justify-center rounded-full border border-zinc-400 bg-transparent px-6 text-lg font-medium text-zinc-700"
                >
                  {t.detail.more}
                </Link>

                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="detail-cta detail-cta-primary inline-flex min-h-13 items-center justify-center rounded-full bg-[#31302f] px-6 text-lg font-medium text-white"
                >
                  {t.detail.order}
                </a>
              </div>

              <div id="detail-sections">
                <DetailAccordion items={detailSections} />
              </div>
            </div>
          </div>
        </div>

        <PerfumeScentSummaryPanel
          perfumeSlug={perfume.slug}
          locale={locale}
          supabase={supabaseConfig}
        />

        <PerfumeCommentsSection perfumeSlug={perfume.slug} locale={locale} supabase={supabaseConfig} />

        <section className="mt-24">
          <h2 className="text-5xl leading-[0.98] text-zinc-800 md:text-6xl">
            {t.detail.moreProducts}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500 md:text-base">
            {t.detail.moreProductsHint}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {relatedPerfumes.map((item) => (
              <ProductCard key={item.id} perfume={item} locale={locale} />
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Link
              href="/catalog"
              className="inline-flex min-h-13 items-center justify-center rounded-full border border-zinc-400 bg-transparent px-9 text-lg font-medium text-zinc-700 transition md:hover:bg-white/70"
            >
              {t.detail.otherProducts}
            </Link>
          </div>
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
