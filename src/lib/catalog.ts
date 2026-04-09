import path from "node:path";
import { readFile } from "node:fs/promises";
import { cache } from "react";

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

const csvPath = (...segments: string[]) =>
  path.join(process.cwd(), "data", ...segments);

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

export const getNotes = cache(async (): Promise<Note[]> => {
  const raw = await readFile(csvPath("Notes.csv"), "utf-8").catch(() =>
    readFile(csvPath("notes.csv"), "utf-8"),
  );
  const rows = parseCsv<NoteCsvRow>(raw);

  return rows.map((row) => ({
    slug: row.Slug.trim().toLowerCase(),
    name: row.Title.trim(),
    image: row.Image.trim(),
    imageAlt: row["Image:alt"].trim(),
    content: stripHtml(row.Content),
  }));
});

export const getPerfumes = cache(async (): Promise<Perfume[]> => {
  const raw = await readFile(csvPath("perfumes.csv"), "utf-8");
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
});

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

  const noteMap = new Map(notes.map((note) => [note.slug, note]));

  const mapSlugs = (slugs: string[]) =>
    slugs.map((item) => noteMap.get(item) ?? fallbackNote(item));

  return {
    ...perfume,
    notes: {
      top: mapSlugs(perfume.noteSlugs.top),
      heart: mapSlugs(perfume.noteSlugs.heart),
      base: mapSlugs(perfume.noteSlugs.base),
    },
  };
}
