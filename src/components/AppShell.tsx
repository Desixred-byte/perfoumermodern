"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

import { Header } from "@/components/Header";
import { ScrollRestoreOnNavigation } from "@/components/ScrollRestoreOnNavigation";
import type { Locale } from "@/lib/i18n";

type AppShellProps = {
  children: React.ReactNode;
  locale: Locale;
};

export function AppShell({ children, locale }: AppShellProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const pendingRestore = sessionStorage.getItem("perfoumer:restore-scroll");
    if (pendingRestore) {
      try {
        const parsed = JSON.parse(pendingRestore) as { targetUrl?: string };
        if (parsed?.targetUrl?.startsWith(pathname)) {
          return;
        }
      } catch {
        sessionStorage.removeItem("perfoumer:restore-scroll");
      }
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <ScrollRestoreOnNavigation />
      <Header floating locale={locale} />
      <div
        key={pathname}
        className={[
          "route-page-enter",
          isHomePage ? "" : "pt-[4.25rem] sm:pt-[5.75rem]",
        ].join(" ")}
      >
        {children}
      </div>
    </>
  );
}
