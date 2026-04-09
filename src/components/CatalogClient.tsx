"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  MagnifyingGlass,
  SlidersHorizontal,
  Sparkle,
  X,
} from "@phosphor-icons/react";

import { formatMessage, getDictionary, type Locale } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import type { Perfume } from "@/types/catalog";

type NoteFilterType = "top" | "heart" | "base";

type LockedNoteFilter = {
  slug: string;
  type: NoteFilterType;
  label: string;
};

type CatalogClientProps = {
  perfumes: Perfume[];
  lockedNoteFilter?: LockedNoteFilter;
  initialBrand?: string;
  locale: Locale;
};

type FilterOption = {
  value: string;
  label: string;
};

type ActiveChip = {
  key: string;
  label: string;
  onClear: () => void;
  icon?: ReactNode;
};

const PAGE_SIZE = 8;

function getStartingPrice(perfume: Perfume) {
  return perfume.sizes[0]?.price ?? Number.POSITIVE_INFINITY;
}

function toNoteLabel(slug: string) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function PillButton({
  active,
  children,
  onClick,
  className = "",
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
        active
          ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_24px_rgba(24,24,24,0.16)]"
          : "border-zinc-200/80 bg-white/85 text-zinc-600 hover:border-zinc-300 hover:bg-white hover:text-zinc-900",
        className,
      ].join(" ")}
    >
      {active ? <Check size={12} weight="bold" className="shrink-0" /> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] border border-zinc-200/80 bg-white/72 p-4 shadow-[0_14px_34px_rgba(24,24,24,0.05)] backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.66rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
            {title}
          </p>
          {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OptionCluster({
  options,
  value,
  onChange,
  itemClassName = "",
  gridClassName = "flex flex-wrap gap-2",
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  itemClassName?: string;
  gridClassName?: string;
}) {
  return (
    <div className={gridClassName}>
      {options.map((option) => (
        <PillButton
          key={option.value}
          active={option.value === value}
          onClick={() => onChange(option.value)}
          className={itemClassName}
        >
          {option.label}
        </PillButton>
      ))}
    </div>
  );
}

export function CatalogClient({
  perfumes,
  lockedNoteFilter,
  initialBrand = "all",
  locale,
}: CatalogClientProps) {
  const t = getDictionary(locale);
  const [query, setQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedTopNote, setSelectedTopNote] = useState(
    lockedNoteFilter?.type === "top" ? lockedNoteFilter.slug : "all",
  );
  const [selectedHeartNote, setSelectedHeartNote] = useState(
    lockedNoteFilter?.type === "heart" ? lockedNoteFilter.slug : "all",
  );
  const [selectedBaseNote, setSelectedBaseNote] = useState(
    lockedNoteFilter?.type === "base" ? lockedNoteFilter.slug : "all",
  );
  const [sortBy, setSortBy] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const refreshTimerRef = useRef<number | null>(null);

  const lockedTopNote = lockedNoteFilter?.type === "top" ? lockedNoteFilter.slug : "all";
  const lockedHeartNote = lockedNoteFilter?.type === "heart" ? lockedNoteFilter.slug : "all";
  const lockedBaseNote = lockedNoteFilter?.type === "base" ? lockedNoteFilter.slug : "all";

  const triggerRefresh = () => {
    setVisibleCount(PAGE_SIZE);
    setIsRefreshing(true);

    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 260);
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    triggerRefresh();
  };

  const updateGender = (value: string) => {
    startTransition(() => setSelectedGender(value));
    triggerRefresh();
  };

  const updateBrand = (value: string) => {
    startTransition(() => setSelectedBrand(value));
    triggerRefresh();
  };

  const updateTopNote = (value: string) => {
    startTransition(() => setSelectedTopNote(value));
    triggerRefresh();
  };

  const updateHeartNote = (value: string) => {
    startTransition(() => setSelectedHeartNote(value));
    triggerRefresh();
  };

  const updateBaseNote = (value: string) => {
    startTransition(() => setSelectedBaseNote(value));
    triggerRefresh();
  };

  const updateSortBy = (value: string) => {
    startTransition(() => setSortBy(value));
    triggerRefresh();
  };

  const resetFilters = () => {
    setQuery("");
    startTransition(() => {
      setSelectedGender("all");
      setSelectedBrand(initialBrand);
      setSelectedTopNote(lockedTopNote);
      setSelectedHeartNote(lockedHeartNote);
      setSelectedBaseNote(lockedBaseNote);
      setSortBy("featured");
    });
    triggerRefresh();
  };

  const genders = useMemo(() => {
    const unique = new Set(perfumes.map((item) => item.gender.trim()).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [perfumes]);

  const brands = useMemo(() => {
    const unique = new Set(perfumes.map((item) => item.brand.trim()).filter(Boolean));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [perfumes]);

  const topNotes = useMemo(() => {
    const unique = new Set(perfumes.flatMap((item) => item.noteSlugs.top));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [perfumes]);

  const heartNotes = useMemo(() => {
    const unique = new Set(perfumes.flatMap((item) => item.noteSlugs.heart));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [perfumes]);

  const baseNotes = useMemo(() => {
    const unique = new Set(perfumes.flatMap((item) => item.noteSlugs.base));
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [perfumes]);

  const sortOptions = useMemo<FilterOption[]>(
    () => [
      { value: "featured", label: t.catalog.featured },
      { value: "name", label: t.catalog.nameAsc },
      { value: "price-asc", label: t.catalog.priceAsc },
      { value: "price-desc", label: t.catalog.priceDesc },
    ],
    [t.catalog.featured, t.catalog.nameAsc, t.catalog.priceAsc, t.catalog.priceDesc],
  );

  const filteredPerfumes = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const filtered = perfumes.filter((perfume) => {
      const matchesQuery =
        !normalizedQuery ||
        perfume.name.toLowerCase().includes(normalizedQuery) ||
        perfume.brand.toLowerCase().includes(normalizedQuery);

      const matchesGender =
        selectedGender === "all" ||
        perfume.gender.toLowerCase() === selectedGender.toLowerCase();

      const matchesBrand =
        selectedBrand === "all" || perfume.brand.toLowerCase() === selectedBrand.toLowerCase();

      const matchesTopNote =
        selectedTopNote === "all" || perfume.noteSlugs.top.includes(selectedTopNote);

      const matchesHeartNote =
        selectedHeartNote === "all" || perfume.noteSlugs.heart.includes(selectedHeartNote);

      const matchesBaseNote =
        selectedBaseNote === "all" || perfume.noteSlugs.base.includes(selectedBaseNote);

      return (
        matchesQuery &&
        matchesGender &&
        matchesBrand &&
        matchesTopNote &&
        matchesHeartNote &&
        matchesBaseNote
      );
    });

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sortBy === "price-asc") {
      filtered.sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
    }

    if (sortBy === "price-desc") {
      filtered.sort((a, b) => getStartingPrice(b) - getStartingPrice(a));
    }

    return filtered;
  }, [
    perfumes,
    deferredQuery,
    selectedBaseNote,
    selectedBrand,
    selectedGender,
    selectedHeartNote,
    selectedTopNote,
    sortBy,
  ]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isFiltersPanelOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFiltersPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFiltersPanelOpen]);

  const visiblePerfumes = filteredPerfumes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPerfumes.length;
  const hasSearchQuery = query.trim().length > 0;
  const activeFilterCount = [
    query.trim() !== "",
    selectedGender !== "all",
    selectedBrand !== initialBrand,
    selectedTopNote !== lockedTopNote,
    selectedHeartNote !== lockedHeartNote,
    selectedBaseNote !== lockedBaseNote,
    sortBy !== "featured",
  ].filter(Boolean).length;

  const activeChips: ActiveChip[] = [
    query.trim()
      ? {
          key: "query",
          label: query.trim(),
          onClear: () => updateQuery(""),
          icon: <MagnifyingGlass size={12} weight="bold" />,
        }
      : null,
    selectedGender !== "all"
      ? {
          key: "gender",
          label: selectedGender,
          onClear: () => updateGender("all"),
        }
      : null,
    selectedBrand !== initialBrand
      ? {
          key: "brand",
          label: selectedBrand,
          onClear: () => updateBrand(initialBrand),
        }
      : null,
    selectedTopNote !== lockedTopNote
      ? {
          key: "top",
          label: toNoteLabel(selectedTopNote),
          onClear: () => updateTopNote(lockedTopNote),
        }
      : null,
    selectedHeartNote !== lockedHeartNote
      ? {
          key: "heart",
          label: toNoteLabel(selectedHeartNote),
          onClear: () => updateHeartNote(lockedHeartNote),
        }
      : null,
    selectedBaseNote !== lockedBaseNote
      ? {
          key: "base",
          label: toNoteLabel(selectedBaseNote),
          onClear: () => updateBaseNote(lockedBaseNote),
        }
      : null,
    sortBy !== "featured"
      ? {
          key: "sort",
          label:
            sortOptions.find((option) => option.value === sortBy)?.label ?? t.catalog.featured,
          onClear: () => updateSortBy("featured"),
        }
      : null,
  ].filter(Boolean) as ActiveChip[];

  const panelDescription = lockedNoteFilter
    ? formatMessage(t.catalog.noteDiscovery, { note: lockedNoteFilter.label })
    : t.catalog.signature;

  return (
    <>
      <section className="relative z-30 mt-8 overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(250,249,246,0.84)_100%)] p-4 shadow-[0_18px_50px_rgba(26,26,26,0.06)] backdrop-blur-sm sm:p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-zinc-900 text-white shadow-[0_12px_24px_rgba(24,24,24,0.18)]">
                <SlidersHorizontal size={18} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-[0.66rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                  {t.catalog.filters}
                </p>
                <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
                  {panelDescription}
                </p>
              </div>
            </div>

            {activeFilterCount > 0 ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-sm text-zinc-500 shadow-[0_8px_20px_rgba(24,24,24,0.04)]">
                <Sparkle size={14} weight="fill" className="text-zinc-400" />
                {formatMessage(t.catalog.activeChoices, { count: activeFilterCount })}
              </div>
            ) : null}
          </div>

          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-[0_10px_24px_rgba(24,24,24,0.06)] lg:self-auto"
            >
              <X size={14} weight="bold" />
              {t.catalog.reset}
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="flex items-center gap-3 rounded-[1.5rem] border border-zinc-200/75 bg-white/88 px-4 py-3 shadow-[0_12px_28px_rgba(24,24,24,0.05)] transition-all duration-300 focus-within:border-zinc-300 focus-within:shadow-[0_16px_34px_rgba(24,24,24,0.07)]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-zinc-50 text-zinc-500">
              <MagnifyingGlass size={18} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="mt-0.5 w-full bg-transparent text-[1rem] text-zinc-800 outline-none placeholder:text-zinc-400"
              />
            </div>
            {query ? (
              <button
                type="button"
                onClick={() => updateQuery("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800"
                aria-label={t.catalog.reset}
              >
                <X size={13} weight="bold" />
              </button>
            ) : null}
          </label>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="inline-flex items-center rounded-full border border-zinc-200/80 bg-white/88 p-1 shadow-[0_10px_24px_rgba(24,24,24,0.04)] backdrop-blur-sm">
              {genders.map((gender) => {
                const active = selectedGender === gender;

                return (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => updateGender(gender)}
                    aria-pressed={active}
                    className={[
                      "rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-300 sm:px-4",
                      active
                        ? "bg-zinc-900 text-white shadow-[0_10px_22px_rgba(24,24,24,0.16)]"
                        : "text-zinc-500 hover:text-zinc-900",
                    ].join(" ")}
                  >
                    {gender === "all" ? t.catalog.all : gender}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-expanded={isFiltersPanelOpen}
              aria-controls="catalog-advanced-filters"
              onClick={() => setIsFiltersPanelOpen((open) => !open)}
              className="inline-flex items-center gap-3 rounded-full border border-zinc-200/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-[0_10px_24px_rgba(24,24,24,0.04)] transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-[0_14px_28px_rgba(24,24,24,0.07)]"
            >
              <SlidersHorizontal size={15} weight="bold" />
              <span>{t.catalog.refine}</span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-2 text-[0.72rem] font-medium text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[0.62rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
              {formatMessage(t.catalog.activeChoices, { count: activeFilterCount })}
            </span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onClear}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-3 py-2 text-sm text-zinc-600 shadow-[0_8px_18px_rgba(24,24,24,0.04)] transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
              >
                {chip.icon ? <span className="text-zinc-400">{chip.icon}</span> : null}
                <span className="max-w-[10rem] truncate sm:max-w-[14rem]">{chip.label}</span>
                <X size={12} weight="bold" className="shrink-0 text-zinc-400" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="relative z-10 mt-6 flex flex-col gap-1 px-1 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        {hasSearchQuery ? (
          <p>{formatMessage(t.catalog.found, { count: filteredPerfumes.length })}</p>
        ) : (
          <span aria-hidden="true" />
        )}
        {hasMore ? <p className="sm:text-right">{t.catalog.clickMore}</p> : null}
      </div>

      <section
        className={[
          "relative z-10 mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:gap-5",
          isRefreshing ? "opacity-95" : "opacity-100",
        ].join(" ")}
      >
        {visiblePerfumes.map((perfume, index) => (
          <div
            key={perfume.id}
            className="catalog-card-reveal"
            style={{ animationDelay: `${Math.min(index, 12) * 42}ms` }}
          >
            <ProductCard perfume={perfume} locale={locale} />
          </div>
        ))}
      </section>

      {hasMore ? (
        <div className="mt-8 flex justify-center sm:mt-10">
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                setVisibleCount((prev) => prev + PAGE_SIZE);
              })
            }
            className="catalog-load-more rounded-full border border-zinc-300/90 bg-white/80 px-6 py-3 text-sm font-medium text-zinc-700 shadow-[0_10px_24px_rgba(24,24,24,0.05)] transition-all duration-300 hover:border-zinc-400 hover:bg-white hover:text-zinc-900 hover:shadow-[0_14px_28px_rgba(24,24,24,0.08)] sm:px-8 sm:text-base"
          >
            {t.catalog.loadMore}
          </button>
        </div>
      ) : null}

      {!filteredPerfumes.length ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 bg-white/65 px-6 py-14 text-center text-zinc-500 shadow-[0_16px_34px_rgba(24,24,24,0.04)]">
          {t.catalog.noResults}
        </div>
      ) : null}

      {isPortalReady
        ? createPortal(
            <div
              className={[
                "fixed inset-0 z-[90] overflow-hidden transition-opacity duration-500",
                isFiltersPanelOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0",
              ].join(" ")}
              aria-hidden={!isFiltersPanelOpen}
            >
              <div
                aria-hidden="true"
                className={[
                  "absolute inset-0 z-0 transition-all duration-500",
                  isFiltersPanelOpen
                    ? "bg-zinc-950/28 opacity-100 backdrop-blur-[3px]"
                    : "bg-zinc-950/0 opacity-0 backdrop-blur-0",
                ].join(" ")}
              />

              <div
                className="absolute inset-0 z-10 flex items-end justify-center lg:items-center lg:p-6"
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setIsFiltersPanelOpen(false);
                  }
                }}
              >
                <aside
                  id="catalog-advanced-filters"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t.catalog.filters}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={[
                    "flex w-full flex-col overflow-hidden border border-zinc-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,249,247,0.92)_100%)] backdrop-blur-xl",
                    "max-h-[calc(100dvh-0.45rem)] rounded-t-[1.7rem] rounded-b-none border-x-0 border-b-0",
                    "lg:max-h-[calc(100vh-3rem)] lg:max-w-6xl lg:rounded-[2rem] lg:border",
                    "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                    "shadow-[0_-24px_70px_rgba(15,15,15,0.18)] lg:shadow-[0_26px_70px_rgba(15,15,15,0.2)]",
                    isFiltersPanelOpen
                      ? "translate-y-0 scale-100 opacity-100"
                      : "translate-y-16 scale-[0.998] opacity-0 lg:translate-y-4 lg:scale-[0.972]",
                  ].join(" ")}
                >
            <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-zinc-200/80 lg:hidden" />

            <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 px-5 pb-4 pt-4 sm:px-6">
              <div>
                <p className="text-[0.62rem] font-medium tracking-[0.26em] text-zinc-400 uppercase">
                  {t.catalog.filters}
                </p>
                <h3 className="mt-2 text-lg font-medium text-zinc-900 sm:text-xl">
                  {t.catalog.refine}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-zinc-500">{panelDescription}</p>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    <X size={14} weight="bold" />
                    {t.catalog.reset}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsFiltersPanelOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 transition-all duration-300 hover:border-zinc-300 hover:text-zinc-900"
                  aria-label={t.catalog.close}
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:px-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <SectionShell title={t.catalog.brand} description={t.catalog.allBrands}>
                  <OptionCluster
                    options={brands.map((brand) => ({
                      value: brand,
                      label: brand === "all" ? t.catalog.allBrands : brand,
                    }))}
                    value={selectedBrand}
                    onChange={updateBrand}
                    gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1"
                  />
                </SectionShell>

                <SectionShell title={t.catalog.sort} description={t.catalog.featured}>
                  <OptionCluster
                    options={sortOptions}
                    value={sortBy}
                    onChange={updateSortBy}
                    gridClassName="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    itemClassName="justify-start px-4 py-3"
                  />
                </SectionShell>
              </div>

              <div className="mt-4 rounded-[1.6rem] border border-zinc-200/80 bg-white/72 p-4 shadow-[0_14px_34px_rgba(24,24,24,0.05)] backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.66rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                      {t.catalog.signature}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {lockedNoteFilter
                        ? formatMessage(t.catalog.noteDiscovery, {
                            note: lockedNoteFilter.label,
                          })
                        : t.catalog.signature}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {lockedNoteFilter?.type !== "top" ? (
                    <SectionShell title={t.catalog.topNote} description={t.catalog.topNotes}>
                      <OptionCluster
                        options={topNotes.map((note) => ({
                          value: note,
                          label: note === "all" ? t.catalog.topNotes : toNoteLabel(note),
                        }))}
                        value={selectedTopNote}
                        onChange={updateTopNote}
                        gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1"
                      />
                    </SectionShell>
                  ) : null}

                  {lockedNoteFilter?.type !== "heart" ? (
                    <SectionShell title={t.catalog.heartNote} description={t.catalog.heartNotes}>
                      <OptionCluster
                        options={heartNotes.map((note) => ({
                          value: note,
                          label: note === "all" ? t.catalog.heartNotes : toNoteLabel(note),
                        }))}
                        value={selectedHeartNote}
                        onChange={updateHeartNote}
                        gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1"
                      />
                    </SectionShell>
                  ) : null}

                  {lockedNoteFilter?.type !== "base" ? (
                    <SectionShell title={t.catalog.baseNote} description={t.catalog.baseNotes}>
                      <OptionCluster
                        options={baseNotes.map((note) => ({
                          value: note,
                          label: note === "all" ? t.catalog.baseNotes : toNoteLabel(note),
                        }))}
                        value={selectedBaseNote}
                        onChange={updateBaseNote}
                        gridClassName="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1"
                      />
                    </SectionShell>
                  ) : null}
                </div>
              </div>
            </div>
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}