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
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  return (
    <div className="space-y-0">
      {items.map((item) => {
        const isOpen = openTitle === item.title;

        return (
          <section key={item.title} className="border-b border-zinc-200/90 py-0.5 sm:py-1">
            <button
              type="button"
              onClick={() => setOpenTitle(isOpen ? null : item.title)}
              className="flex min-h-11 w-full items-center justify-between gap-2.5 text-left sm:min-h-12"
              aria-expanded={isOpen}
            >
              <span className="text-[1.18rem] leading-[1.08] tracking-[-0.012em] text-zinc-800 sm:text-[1.32rem] md:text-[1.5rem]">
                {item.title}
              </span>
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-transform duration-300 ease-out sm:h-9 sm:w-9",
                  isOpen ? "rotate-180" : "rotate-0",
                ].join(" ")}
              >
                <CaretDown size={16} />
              </span>
            </button>

            <div
              className={[
                "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-280 ease-out",
                isOpen
                  ? "mt-0.5 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0",
              ].join(" ")}
            >
              <div className="min-h-0">
                <p className="max-w-4xl pr-1.5 pb-1 text-[0.86rem] leading-5 text-zinc-500 sm:pr-2 sm:text-[0.9rem] sm:leading-6 md:text-[0.98rem] md:leading-7">
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
