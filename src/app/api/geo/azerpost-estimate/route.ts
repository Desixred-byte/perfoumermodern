import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DeliveryMethod = "standard" | "express";

type EstimateRequest = {
  city?: string;
  country?: string;
  deliveryMethod?: DeliveryMethod;
  subtotal?: number;
  locale?: string;
};

type Zone = "baku" | "absheron" | "regional" | "remote";

type Estimate = {
  carrier: "Azerpoct";
  zone: Zone;
  city: string;
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
  etaLabel: string;
  freeThreshold: number;
};

type SupportedLocale = "az" | "en" | "ru";

const OUTSIDE_BAKU_STANDARD_FEE = 2.5;

function normalize(value: string | undefined): string {
  return (value || "").trim().toLowerCase();
}

function resolveLocale(value: string | undefined): SupportedLocale {
  if (value === "en" || value === "ru") {
    return value;
  }

  return "az";
}

function resolveEtaLabel(locale: SupportedLocale, key: "today_next" | "d1_2" | "d2_3" | "d2_4" | "d3_5" | "d1_3" | "d2_4_std") {
  const copy: Record<SupportedLocale, Record<typeof key, string>> = {
    az: {
      today_next: "Bu gün və ya növbəti iş günü",
      d1_2: "1-2 iş günü",
      d2_3: "2-3 iş günü",
      d2_4: "2-4 iş günü",
      d3_5: "3-5 iş günü",
      d1_3: "1-3 iş günü",
      d2_4_std: "2-4 iş günü",
    },
    en: {
      today_next: "Today or next business day",
      d1_2: "1-2 business days",
      d2_3: "2-3 business days",
      d2_4: "2-4 business days",
      d3_5: "3-5 business days",
      d1_3: "1-3 business days",
      d2_4_std: "2-4 business days",
    },
    ru: {
      today_next: "Сегодня или на следующий рабочий день",
      d1_2: "1-2 рабочих дня",
      d2_3: "2-3 рабочих дня",
      d2_4: "2-4 рабочих дня",
      d3_5: "3-5 рабочих дней",
      d1_3: "1-3 рабочих дня",
      d2_4_std: "2-4 рабочих дня",
    },
  };

  return copy[locale][key];
}

function resolveZone(city: string): Zone {
  const normalized = normalize(city);
  if (!normalized) return "regional";

  if (["baku", "baku city", "baki", "бакy", "баку"].includes(normalized)) {
    return "baku";
  }

  if (["sumqayit", "sumgait", "xirdalan", "khirdalan", "absheron", "abseron"].includes(normalized)) {
    return "absheron";
  }

  if (["naxcivan", "nakhchivan", "lankaran", "lenkeran", "qax", "zaqatala", "zagatala"].includes(normalized)) {
    return "remote";
  }

  return "regional";
}

function buildEstimate(
  city: string,
  method: DeliveryMethod,
  subtotal: number,
  locale: SupportedLocale,
): Estimate {
  const zone = resolveZone(city);

  if (zone === "baku") {
    const fee = method === "express" ? 5 : 0;
    return {
      carrier: "Azerpoct",
      zone,
      city: city.trim(),
      fee,
      etaMinDays: 1,
      etaMaxDays: method === "express" ? 1 : 2,
      etaLabel: method === "express" ? resolveEtaLabel(locale, "today_next") : resolveEtaLabel(locale, "d1_2"),
      freeThreshold: 0,
    };
  }

  if (zone === "absheron") {
    const fee = method === "express" ? 7.5 : OUTSIDE_BAKU_STANDARD_FEE;
    return {
      carrier: "Azerpoct",
      zone,
      city: city.trim(),
      fee,
      etaMinDays: 1,
      etaMaxDays: method === "express" ? 2 : 3,
      etaLabel: method === "express" ? resolveEtaLabel(locale, "d1_2") : resolveEtaLabel(locale, "d2_3"),
      freeThreshold: 0,
    };
  }

  if (zone === "remote") {
    const fee = method === "express" ? 9.5 : OUTSIDE_BAKU_STANDARD_FEE;
    return {
      carrier: "Azerpoct",
      zone,
      city: city.trim(),
      fee,
      etaMinDays: method === "express" ? 2 : 3,
      etaMaxDays: method === "express" ? 4 : 5,
      etaLabel: method === "express" ? resolveEtaLabel(locale, "d2_4") : resolveEtaLabel(locale, "d3_5"),
      freeThreshold: 0,
    };
  }

  const fee = method === "express" ? 8.5 : OUTSIDE_BAKU_STANDARD_FEE;
  return {
    carrier: "Azerpoct",
    zone: "regional",
    city: city.trim(),
    fee,
    etaMinDays: method === "express" ? 1 : 2,
    etaMaxDays: method === "express" ? 3 : 4,
    etaLabel: method === "express" ? resolveEtaLabel(locale, "d1_3") : resolveEtaLabel(locale, "d2_4_std"),
    freeThreshold: 0,
  };
}

export async function POST(request: Request) {
  let body: EstimateRequest;
  try {
    body = (await request.json()) as EstimateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const city = (body.city || "").trim();
  const country = (body.country || "").trim();
  const method: DeliveryMethod = body.deliveryMethod === "express" ? "express" : "standard";
  const subtotal = Number.isFinite(body.subtotal) ? Number(body.subtotal) : 0;
  const locale = resolveLocale(typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "az");

  if (!city && !country) {
    return NextResponse.json({ error: "City or country is required." }, { status: 400 });
  }

  const estimate = buildEstimate(city || country || "Azerbaijan", method, subtotal, locale);
  return NextResponse.json({ estimate }, { status: 200 });
}
