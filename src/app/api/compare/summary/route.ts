import path from "node:path";
import { readFileSync } from "node:fs";

import { NextResponse } from "next/server";

import { getPerfumeBySlug } from "@/lib/catalog";

type CompareSummaryRequest = {
  slugs?: string[];
  locale?: "az" | "en" | "ru";
};

type RateState = {
  windowStart: number;
  used: number;
};

type CompareSummaryPayload = {
  summary?: string;
  highlights?: string[];
};

const SUMMARY_LANGUAGE: Record<NonNullable<CompareSummaryRequest["locale"]>, string> = {
  az: "Azerbaijani",
  en: "English",
  ru: "Russian",
};

const MAX_PERFUMES_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_STATE_KEY = "__compare_summary_rate_state_v1";
const ENV_CACHE_STATE_KEY = "__compare_summary_env_cache_v1";
const OPENAI_TIMEOUT_MS = 20_000;

const getRateStore = () => {
  const globalScope = globalThis as typeof globalThis & {
    [RATE_LIMIT_STATE_KEY]?: Map<string, RateState>;
  };

  if (!globalScope[RATE_LIMIT_STATE_KEY]) {
    globalScope[RATE_LIMIT_STATE_KEY] = new Map<string, RateState>();
  }

  return globalScope[RATE_LIMIT_STATE_KEY]!;
};

const getEnvStore = () => {
  const globalScope = globalThis as typeof globalThis & {
    [ENV_CACHE_STATE_KEY]?: Record<string, string>;
  };

  if (!globalScope[ENV_CACHE_STATE_KEY]) {
    const root = process.cwd();
    const fromEnv = parseEnvFile(path.join(root, ".env"));
    const fromEnvLocal = parseEnvFile(path.join(root, ".env.local"));
    globalScope[ENV_CACHE_STATE_KEY] = { ...fromEnv, ...fromEnvLocal };
  }

  return globalScope[ENV_CACHE_STATE_KEY]!;
};

function parseEnvFile(filePath: string) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  } catch {
    return {};
  }
}

function getEnvValue(key: string) {
  const direct = process.env[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  return (getEnvStore()[key] || "").trim();
}

function safeJsonParse(raw: string): CompareSummaryPayload {
  try {
    return JSON.parse(raw) as CompareSummaryPayload;
  } catch {
    return {};
  }
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function decodeBearerSub(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  const token = authHeader.slice(7).trim();
  const [, payload = ""] = token.split(".");
  if (!payload) {
    return "";
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf-8")) as { sub?: string };
    return typeof json.sub === "string" ? json.sub : "";
  } catch {
    return "";
  }
}

function checkAndConsumeLimit(key: string, amount: number) {
  const now = Date.now();
  const store = getRateStore();

  if (store.size > 2_500) {
    for (const [entryKey, entry] of store.entries()) {
      if (now - entry.windowStart >= WINDOW_MS) {
        store.delete(entryKey);
      }
    }
  }

  const current = store.get(key);

  if (!current || now - current.windowStart >= WINDOW_MS) {
    if (amount > MAX_PERFUMES_PER_WINDOW) {
      return { allowed: false, remaining: 0 };
    }
    store.set(key, { windowStart: now, used: amount });
    return { allowed: true, remaining: MAX_PERFUMES_PER_WINDOW - amount };
  }

  if (current.used + amount > MAX_PERFUMES_PER_WINDOW) {
    return { allowed: false, remaining: Math.max(0, MAX_PERFUMES_PER_WINDOW - current.used) };
  }

  current.used += amount;
  store.set(key, current);
  return { allowed: true, remaining: MAX_PERFUMES_PER_WINDOW - current.used };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CompareSummaryRequest;
  const locale: NonNullable<CompareSummaryRequest["locale"]> =
    body.locale === "en" || body.locale === "ru" ? body.locale : "az";

  const slugs = Array.isArray(body.slugs)
    ? Array.from(new Set(body.slugs.map((item) => item.trim().toLowerCase()).filter(Boolean)))
    : [];

  if (slugs.length < 2) {
    return NextResponse.json({ error: "at least 2 perfumes are required" }, { status: 400 });
  }

  if (slugs.length > 5) {
    return NextResponse.json({ error: "maximum 5 perfumes per summary" }, { status: 400 });
  }

  const userSub = decodeBearerSub(request);
  const ip = getClientIp(request);
  const rateKey = userSub ? `user:${userSub}` : `ip:${ip}`;
  const limit = checkAndConsumeLimit(rateKey, slugs.length);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", remaining: limit.remaining },
      { status: 429 },
    );
  }

  const perfumes = (
    await Promise.all(slugs.map(async (slug) => getPerfumeBySlug(slug)))
  ).filter((item): item is NonNullable<Awaited<ReturnType<typeof getPerfumeBySlug>>> => Boolean(item));

  if (perfumes.length < 2) {
    return NextResponse.json({ error: "insufficient valid perfumes", remaining: limit.remaining }, { status: 400 });
  }

  const apiKey = getEnvValue("QOXUNU_OPENAI_API_KEY") || getEnvValue("OPENAI_API_KEY");
  if (!apiKey) {
    return NextResponse.json(
      { summary: "", highlights: [], warning: "provider_unavailable", remaining: limit.remaining },
      { status: 200 },
    );
  }

  const model = getEnvValue("OPENAI_MODEL") || "gpt-4.1-mini";
  const summaryLanguage = SUMMARY_LANGUAGE[locale];

  const compareInput = perfumes.map((perfume) => ({
    slug: perfume.slug,
    name: perfume.name,
    brand: perfume.brand,
    gender: perfume.gender,
    stockStatus: perfume.stockStatus,
    inStock: perfume.inStock,
    topNotes: perfume.notes.top.map((note) => note.name),
    heartNotes: perfume.notes.heart.map((note) => note.name),
    baseNotes: perfume.notes.base.map((note) => note.name),
    sizes: perfume.sizes,
  }));

  const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are a fragrance expert. Compare the provided perfumes in ${summaryLanguage}. Return strict JSON with keys: summary (string, 3-5 concise sentences), highlights (array of 3-6 short lines). Keep perfume names as-is, and make differences practical for choosing.`,
        },
        {
          role: "user",
          content: JSON.stringify({ locale, perfumes: compareInput }),
        },
      ],
    }),
  }).catch(() => null);

  if (!completionResponse || !completionResponse.ok) {
    return NextResponse.json(
      { summary: "", highlights: [], warning: "provider_unavailable", remaining: limit.remaining },
      { status: 200 },
    );
  }

  const completionJson = (await completionResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const parsed = safeJsonParse(completionJson.choices?.[0]?.message?.content ?? "{}");

  return NextResponse.json({
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    highlights: Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((item): item is string => typeof item === "string").slice(0, 6)
      : [],
    remaining: limit.remaining,
  });
}
