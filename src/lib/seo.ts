const DEFAULT_SITE_URL = "https://perfoumer.az";

const normalizeSiteUrl = (value: string) => value.trim().replace(/\/$/, "");

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()
    ? process.env.NEXT_PUBLIC_SITE_URL
    : DEFAULT_SITE_URL,
);

export const SITE_NAME = "Perfoumer";
export const DEFAULT_OG_IMAGE = "/logo.webp";

const AZ_INTENTS = [
  "al",
  "onlayn al",
  "sifariş et",
  "kəşf et",
  "qiymət",
  "endirim",
  "ən yaxşı",
  "orijinal",
  "premium",
  "lüks",
  "niş",
  "uzunömürlü",
  "bakı",
  "azərbaycan",
];

const AZ_CONTEXT = [
  "mağazası",
  "kataloqu",
  "qiyməti",
  "seçimi",
  "tövsiyə",
  "çatdırılma",
  "sifarişi",
  "hədiyyə",
  "top notlar",
  "ürək notlar",
  "baza notlar",
  "qalıcılığı",
  "gündəlik istifadə",
  "axşam qoxusu",
  "yay qoxusu",
  "qış qoxusu",
];

const DEFAULT_AZ_TERMS = [
  "ətir",
  "parfum",
  "orijinal ətir",
  "premium ətir",
  "lüks ətir",
  "niş ətir",
  "dizayner ətir",
  "kişi ətri",
  "qadın ətri",
  "uniseks ətir",
  "uzunömürlü ətir",
  "oud ətri",
  "ərəb ətri",
  "ətir mağazası",
  "ətir kataloqu",
];

export const buildAzeriPageKeywords = (
  pageTerms: string[],
  minCount = 220,
): string[] => {
  const seedTerms = Array.from(
    new Set([...DEFAULT_AZ_TERMS, ...pageTerms.map((item) => item.trim()).filter(Boolean)]),
  );

  const keywords = new Set<string>([
    SITE_NAME,
    "Perfoumer Azərbaycan",
    "Perfoumer Bakı",
    ...seedTerms,
  ]);

  for (const term of seedTerms) {
    for (const intent of AZ_INTENTS) {
      keywords.add(`${intent} ${term}`);
      keywords.add(`${term} ${intent}`);
    }

    for (const context of AZ_CONTEXT) {
      keywords.add(`${term} ${context}`);
      keywords.add(`${context} ${term}`);
    }
  }

  return Array.from(keywords).slice(0, Math.max(minCount, 240));
};

export const SEO_KEYWORDS = buildAzeriPageKeywords([], 220);

export const absoluteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
};
