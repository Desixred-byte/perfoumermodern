import Link from "next/link";

import type { Note } from "@/types/catalog";

type NoteGroupProps = {
  title: string;
  notes: Note[];
};

export function NoteGroup({ title, notes }: NoteGroupProps) {
  if (!notes.length) return null;

  const [emphasis, trailing] = title.split(" ", 2);
  const typeMap = {
    "Üst notları": "top",
    "Ürək notları": "heart",
    "Baza notları": "base",
  } as const;
  const noteType = typeMap[title as keyof typeof typeMap] ?? "top";

  return (
    <section className="space-y-3">
      <h3 className="text-[2.2rem] leading-none tracking-[-0.03em] text-zinc-800">
        <span className="font-medium">{emphasis}</span>
        {trailing ? <span className="font-light text-zinc-400"> {trailing}</span> : null}
      </h3>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        {notes.map((note) => (
          <Link
            key={note.slug}
            href={`/notes/${note.slug}?type=${noteType}`}
            className="group flex w-fit flex-col items-start"
          >
            <div className="rounded-[1.05rem] bg-white p-0.5 shadow-[0_8px_18px_rgba(15,23,42,0.06)] ring-1 ring-zinc-200/80 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_24px_rgba(15,23,42,0.1)]">
              {note.image ? (
                <img
                  src={note.image}
                  alt={note.imageAlt || note.name}
                  className="h-[3.9rem] w-[3.9rem] rounded-[0.9rem] bg-white object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-[3.9rem] w-[3.9rem] rounded-[0.9rem] bg-zinc-100" />
              )}
            </div>
            <p className="mt-1 max-w-[4.8rem] text-[0.84rem] leading-tight text-zinc-700 transition-colors duration-300 group-hover:text-zinc-900">
              {note.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
