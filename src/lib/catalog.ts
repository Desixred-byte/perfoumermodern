import path from "node:path";
import { readFile } from "node:fs/promises";

import { parseCsv } from "@/lib/csv";
import type { Note, Perfume, PerfumeSize, PerfumeWithNotes } from "@/types/catalog";

type NoteCsvRow = {
  Slug: string;
  Title: string;
  Image: string;
  "Image:alt": string;
  Content: string;
};

type PerfumeCsvRow = {
  slug: string;
  title: string;
  image: string;
  image_alt: string;
  gender: string;
  price_15ml: string;
  price_30ml: string;
  price_50ml: string;
  brand: string;
  top_notes: string;
  heart_notes: string;
  base_notes: string;
  link: string;
  stock_status: string;
};

const splitByComma = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const normalizeNoteLookupKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

const parsePrice = (value: string): number | null => {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStockStatus = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return {
    stockStatus: value.trim() || "Naməlum",
    inStock: normalized.includes("var"),
  };
};

const mergeSizes = (current: PerfumeSize[], incoming: PerfumeSize[]) => {
  const priceByMl = new Map<number, number>();

  for (const size of [...current, ...incoming]) {
    const existing = priceByMl.get(size.ml);
    if (existing === undefined || size.price < existing) {
      priceByMl.set(size.ml, size.price);
    }
  }

  return Array.from(priceByMl.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ml, price]) => ({
      ml,
      price,
      label: `${ml}ML`,
    }));
};

const fallbackNote = (slug: string): Note => ({
  slug,
  name: slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" "),
  image: "",
  imageAlt: "",
  content: "",
});

const NOTES_CSV_PATH = path.join(process.cwd(), "data", "Notes.csv");
const NOTES_CSV_FALLBACK_PATH = path.join(process.cwd(), "data", "notes.csv");
const PERFUMES_CSV_PATH = path.join(process.cwd(), "data", "perfumes.csv");
const ADMIN_NOTES_JSON_PATH = path.join(process.cwd(), "data", "admin", "notes.json");
const ADMIN_PERFUMES_JSON_PATH = path.join(process.cwd(), "data", "admin", "perfumes.json");

const PERFUME_CDN_BASE_URL = "https://perfoumer-cdn.vercel.app/perfumes";

const getPerfumeImageUrl = (slug: string) =>
  `${PERFUME_CDN_BASE_URL}/${encodeURIComponent(slug)}.png`;

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const rotateBySeed = <T,>(items: T[], seed: string) => {
  if (!items.length) {
    return items;
  }

  const offset = hashString(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const getDailySeed = () => new Date().toISOString().slice(0, 10);

async function readJsonSafely<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const note = value as {
    slug?: unknown;
    name?: unknown;
    image?: unknown;
    imageAlt?: unknown;
    content?: unknown;
  };

  const slug = typeof note.slug === "string" ? note.slug.trim().toLowerCase() : "";
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: typeof note.name === "string" ? note.name.trim() : "",
    image: typeof note.image === "string" ? note.image.trim() : "",
    imageAlt: typeof note.imageAlt === "string" ? note.imageAlt.trim() : "",
    content: typeof note.content === "string" ? note.content.trim() : "",
  };
}

