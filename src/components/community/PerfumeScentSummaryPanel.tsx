"use client";

import { Sparkle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type PerfumeScentSummaryPanelProps = {
  perfumeSlug: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  summarizeScent: string;
  summaryTitle: string;
  summaryDescription: string;
  summaryLoading: string;
  summaryError: string;
  summaryOverviewLabel: string;
  summaryHighlightsLabel: string;
};

const MIN_SUMMARY_LOADING_MS = 1100;

const copyByLocale: Record<Locale, Copy> = {
  az: {
    summarizeScent: "Qoxunu AI ilə qısa izah et",
    summaryTitle: "Qoxu qeydləri",
    summaryDescription: "Ətrin notları, xarakteri və ən uyğun istifadə anları",
    summaryLoading: "Qısa izah hazırlanır...",
    summaryError: "Qısa izah hazır olmadı. Bir az sonra yenidən yoxlayın.",
    summaryOverviewLabel: "Qısa baxış",
    summaryHighlightsLabel: "Əsas məqamlar",
  },
  en: {
    summarizeScent: "Summarize this scent with AI",
    summaryTitle: "Scent summary for you",
    summaryDescription: "Notes, character, and practical wearing context in one view",
    summaryLoading: "Generating summary...",
    summaryError: "Could not generate the summary. Please try again shortly.",
    summaryOverviewLabel: "Quick overview",
    summaryHighlightsLabel: "Key highlights",
  },
  ru: {
    summarizeScent: "Суммировать аромат с AI",
    summaryTitle: "Сводка аромата для вас",
    summaryDescription: "Ноты, характер и практичный контекст ношения в одном блоке",
    summaryLoading: "Формируем сводку...",
    summaryError: "Не удалось создать сводку. Попробуйте еще раз чуть позже.",
    summaryOverviewLabel: "Короткий обзор",
    summaryHighlightsLabel: "Ключевые моменты",
  },
};

export function PerfumeScentSummaryPanel({ perfumeSlug, locale, supabase: supabaseConfig }: PerfumeScentSummaryPanelProps) {
  const copy = copyByLocale[locale];
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [summaryHighlights, setSummaryHighlights] = useState<string[]>([]);
  const [summaryError, setSummaryError] = useState("");

  const formatSummaryParagraphs = (summary: string) => {
    const normalized = summary.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return [] as string[];
    }

    const sentenceChunks = normalized
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (sentenceChunks.length <= 2) {
      return sentenceChunks;
    }

    const midpoint = Math.ceil(sentenceChunks.length / 2);
    return [sentenceChunks.slice(0, midpoint).join(" "), sentenceChunks.slice(midpoint).join(" ")].filter(Boolean);
  };

  const normalizeHighlight = (item: string) => item.replace(/^[-*•\s]+/, "").trim();

  const formatInlineRichText = (text: string): ReactNode[] => {
    const segments = text
      .split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g)
      .map((part) => part.trim())
      .filter(Boolean);

    return segments.map((segment, index) => {
      const isBold =
        (segment.startsWith("**") && segment.endsWith("**")) ||
        (segment.startsWith("__") && segment.endsWith("__"));

      if (isBold) {
        const content = segment.slice(2, -2).trim();
        return (
          <strong key={`rich-${index}`} className="font-semibold text-zinc-900">
            {content}
          </strong>
        );
      }

      const isCode = segment.startsWith("`") && segment.endsWith("`");
      if (isCode) {
        const content = segment.slice(1, -1).trim();
        return (
          <span
            key={`rich-${index}`}
            className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[0.82em] font-medium text-zinc-800"
          >
            {content}
          </span>
        );
      }

      return <span key={`rich-${index}`}>{segment} </span>;
    });
  };

  const renderHighlightText = (item: string) => {
    const normalized = normalizeHighlight(item);
    const labelMatch = normalized.match(/^([^:]{2,36}):\s*(.+)$/);

    if (!labelMatch) {
      return formatInlineRichText(normalized);
    }

    const [, label, value] = labelMatch;
    return (
      <>
        <strong className="font-semibold text-zinc-800">{label}:</strong>{" "}
        {formatInlineRichText(value)}
      </>
    );
  };

  const ensureMinimumLoadingTime = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= MIN_SUMMARY_LOADING_MS) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, MIN_SUMMARY_LOADING_MS - elapsed);
    });
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const summarizeScent = async () => {
    if (!session?.user) {
      return;
    }

    const startedAt = Date.now();
    setIsSummaryLoading(true);
    setSummaryError("");
    setAiSummary("");
    setSummaryHighlights([]);

    try {
      const response = await fetch("/api/perfumes/summary", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: perfumeSlug,
          locale,
        }),
      });

      if (!response.ok) {
        await ensureMinimumLoadingTime(startedAt);
        setSummaryError(copy.summaryError);
        return;
      }

      const data = (await response.json()) as { summary?: string; highlights?: string[] };
      await ensureMinimumLoadingTime(startedAt);
      setAiSummary(typeof data.summary === "string" ? data.summary : "");
      setSummaryHighlights(
        Array.isArray(data.highlights)
          ? data.highlights.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      await ensureMinimumLoadingTime(startedAt);
      setSummaryError(copy.summaryError);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined) || !session?.user) {
    return null;
  }

  return (
    <section className="scent-summary-panel mt-10 rounded-[1.8rem] border border-zinc-200/80 bg-[linear-gradient(140deg,rgba(255,255,255,0.95)_0%,rgba(248,248,246,0.92)_50%,rgba(241,239,235,0.9)_100%)] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.05)] md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            {copy.summaryTitle}
          </p>
          <p className="mt-1 text-sm text-zinc-600">{copy.summaryDescription}</p>
        </div>
        <button
          type="button"
          onClick={summarizeScent}
          disabled={isSummaryLoading}
          className="group relative inline-flex min-h-11 items-center gap-2 overflow-hidden rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-[0_10px_20px_rgba(0,0,0,0.06)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-50 hover:shadow-[0_14px_26px_rgba(0,0,0,0.1)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="pointer-events-none absolute inset-y-0 left-[-28%] w-[34%] -skew-x-12 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.65)_55%,transparent_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:animate-[scentSummaryGlint_780ms_ease-out]" />
          <Sparkle size={16} weight="duotone" className={isSummaryLoading ? "animate-spin" : ""} />
          {isSummaryLoading ? copy.summaryLoading : copy.summarizeScent}
        </button>
      </div>

      {summaryError ? <p className="mt-3 text-sm text-zinc-500">{summaryError}</p> : null}

      {isSummaryLoading ? (
        <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="scent-summary-skeleton h-4 w-10/12 rounded-lg" />
          <div className="scent-summary-skeleton mt-2 h-4 w-9/12 rounded-lg" />
          <div className="scent-summary-skeleton mt-2 h-4 w-8/12 rounded-lg" />
          <div className="mt-4 space-y-2">
            <div className="scent-summary-skeleton h-3 w-7/12 rounded-lg" />
            <div className="scent-summary-skeleton h-3 w-8/12 rounded-lg" />
            <div className="scent-summary-skeleton h-3 w-6/12 rounded-lg" />
          </div>
        </div>
      ) : null}

      {aiSummary ? (
        <div className="summary-reveal mt-4 rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">{copy.summaryOverviewLabel}</p>
          <div className="mt-2 space-y-1.5">
            {formatSummaryParagraphs(aiSummary).map((paragraph, index) => (
              <p key={`${paragraph}-${index}`} className="text-sm leading-6 text-zinc-700">
                {formatInlineRichText(paragraph)}
              </p>
            ))}
          </div>
          {summaryHighlights.length ? (
            <>
              <p className="mt-4 text-[0.65rem] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                {copy.summaryHighlightsLabel}
              </p>
              <ul className="mt-2 space-y-1.5">
              {summaryHighlights.map((item, index) => (
                <li
                  key={item}
                  style={{ animationDelay: `${120 + index * 70}ms` }}
                  className="summary-highlight-reveal flex items-start gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/70 px-3 py-2 text-sm text-zinc-600"
                >
                  <span className="mt-[0.5rem] inline-block h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  <span className="leading-6">{renderHighlightText(item)}</span>
                </li>
              ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
