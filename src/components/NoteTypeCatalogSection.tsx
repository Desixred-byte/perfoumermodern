"use client";

import { useEffect, useState } from "react";

import { CatalogClient } from "@/components/CatalogClient";
import type { Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type NoteFilterType = "top" | "heart" | "base";

type NotePageLabels = {
  top: string;
  heart: string;
  base: string;
};

type NoteTypeCatalogSectionProps = {
  locale: Locale;
  perfumes: Perfume[];
  noteSlug: string;
  noteName: string;
  initialType: NoteFilterType;
  labels: NotePageLabels;
};

export function NoteTypeCatalogSection({
  locale,
  perfumes,
  noteSlug,
  noteName,
  initialType,
  labels,
}: NoteTypeCatalogSectionProps) {
  const [noteType, setNoteType] = useState<NoteFilterType>(initialType);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setNoteType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("type", noteType);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [noteType]);

  useEffect(() => {
    if (!isSwitching) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsSwitching(false);
    }, 220);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isSwitching]);

  const switchType = (nextType: NoteFilterType) => {
    if (nextType === noteType) {
      return;
    }

    setIsSwitching(true);
    setNoteType(nextType);
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(labels) as NoteFilterType[]).map((item) => {
          const active = item === noteType;

          return (
            <button
              key={item}
              type="button"
              onClick={() => switchType(item)}
              aria-pressed={active}
              className={[
                "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_10px_22px_rgba(24,24,24,0.18)]"
                  : "border-zinc-200/80 bg-white/90 text-zinc-600 hover:border-zinc-300 hover:bg-white hover:text-zinc-800",
              ].join(" ")}
            >
              {labels[item]}
            </button>
          );
        })}
      </div>

      <div
        className={[
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isSwitching ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
        ].join(" ")}
      >
        <CatalogClient
          perfumes={perfumes}
          locale={locale}
          lockedNoteFilter={{
            slug: noteSlug,
            type: noteType,
            label: noteName,
          }}
        />
      </div>
    </>
  );
}