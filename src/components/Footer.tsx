"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type FooterProps = {
  locale: Locale;
};

export function Footer({ locale }: FooterProps) {
  const footerRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const t = getDictionary(locale);

  useEffect(() => {
    let raf = 0;

    const updateProgress = () => {
      raf = 0;
      const footer = footerRef.current;
      if (!footer) return;

      const rect = footer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const start = viewportHeight * 0.92;
      const end = -rect.height * 0.26;
      const next = clamp((start - rect.top) / (start - end), 0, 1);
      setProgress(next);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const wordmarkStyle = {
    transform: `translate3d(0, ${(1 - progress) * 82}px, 0) scale(${0.9 + progress * 0.14})`,
    opacity: 0.2 + progress * 0.8,
    letterSpacing: `${-0.05 + progress * 0.03}em`,
  };

  return (
    <footer id="contact" ref={footerRef} className="mt-16 bg-[#f3f3f2] pb-12 md:mt-20 md:pb-14">
      <div className="mx-auto max-w-[1540px] px-6 md:px-10">
        <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.64)_0%,rgba(245,245,243,0.7)_100%)] shadow-[0_24px_56px_rgba(26,26,26,0.06)] ring-1 ring-zinc-200/45">
          <div className="grid gap-10 px-6 pt-10 md:grid-cols-3 md:gap-8 md:px-10 md:pt-12 xl:px-12">
            <div>
              <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">{t.footer.contact}</p>
              <a
                href="mailto:info@perfoumer.az"
                className="mt-5 block text-base leading-[1.35] font-medium text-zinc-700 transition-colors hover:text-zinc-900"
              >
                info@perfoumer.az
              </a>
              <a
                href="https://wa.me/994000000000"
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 block text-base leading-[1.35] font-medium text-zinc-700 transition-colors hover:text-zinc-900"
              >
                Whatsapp
              </a>
            </div>

            <div>
              <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">{t.footer.pages}</p>
              <nav className="mt-5 flex flex-col gap-2.5 text-base leading-[1.3] text-zinc-600">
                <Link href="/#about" className="transition-colors hover:text-zinc-900">
                  {t.footer.about}
                </Link>
                <Link href="/catalog" className="transition-colors hover:text-zinc-900">
                  {t.footer.products}
                </Link>
                <Link href="/brands" className="transition-colors hover:text-zinc-900">
                  {t.footer.brands}
                </Link>
                <Link href="/" className="transition-colors hover:text-zinc-900">
                  {t.footer.blog}
                </Link>
                <a href="#contact" className="transition-colors hover:text-zinc-900">
                  {t.footer.contactLink}
                </a>
              </nav>
            </div>

            <div>
              <p className="text-[0.88rem] font-medium tracking-[0.06em] text-zinc-500 uppercase">{t.footer.social}</p>
              <div className="mt-5 flex flex-col gap-2.5 text-base leading-[1.3] text-zinc-600">
                <a href="#" className="transition-colors hover:text-zinc-900">
                  Instagram
                </a>
                <a href="#" className="transition-colors hover:text-zinc-900">
                  X Network
                </a>
                <a href="#" className="transition-colors hover:text-zinc-900">
                  Facebook
                </a>
              </div>
              <p className="mt-7 text-sm text-zinc-500">
                © 2026 Bakhishov Brands <span className="mx-2">—</span> Perfoumer.az
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-zinc-200/65 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(248,248,246,0.72)_100%)] px-6 pt-4 md:mt-12 md:px-10 xl:px-12">
            <p className="footer-wordmark footer-wordmark-animated select-none text-zinc-800 will-change-transform" style={wordmarkStyle}>
              PERFOUMER
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
