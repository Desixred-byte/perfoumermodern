"use client";

import { useEffect, useState } from "react";
import { Info, X } from "@phosphor-icons/react";
import { getDictionary, type Locale } from "@/lib/i18n";

type ProductInfoModalButtonProps = {
  locale: Locale;
};

export function ProductInfoModalButton({ locale }: ProductInfoModalButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const t = getDictionary(locale);

  const openModal = () => {
    setIsMounted(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const closeModal = () => {
    setIsVisible(false);
    window.setTimeout(() => {
      setIsMounted(false);
    }, 220);
  };

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMounted]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="mx-auto flex items-center justify-center gap-2 text-center text-[1.05rem] text-zinc-500 transition-colors duration-300 hover:text-zinc-800"
      >
        <Info size={18} weight="fill" className="text-current" />
        {t.modal.title}
      </button>

      {isMounted ? (
        <div
          className={[
            "fixed inset-0 z-[70] flex items-end justify-center px-3 py-4 transition-all duration-200 sm:items-center sm:px-4",
            isVisible
              ? "bg-[#f3f3f2]/62 backdrop-blur-sm"
              : "bg-[#f3f3f2]/0 backdrop-blur-none",
          ].join(" ")}
          onClick={closeModal}
        >
          <div
            className={[
              "w-full max-w-md rounded-[1.8rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,247,245,0.94)_100%)] p-5 shadow-[0_28px_70px_rgba(24,24,24,0.16)] ring-1 ring-zinc-200/80 transition-all duration-220 sm:rounded-[2rem] sm:p-6 md:p-7",
              isVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-4 scale-[0.985] opacity-0 sm:translate-y-2",
            ].join(" ")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.78rem] font-medium tracking-[0.24em] text-zinc-400 uppercase">
                  {t.modal.info}
                </p>
                <h3 className="mt-2 text-[2rem] leading-[0.95] tracking-[-0.04em] text-zinc-900">
                  {t.modal.title}
                </h3>
              </div>

              <button
                type="button"
                aria-label="Bağla"
                onClick={closeModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-[0_10px_22px_rgba(24,24,24,0.08)] ring-1 ring-zinc-200/80 transition-colors duration-300 hover:text-zinc-900"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-white/82 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-zinc-200/80">
              <p className="text-base leading-7 text-zinc-600">
                {t.modal.body}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
