import path from "node:path";
import { readFile } from "node:fs/promises";
import { unstable_cache } from "next/cache";

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

export const parsePrice = (value: string): number | null => {
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

const normalizeNameKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const variantIdentityKey = (perfume: Perfume) => {
  const sizeKey = perfume.sizes
    .map((size) => `${size.ml}:${size.price}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  return [perfume.slug, sizeKey, perfume.externalLink, perfume.stockStatus.toLowerCase()].join("::");
};

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

async function getNotesSource(): Promise<Note[]> {
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

const getNotesCached = unstable_cache(getNotesSource, ["catalog-notes-v1"], {
  revalidate: 300,
  tags: ["catalog", "notes"],
});

export async function getNotes(): Promise<Note[]> {
  return getNotesCached();
}

async function getCsvPerfumesSource(referencePerfumes: Perfume[] = []): Promise<Perfume[]> {
  const raw = await readFile(PERFUMES_CSV_PATH, "utf-8");
  const rows = parseCsv<PerfumeCsvRow>(raw);

  const referenceImageBySlug = new Map<string, string>();
  const referenceImageByName = new Map<string, string>();

  for (const perfume of referencePerfumes) {
    if (perfume.image.trim()) {
      referenceImageBySlug.set(perfume.slug, perfume.image.trim());
    }

    const normalizedName = normalizeNameKey(perfume.name);
    if (normalizedName && perfume.image.trim() && !referenceImageByName.has(normalizedName)) {
      referenceImageByName.set(normalizedName, perfume.image.trim());
    }
  }

  const variantCounterBySlug = new Map<string, number>();
  const perfumes: Perfume[] = [];

  for (const row of rows) {
    const slug = row.slug.trim().toLowerCase();
    if (!slug) continue;

    const nextVariantIndex = (variantCounterBySlug.get(slug) ?? 0) + 1;
    variantCounterBySlug.set(slug, nextVariantIndex);

    const externalLink = row.link.trim();
    const externalId = externalLink.match(/\/(\d+)(?:\D*)$/)?.[1] ?? "";
    const id = externalId || `${slug}__variant_${nextVariantIndex}`;

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
    const normalizedName = normalizeNameKey(row.title || "");
    const csvImage = row.image.trim();
    const matchedImage =
      (normalizedName ? referenceImageByName.get(normalizedName) : undefined) ||
      referenceImageBySlug.get(slug);
    const image = matchedImage || csvImage || getPerfumeImageUrl(slug);

    const parsed: Perfume = {
      id,
      slug,
      name: row.title.trim(),
      brand: row.brand.trim(),
      gender: row.gender.trim() || "Unisex",
      image,
      imageAlt: row.image_alt.trim(),
      stockStatus: stock.stockStatus,
      inStock: stock.inStock,
      externalLink,
      sizes,
      noteSlugs: {
        top: splitByComma(row.top_notes || ""),
        heart: splitByComma(row.heart_notes || ""),
        base: splitByComma(row.base_notes || ""),
      },
    };

    perfumes.push(parsed);
  }

  return perfumes;
}

async function getPerfumesSource(): Promise<Perfume[]> {
  const adminPerfumes = await readJsonSafely<unknown[]>(ADMIN_PERFUMES_JSON_PATH);
  let parsedAdminPerfumes: Perfume[] = [];

  if (Array.isArray(adminPerfumes)) {
    parsedAdminPerfumes = adminPerfumes
      .map(normalizePerfume)
      .filter((item): item is Perfume => item !== null);
  }

  const csvPerfumes = await getCsvPerfumesSource(parsedAdminPerfumes);

  if (!parsedAdminPerfumes.length) {
    return csvPerfumes;
  }

  const mergedPerfumes = [...parsedAdminPerfumes];
  const existingVariantKeys = new Set(parsedAdminPerfumes.map(variantIdentityKey));

  for (const perfume of csvPerfumes) {
    const key = variantIdentityKey(perfume);
    if (!existingVariantKeys.has(key)) {
      mergedPerfumes.push(perfume);
      existingVariantKeys.add(key);
    }
  }

  return mergedPerfumes;
}

const getPerfumesCached = unstable_cache(getPerfumesSource, ["catalog-perfumes-v3"], {
  revalidate: 300,
  tags: ["catalog", "perfumes"],
});

export async function getPerfumes(): Promise<Perfume[]> {
  return getPerfumesCached();
}

export async function getFeaturedPerfumes(limit = 8): Promise<Perfume[]> {
  const perfumes = await getPerfumes();
  return rotateBySeed(perfumes, `home-${getDailySeed()}`).slice(0, limit);
}

export async function getRelatedPerfumes(
  currentSlug: string,
  limit = 3,
): Promise<Perfume[]> {
  const perfumes = await getPerfumes();
  const current = perfumes.find((item) => item.slug === currentSlug.toLowerCase());
  const candidates = perfumes.filter((item) => item.slug !== currentSlug);

  if (!current) {
    return rotateBySeed(candidates, `${currentSlug}-${getDailySeed()}`).slice(0, limit);
  }

  const normalizeGender = (value: string) => value.trim().toLowerCase();
  const targetGender = normalizeGender(current.gender);
  const targetNotes = {
    top: new Set(current.noteSlugs.top),
    heart: new Set(current.noteSlugs.heart),
    base: new Set(current.noteSlugs.base),
  };
  const targetMinPrice =
    current.sizes.length > 0 ? Math.min(...current.sizes.map((size) => size.price)) : null;

  const scored = candidates.map((candidate) => {
    let score = 0;

    if (candidate.inStock) {
      score += 18;
    }

    if (candidate.brand.toLowerCase() === current.brand.toLowerCase()) {
      score += 24;
    }

    const candidateGender = normalizeGender(candidate.gender);
    if (candidateGender === targetGender) {
      score += 15;
    } else if (candidateGender.includes("unisex") || targetGender.includes("unisex")) {
      score += 7;
    }

    const overlapTop = candidate.noteSlugs.top.filter((note) => targetNotes.top.has(note)).length;
    const overlapHeart = candidate.noteSlugs.heart.filter((note) => targetNotes.heart.has(note)).length;
    const overlapBase = candidate.noteSlugs.base.filter((note) => targetNotes.base.has(note)).length;
    score += overlapTop * 9 + overlapHeart * 7 + overlapBase * 5;

    const candidateMinPrice =
      candidate.sizes.length > 0 ? Math.min(...candidate.sizes.map((size) => size.price)) : null;
    if (targetMinPrice !== null && candidateMinPrice !== null) {
      const distance = Math.abs(candidateMinPrice - targetMinPrice);
      score += Math.max(0, 16 - Math.round(distance / 6));
    }

    const tieBreaker = hashString(`${currentSlug}-${candidate.slug}-${getDailySeed()}`) % 1000;
    return { candidate, score, tieBreaker };
  });

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.tieBreaker - right.tieBreaker;
  });

  return scored.slice(0, limit).map((item) => item.candidate);
}

export async function getPerfumeBySlug(
  slug: string,
  variantId?: string,
): Promise<PerfumeWithNotes | null> {
  const [perfumes, notes] = await Promise.all([getPerfumes(), getNotes()]);

  const normalizedSlug = slug.toLowerCase();
  const candidates = perfumes.filter((item) => item.slug === normalizedSlug);
  if (!candidates.length) return null;

  const normalizedVariantId = typeof variantId === "string" ? variantId.trim().toLowerCase() : "";
  const perfume = normalizedVariantId
    ? candidates.find((item) => item.id.toLowerCase() === normalizedVariantId) ?? candidates[0]
    : candidates[0];
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