function normalizePerfume(value: unknown): Perfume | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const perfume = value as {
    id?: unknown;
    slug?: unknown;
    name?: unknown;
    brand?: unknown;
    gender?: unknown;
    image?: unknown;
    imageAlt?: unknown;
    stockStatus?: unknown;
    inStock?: unknown;
    externalLink?: unknown;
    sizes?: unknown;
    noteSlugs?: {
      top?: unknown;
      heart?: unknown;
      base?: unknown;
    };
  };

  const slug = typeof perfume.slug === "string" ? perfume.slug.trim().toLowerCase() : "";
  if (!slug) {
    return null;
  }

  const sizes = Array.isArray(perfume.sizes)
    ? perfume.sizes
        .map((size) => {
          if (!size || typeof size !== "object") {
            return null;
          }

          const parsed = size as { ml?: unknown; price?: unknown; label?: unknown };
          const ml = Number(parsed.ml);
          const price = Number(parsed.price);

          if (!Number.isFinite(ml) || !Number.isFinite(price)) {
            return null;
          }

          return {
            ml,
            price,
            label: typeof parsed.label === "string" && parsed.label.trim() ? parsed.label.trim() : `${ml}ML`,
          };
        })
        .filter((item): item is PerfumeSize => item !== null)
        .sort((a, b) => a.ml - b.ml)
    : [];

  const normalizeSlugArray = (input: unknown) =>
    Array.isArray(input)
      ? input
          .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
          .filter(Boolean)
      : [];

  const image = typeof perfume.image === "string" && perfume.image.trim()
    ? perfume.image.trim()
    : getPerfumeImageUrl(slug);

  return {
    id: typeof perfume.id === "string" && perfume.id.trim() ? perfume.id.trim() : slug,
    slug,
    name: typeof perfume.name === "string" ? perfume.name.trim() : "",
    brand: typeof perfume.brand === "string" ? perfume.brand.trim() : "",
    gender: typeof perfume.gender === "string" && perfume.gender.trim() ? perfume.gender.trim() : "Unisex",
    image,
    imageAlt: typeof perfume.imageAlt === "string" ? perfume.imageAlt.trim() : "",
    stockStatus:
      typeof perfume.stockStatus === "string" && perfume.stockStatus.trim()
        ? perfume.stockStatus.trim()
        : "Naməlum",
    inStock: Boolean(perfume.inStock),
    externalLink: typeof perfume.externalLink === "string" ? perfume.externalLink.trim() : "",
    sizes,
    noteSlugs: {
      top: normalizeSlugArray(perfume.noteSlugs?.top),
      heart: normalizeSlugArray(perfume.noteSlugs?.heart),
      base: normalizeSlugArray(perfume.noteSlugs?.base),
    },
  };
}

export async function getNotes(): Promise<Note[]> {
  const adminNotes = await readJsonSafely<unknown[]>(ADMIN_NOTES_JSON_PATH);
  if (Array.isArray(adminNotes)) {
    const parsed = adminNotes
      .map(normalizeNote)
      .filter((item): item is Note => item !== null);

    if (parsed.length) {
      return parsed;
    }
  }

  const raw = await readFile(NOTES_CSV_PATH, "utf-8").catch(() =>
    readFile(NOTES_CSV_FALLBACK_PATH, "utf-8"),
  );
  const rows = parseCsv<NoteCsvRow>(raw);

  return rows.map((row) => ({
    slug: row.Slug.trim().toLowerCase(),
    name: row.Title.trim(),
    image: row.Image.trim(),
    imageAlt: row["Image:alt"].trim(),
    content: stripHtml(row.Content),
  }));
}

