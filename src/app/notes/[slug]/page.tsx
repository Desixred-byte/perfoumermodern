import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { NoteTypeCatalogSection } from "@/components/NoteTypeCatalogSection";
import { getNotes, getPerfumes } from "@/lib/catalog";
import { formatMessage, getDictionary } from "@/lib/i18n";
import { getCurrentLocale } from "@/lib/i18n.server";
import { localizeNoteLabel } from "@/lib/note-label";
import { absoluteUrl, buildAzeriPageKeywords } from "@/lib/seo";

type NoteFilterType = "top" | "heart" | "base";

type NotePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
};

const NOTE_TYPE_LABELS: Record<NoteFilterType, string> = {
  top: "Üst notları",
  heart: "Ürək notları",
  base: "Baza notları",
};

function normalizeType(value?: string): NoteFilterType {
  if (value === "heart" || value === "base") {
    return value;
  }

  return "top";
}

function decodeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateStaticParams() {
  const notes = await getNotes();
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = decodeSlug(slug).toLowerCase();
  const notes = await getNotes();
  const noteRaw =
    notes.find((item) => item.slug === normalizedSlug) ?? {
      slug: normalizedSlug,
      name: fallbackNoteName(normalizedSlug),
    };
  const noteName = localizeNoteLabel(noteRaw, "az");
  const canonicalPath = `/notes/${normalizedSlug}`;

  return {
    title: `${noteName} notu olan ətirlər`,
    description: `${noteName} notu ilə seçilmiş premium ətirləri kəşf edin və top, ürək, baza notlarına görə filtr edin.`,
    keywords: buildAzeriPageKeywords([
      `${noteName} notu`,
      `${noteName} qoxusu olan ətirlər`,
      `${noteName} ətir notları`,
      `${noteName} ətir tövsiyəsi`,
      "top not ətirlər",
      "ürək not ətirlər",
      "baza not ətirlər",
      "nota görə ətir seçimi",
    ]),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${noteName} notu olan ətirlər`,
      description: `${noteName} notuna uyğun ətir seçimi və not tipinə görə çeşidlənmiş məhsullar.`,
      url: absoluteUrl(canonicalPath),
      type: "website",
    },
  };
}

function fallbackNoteName(slug: string) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default async function NotePage({
  params,
  searchParams,
}: NotePageProps) {
  const locale = await getCurrentLocale();
  const t = getDictionary(locale);
  const [{ slug }, { type }] = await Promise.all([params, searchParams]);
  const noteType = normalizeType(type);
  const [notes, perfumes] = await Promise.all([getNotes(), getPerfumes()]);

  const normalizedSlug = decodeSlug(slug).toLowerCase();
  const note =
    notes.find((item) => item.slug === normalizedSlug) ?? {
      slug: normalizedSlug,
      name: fallbackNoteName(normalizedSlug),
      image: "",
      imageAlt: "",
      content: "",
    };
  const localizedNoteName = localizeNoteLabel(note, locale);

  return (
    <div className="bg-[#f3f3f2]">
      <main className="mx-auto max-w-[1540px] px-4 pt-6 sm:px-6 md:px-10 md:pt-10">
        <section className="border-b border-zinc-200/85 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-zinc-500">{t.notePage.eyebrow}</p>
              <h1 className="mt-2 max-w-[12ch] text-[2.75rem] leading-[0.95] tracking-[-0.02em] text-zinc-800 sm:text-5xl md:text-7xl">
                {formatMessage(t.notePage.title, { note: localizedNoteName })}
              </h1>
            </div>

            <div className="w-full max-w-xl">
              <p className="text-sm leading-6 text-zinc-500 md:text-base">
                {formatMessage(t.notePage.description, { note: localizedNoteName.toLowerCase() })}
              </p>
            </div>
          </div>
        </section>

        <NoteTypeCatalogSection
          perfumes={perfumes}
          locale={locale}
          noteSlug={note.slug}
          noteName={localizedNoteName}
          initialType={noteType}
          labels={{
            top: t.notePage.top,
            heart: t.notePage.heart,
            base: t.notePage.base,
          }}
        />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
