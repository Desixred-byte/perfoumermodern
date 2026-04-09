"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";

type DetailItem = {
  title: string;
  content: string;
};

type DetailAccordionProps = {
  items: DetailItem[];
};

export function DetailAccordion({ items }: DetailAccordionProps) {
  const [openTitle, setOpenTitle] = useState<string | null>(items[0]?.title ?? null);

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isOpen = openTitle === item.title;

        return (
          <section key={item.title} className="border-b border-zinc-200/90 py-3">
            <button
              type="button"
              onClick={() => setOpenTitle(isOpen ? null : item.title)}
              className="flex w-full items-center justify-between gap-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-[1.9rem] leading-none tracking-[-0.03em] text-zinc-800">
                {item.title}
              </span>
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-transform duration-300 ease-out",
                  isOpen ? "rotate-180" : "rotate-0",
                ].join(" ")}
              >
                <CaretDown size={18} />
              </span>
            </button>

            <div
              className={[
                "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
                isOpen
                  ? "mt-3 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0",
              ].join(" ")}
            >
              <div className="min-h-0">
                <p className="max-w-4xl pr-2 text-[1rem] leading-7 text-zinc-500">
                  {item.content}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
