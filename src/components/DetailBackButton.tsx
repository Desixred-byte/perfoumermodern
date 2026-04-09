"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

import { getDictionary, type Locale } from "@/lib/i18n";

type DetailBackButtonProps = {
  locale: Locale;
};

type StoredContext = {
  sourceUrl: string;
  scrollY: number;
  timestamp: number;
};

function getStoredContext(): StoredContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem("perfoumer:last-list-context");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredContext;
    if (!parsed?.sourceUrl || typeof parsed.scrollY !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function DetailBackButton({ locale }: DetailBackButtonProps) {
  const router = useRouter();
  const t = getDictionary(locale);
  const [source, setSource] = useState<StoredContext | null>(null);

  useEffect(() => {
    setSource(getStoredContext());
  }, []);

  const label = useMemo(() => {
    if (!source?.sourceUrl) {
      return t.detail.back;
    }

    if (source.sourceUrl.startsWith("/catalog")) {
      return t.detail.backToCatalog;
    }

    if (source.sourceUrl.startsWith("/")) {
      return t.detail.backToHome;
    }

    return t.detail.back;
  }, [source, t.detail.back, t.detail.backToCatalog, t.detail.backToHome]);

  const onBack = () => {
    const context = getStoredContext();

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (context?.sourceUrl) {
      sessionStorage.setItem(
        "perfoumer:restore-scroll",
        JSON.stringify({
          targetUrl: context.sourceUrl,
          scrollY: context.scrollY,
          timestamp: Date.now(),
        }),
      );
      router.push(context.sourceUrl, { scroll: false });
      return;
    }

    router.push("/catalog");
  };

  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/88 px-4 py-2 text-sm font-medium text-zinc-600 shadow-[0_10px_24px_rgba(24,24,24,0.05)] transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
    >
      <ArrowLeft size={16} weight="bold" />
      {label}
    </button>
  );
}