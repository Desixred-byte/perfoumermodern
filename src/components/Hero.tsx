"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";

type HeroProps = {
  backgroundImage: string;
  locale: Locale;
};

export function Hero({ backgroundImage, locale }: HeroProps) {
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const t = getDictionary(locale);

  useEffect(() => {
    let raf = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateParallax = () => {
      raf = 0;
      const element = backgroundRef.current;
      if (!element) return;

      if (reduceMotion) {
        element.style.transform = "translate3d(0, 0, 0) scale(1)";
        return;
      }

      const section = element.parentElement;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const progress = Math.min(Math.max((viewportHeight - rect.top) / (viewportHeight + rect.height), 0), 1);
      const offset = Math.round((progress - 0.5) * 18);

      element.style.transform = `translate3d(0, ${offset}px, 0) scale(1)`;
    };

    const handleScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, []);

  return (
    <section className="hero-shell relative overflow-hidden rounded-[34px] xl:rounded-[42px]">
      <div
        ref={backgroundRef}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundPosition: "center 68%",
          transform: "translate3d(0, 0, 0) scale(1)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-900/55 via-zinc-900/30 to-zinc-900/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_80%,rgba(214,255,190,0.33),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-[#dcebe5]/52 via-[#dcebe5]/22 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-white/18 via-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[24%] bg-gradient-to-l from-[#d7edf8]/24 via-[#d7edf8]/10 to-transparent xl:block" />
      <div className="pointer-events-none absolute -left-20 bottom-[-22%] h-[78%] w-[45%] rounded-full bg-[#d8efad]/45 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-[6%] hidden h-36 w-36 rounded-full bg-white/45 blur-3xl xl:block" />
      <div className="pointer-events-none absolute -right-16 top-[8%] hidden h-40 w-40 rounded-full bg-white/34 blur-3xl xl:block" />
      <div className="pointer-events-none absolute -right-12 bottom-[12%] hidden h-44 w-44 rounded-full bg-[#d6eef7]/28 blur-3xl xl:block" />

      <div className="relative z-[1] mx-auto flex h-full max-w-[1540px] items-start px-6 py-16 text-white md:px-10 md:py-20 xl:py-24">
        <div className="max-w-[46rem] pt-28 md:pt-32 xl:max-w-[50rem] xl:pt-36">
          <p className="hero-fade-up hero-delay-1 mb-3 text-sm tracking-[0.2em] text-white/80 uppercase">
            {t.hero.eyebrow}
          </p>
          <h1 className="hero-fade-up hero-delay-2 text-5xl leading-[1.02] font-semibold md:text-7xl xl:text-[4.75rem] 2xl:text-[5rem]">
            {t.hero.title}
          </h1>
          <p className="hero-fade-up hero-delay-3 mt-6 max-w-xl text-base text-white/85 md:text-lg">
            {t.hero.description}
          </p>
          <div className="hero-fade-up hero-delay-4 mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              {t.hero.discover}
            </Link>
            <Link
              href="/catalog"
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              {t.hero.viewAll}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
