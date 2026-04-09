"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { getDictionary, locales, type Locale } from "@/lib/i18n";

type HeaderProps = {
  floating?: boolean;
  locale: Locale;
};

export function Header({ floating = false, locale }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const t = getDictionary(locale);
  const menuItems = [
    { href: "/", label: t.header.home },
    { href: "/#about", label: t.header.about },
    { href: "/catalog", label: t.header.products },
    { href: "/qoxunu", label: t.header.scentQuiz },
    { href: "/brands", label: t.header.brands },
    { href: "/#contact", label: t.header.contact },
  ];

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const menuTransition =
    "transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const stickTransition =
    "absolute left-1/2 top-1/2 block h-0.5 w-4 -translate-x-1/2 rounded-full bg-zinc-800 opacity-100 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]";

  const updateLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }

    document.cookie = `perfoumer-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setIsMenuOpen(false);
    router.refresh();
  };

  const handleLogoMouseMove = (event: MouseEvent<HTMLSpanElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 14;
    const rotateX = (0.5 - y) * 14;

    target.style.setProperty("--logo-rx", `${rotateX.toFixed(2)}deg`);
    target.style.setProperty("--logo-ry", `${rotateY.toFixed(2)}deg`);
  };

  const handleLogoMouseLeave = (event: MouseEvent<HTMLSpanElement>) => {
    event.currentTarget.style.setProperty("--logo-rx", "0deg");
    event.currentTarget.style.setProperty("--logo-ry", "0deg");
  };

  return (
    <>
      <header
        className={[
          "z-50 w-full opacity-100",
          floating ? "fixed inset-x-0 top-0" : "relative",
        ].join(" ")}
      >
        <div className="mx-auto mt-1 flex max-w-[1540px] items-center justify-between px-3 py-3 sm:px-6 sm:py-6 md:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 text-zinc-800 opacity-100 shadow-sm ring-1 ring-zinc-200/80 sm:gap-3 sm:px-4 sm:py-2"
            onClick={() => setIsMenuOpen(false)}
          >
            <span
              className="header-logo-orb grid h-7 w-7 place-items-center rounded-lg sm:h-9 sm:w-9"
              onMouseMove={handleLogoMouseMove}
              onMouseLeave={handleLogoMouseLeave}
            >
              <Image
                src="/logo.webp"
                alt="Perfoumer"
                width={28}
                height={28}
                className="header-logo-image h-6 w-6 object-contain sm:h-8 sm:w-8"
                priority
              />
            </span>
            <span className="flex flex-col leading-none">
              <span className="brand-wordmark text-[1.45rem] tracking-tight sm:text-3xl">
                Perfoumer
              </span>
              <span className="mt-0.5 text-[0.58rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase sm:text-[0.62rem]">
                {t.header.tagline}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center rounded-full bg-white/92 p-1 shadow-sm ring-1 ring-zinc-200/80 md:flex">
              {locales.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateLocale(item)}
                  className={[
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-300",
                    locale === item
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-500 hover:text-zinc-800",
                  ].join(" ")}
                >
                  {t.languages[item]}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-label={isMenuOpen ? t.header.closeMenu : t.header.openMenu}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="group relative grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-700 opacity-100 shadow-sm ring-1 ring-zinc-200/80 transition-[background-color,box-shadow] duration-300 hover:bg-white hover:shadow-md sm:h-11 sm:w-11"
            >
              <span
                className={[
                  stickTransition,
                  isMenuOpen
                    ? "translate-y-0 rotate-45"
                    : "-translate-y-1 rotate-0 group-hover:-translate-y-[5px] group-hover:w-5",
                ].join(" ")}
              />
              <span
                className={[
                  stickTransition,
                  isMenuOpen
                    ? "translate-y-0 -rotate-45"
                    : "translate-y-1 rotate-0 group-hover:translate-y-[5px] group-hover:w-5",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        className={[
          "fixed inset-0 z-40 origin-top transform-gpu bg-[#f3f3f2]/98 shadow-[0_20px_52px_rgba(16,16,18,0.2)] backdrop-blur-sm",
          menuTransition,
          isMenuOpen
            ? "pointer-events-auto translate-y-0"
            : "pointer-events-none -translate-y-[104%]",
        ].join(" ")}
        aria-hidden={!isMenuOpen}
      >
        <div
        className={[
          "mx-auto h-full max-w-[1540px] px-6 pt-20 md:px-10 md:pt-28",
          menuTransition,
          isMenuOpen ? "translate-y-0" : "-translate-y-2",
        ].join(" ")}
        >
          <div className="mt-2 flex items-center gap-3 md:hidden">
            <p className="text-[0.68rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
              {locale.toUpperCase()}
            </p>
            <div className="flex items-center gap-2">
              {locales.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateLocale(item)}
                  className={[
                    "rounded-full px-2.5 py-1 text-[0.72rem] font-medium tracking-[0.2em] transition-all duration-300",
                    locale === item
                      ? "bg-zinc-900 text-white shadow-[0_8px_18px_rgba(24,24,24,0.16)]"
                      : "border border-transparent text-zinc-500 hover:text-zinc-800",
                  ].join(" ")}
                >
                  {t.languages[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 md:mt-8">
            <nav className="flex w-full flex-col">
              {menuItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  style={{ transitionDelay: isMenuOpen ? `${120 + index * 65}ms` : "0ms" }}
                  className={[
                    "group flex w-full items-center gap-4 py-2 text-[1.95rem] leading-[1.08] font-medium text-zinc-700 sm:text-[3rem] md:py-2.5 md:text-[3.55rem]",
                    menuTransition,
                    isMenuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-4 opacity-0",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  <span className="relative h-px min-w-0 flex-1 overflow-hidden bg-zinc-300/70">
                    <span className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-zinc-500/80 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  </span>
                  <ArrowRight
                    size={30}
                    weight="light"
                    className="shrink-0 translate-x-[-8px] text-zinc-500 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

    </>
  );
}