export async function getPerfumes(): Promise<Perfume[]> {
  const adminPerfumes = await readJsonSafely<unknown[]>(ADMIN_PERFUMES_JSON_PATH);
  if (Array.isArray(adminPerfumes)) {
    const parsed = adminPerfumes
      .map(normalizePerfume)
      .filter((item): item is Perfume => item !== null);

    if (parsed.length) {
      return parsed;
    }
  }

  const raw = await readFile(PERFUMES_CSV_PATH, "utf-8");
  const rows = parseCsv<PerfumeCsvRow>(raw);

  const bySlug = new Map<string, Perfume>();

  for (const row of rows) {
    const slug = row.slug.trim().toLowerCase();
    if (!slug) continue;

    const sizes = [
      { ml: 15, price: parsePrice(row.price_15ml) },
      { ml: 30, price: parsePrice(row.price_30ml) },
      { ml: 50, price: parsePrice(row.price_50ml) },
    ]
      .filter((item): item is { ml: number; price: number } => item.price !== null)
      .map((item) => ({
        ml: item.ml,
        price: item.price,
        label: `${item.ml}ML`,
      }));

    const stock = parseStockStatus(row.stock_status);

    const parsed: Perfume = {
      id: slug,
      slug,
      name: row.title.trim(),
      brand: row.brand.trim(),
      gender: row.gender.trim() || "Unisex",
      image: getPerfumeImageUrl(slug),
      imageAlt: row.image_alt.trim(),
      stockStatus: stock.stockStatus,
      inStock: stock.inStock,
      externalLink: row.link.trim(),
      sizes,
      noteSlugs: {
        top: splitByComma(row.top_notes || ""),
        heart: splitByComma(row.heart_notes || ""),
        base: splitByComma(row.base_notes || ""),
      },
    };

    const existing = bySlug.get(slug);
    if (!existing) {
      bySlug.set(slug, parsed);
      continue;
    }

    bySlug.set(slug, {
      ...existing,
      name: existing.name || parsed.name,
      brand: existing.brand || parsed.brand,
      gender: existing.gender || parsed.gender,
      image: existing.image || parsed.image,
      imageAlt: existing.imageAlt || parsed.imageAlt,
      stockStatus: existing.inStock ? existing.stockStatus : parsed.stockStatus,
      inStock: existing.inStock || parsed.inStock,
      externalLink: existing.externalLink || parsed.externalLink,
      sizes: mergeSizes(existing.sizes, parsed.sizes),
      noteSlugs: {
        top: existing.noteSlugs.top.length ? existing.noteSlugs.top : parsed.noteSlugs.top,
        heart: existing.noteSlugs.heart.length
          ? existing.noteSlugs.heart
          : parsed.noteSlugs.heart,
        base: existing.noteSlugs.base.length ? existing.noteSlugs.base : parsed.noteSlugs.base,
      },
    });
  }

  return Array.from(bySlug.values());
}

export async function getFeaturedPerfumes(limit = 8): Promise<Perfume[]> {
  const perfumes = await getPerfumes();
  const inStock = perfumes.filter((item) => item.inStock);
  return rotateBySeed(inStock, `home-${getDailySeed()}`).slice(0, limit);
}

export async function getRelatedPerfumes(
  currentSlug: string,
  limit = 3,
): Promise<Perfume[]> {
  const perfumes = await getPerfumes();
  const candidates = perfumes.filter((item) => item.slug !== currentSlug);
  return rotateBySeed(candidates, `${currentSlug}-${getDailySeed()}`).slice(0, limit);
}

export async function getPerfumeBySlug(
  slug: string,
): Promise<PerfumeWithNotes | null> {
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);

  const perfume = perfumes.find((item) => item.slug === slug.toLowerCase());
  if (!perfume) return null;

  const noteMap = new Map<string, Note>();

  for (const note of notes) {
    noteMap.set(note.slug, note);

    const normalizedSlug = normalizeNoteLookupKey(note.slug);
    if (normalizedSlug && !noteMap.has(normalizedSlug)) {
      noteMap.set(normalizedSlug, note);
    }

    const normalizedName = normalizeNoteLookupKey(note.name);
    if (normalizedName && !noteMap.has(normalizedName)) {
      noteMap.set(normalizedName, note);
    }
  }

  const mapSlugs = (slugs: string[]) =>
    slugs.map((item) => {
      const direct = noteMap.get(item);
      if (direct) {
        return direct;
      }

      const normalized = normalizeNoteLookupKey(item);
      return noteMap.get(normalized) ?? fallbackNote(item);
    });

  return {
    ...perfume,
    notes: {
      top: mapSlugs(perfume.noteSlugs.top),
      heart: mapSlugs(perfume.noteSlugs.heart),
      base: mapSlugs(perfume.noteSlugs.base),
    },
  };
}
