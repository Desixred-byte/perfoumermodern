import { NextResponse } from "next/server";

import { getPerfumes } from "@/lib/catalog";
import type { Perfume } from "@/types/catalog";

type QuizAnswers = {
  gender?: string;
  vibe?: string;
  occasion?: string;
  intensity?: string;
  profile?: string;
  budget?: string;
};

type RecommendRequest = {
  locale?: "az" | "en" | "ru";
  answers?: QuizAnswers;
  freeText?: string;
  fallbackSlugs?: string[];
};

const KEYWORDS = {
  vibe: {
    fresh: ["citrus", "bergamot", "lemon", "grapefruit", "marine", "aquatic", "green", "tea", "neroli"],
    warm: ["vanilla", "amber", "tonka", "benzoin", "cinnamon", "caramel", "resin"],
    floral: ["rose", "jasmine", "peony", "iris", "violet", "orange", "floral"],
    bold: ["oud", "leather", "tobacco", "smoke", "spice", "incense", "musk", "patchouli"],
  },
  occasion: {
    daily: ["citrus", "green", "musk", "floral", "tea"],
    office: ["bergamot", "citrus", "neroli", "green", "lavender", "tea"],
    date: ["rose", "vanilla", "amber", "musk", "jasmine", "tonka"],
    evening: ["oud", "amber", "leather", "tobacco", "patchouli", "spice"],
  },
  intensity: {
    soft: ["citrus", "green", "tea", "floral", "neroli"],
    balanced: ["musk", "floral", "woody", "amber"],
    strong: ["oud", "leather", "tobacco", "amber", "patchouli", "incense"],
  },
  profile: {
    citrus: ["citrus", "bergamot", "lemon", "mandarin", "grapefruit", "neroli"],
    floral: ["floral", "rose", "jasmine", "iris", "violet", "peony", "ylang"],
    woody: ["woody", "sandalwood", "cedar", "vetiver", "patchouli"],
    amber: ["amber", "vanilla", "tonka", "benzoin", "resin", "sweet"],
    oud: ["oud", "smoke", "leather", "incense", "tobacco"],
  },
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return perfume.sizes.reduce((min, item) => (item.price < min ? item.price : min), perfume.sizes[0].price);
}

function collectPerfumeTokens(perfume: Perfume) {
  return [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
    normalize(perfume.name),
    normalize(perfume.brand),
  ].map(normalize);
}

function countMatches(tokens: string[], keywords: readonly string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (tokens.some((token) => token.includes(keyword))) {
      score += 1;
    }
  }
  return score;
}

function scorePerfume(perfume: Perfume, answers: QuizAnswers) {
  const tokens = collectPerfumeTokens(perfume);
  let score = 0;

  const gender = normalize(perfume.gender);
  if (answers.gender && answers.gender !== "all") {
    if (gender.includes(answers.gender)) {
      score += 6;
    } else if (gender.includes("unisex")) {
      score += 3;
    } else {
      score -= 2;
    }
  }

  if (answers.vibe && answers.vibe in KEYWORDS.vibe) {
    score += countMatches(tokens, KEYWORDS.vibe[answers.vibe as keyof typeof KEYWORDS.vibe]) * 2.2;
  }

  if (answers.occasion && answers.occasion in KEYWORDS.occasion) {
    score += countMatches(tokens, KEYWORDS.occasion[answers.occasion as keyof typeof KEYWORDS.occasion]) * 1.8;
  }

  if (answers.intensity && answers.intensity in KEYWORDS.intensity) {
    score += countMatches(tokens, KEYWORDS.intensity[answers.intensity as keyof typeof KEYWORDS.intensity]) * 1.5;
  }

  if (answers.profile && answers.profile in KEYWORDS.profile) {
    score += countMatches(tokens, KEYWORDS.profile[answers.profile as keyof typeof KEYWORDS.profile]) * 2.8;
  }

  const price = getStartingPrice(perfume);
  if (answers.budget === "under80") {
    score += price <= 80 ? 3 : -1;
  } else if (answers.budget === "80to140") {
    score += price >= 80 && price <= 140 ? 3 : -1;
  } else if (answers.budget === "140plus") {
    score += price >= 140 ? 3 : -1;
  }

  if (perfume.inStock) {
    score += 1.2;
  }

  return score;
}

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw) as { slugs?: string[]; followUpQuestions?: string[] };
  } catch {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      return {};
    }

    try {
      return JSON.parse(raw.slice(first, last + 1)) as { slugs?: string[]; followUpQuestions?: string[] };
    } catch {
      return {};
    }
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.QOXUNU_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "QOXUNU_OPENAI_API_KEY is missing." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as RecommendRequest;
  const answers = body.answers ?? {};
  const freeText = (body.freeText ?? "").trim();

  const perfumes = await getPerfumes();
  const candidates = [...perfumes]
    .map((perfume) => ({ perfume, score: scorePerfume(perfume, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ perfume }) => ({
      slug: perfume.slug,
      name: perfume.name,
      brand: perfume.brand,
      gender: perfume.gender,
      top: perfume.noteSlugs.top,
      heart: perfume.noteSlugs.heart,
      base: perfume.noteSlugs.base,
      minPrice: getStartingPrice(perfume),
    }));

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a perfume recommendation expert. Choose exactly 3 candidates by slug based on structured quiz answers and free-text preference. Return strict JSON with keys: slugs (string[]), followUpQuestions (string[] with 3 concise questions).",
        },
        {
          role: "user",
          content: JSON.stringify({
            locale: body.locale || "az",
            answers,
            freeText,
            candidates,
            fallbackSlugs: body.fallbackSlugs ?? [],
          }),
        },
      ],
    }),
  });

  if (!completionResponse.ok) {
    const fallback = (body.fallbackSlugs ?? []).slice(0, 3);
    return NextResponse.json({ slugs: fallback, followUpQuestions: [] });
  }

  const completionJson = (await completionResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = completionJson.choices?.[0]?.message?.content ?? "{}";
  const parsed = parseJsonObject(content);

  const allowedSlugs = new Set(candidates.map((item) => item.slug));
  const selected = (parsed.slugs ?? [])
    .filter((slug) => allowedSlugs.has(slug))
    .slice(0, 3);

  const uniqueSelected = Array.from(new Set(selected));
  const fallback = (body.fallbackSlugs ?? []).filter((slug) => allowedSlugs.has(slug));

  const finalSlugs = [...uniqueSelected, ...fallback].slice(0, 3);

  return NextResponse.json({
    slugs: finalSlugs,
    followUpQuestions: (parsed.followUpQuestions ?? []).slice(0, 3),
  });
}
