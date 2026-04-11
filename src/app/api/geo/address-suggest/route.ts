import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Suggestion = {
  provider: "osm";
  description: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

function mapPhotonSuggestions(payload: unknown, country: string): Suggestion[] {
  const features =
    payload && typeof payload === "object" && Array.isArray((payload as any).features)
      ? ((payload as any).features as any[])
      : [];

  const filtered = country
    ? features.filter((feature) => String(feature?.properties?.countrycode || "").toLowerCase() === country)
    : features;

  return filtered
    .slice(0, 6)
    .map((feature) => {
      const props = feature?.properties ?? {};
      const name = String(props.name ?? "").trim();
      const city = String(props.city ?? props.county ?? props.state ?? "").trim();
      const countryName = String(props.country ?? "").trim();
      const parts = [name, city, countryName].filter(Boolean);
      const description = parts.join(", ");

      return {
        provider: "osm" as const,
        description,
        line1: description || name,
        city,
        postalCode: "",
        country: countryName,
      };
    })
    .filter((item) => item.description.length > 0);
}

function mapNominatimSuggestions(payload: unknown): Suggestion[] {
  const rows = Array.isArray(payload) ? payload : [];
  return rows
    .slice(0, 6)
    .map((item) => {
      const address = item?.address ?? {};
      const city = address.city || address.town || address.village || address.state || "";
      return {
        provider: "osm" as const,
        description: String(item?.display_name ?? "").trim(),
        line1: String(item?.display_name ?? "").trim(),
        city: String(city ?? "").trim(),
        postalCode: String(address.postcode ?? "").trim(),
        country: String(address.country ?? "").trim(),
      };
    })
    .filter((item) => item.description.length > 0);
}

function buildQueryVariants(query: string, country: string): string[] {
  const trimmed = query.trim();
  const noHouseNumber = trimmed.replace(/\s+\d+[a-zA-Z]?$/g, "").trim();
  const normalizedSpaces = trimmed.replace(/\s+/g, " ");

  const variants = new Set<string>([
    normalizedSpaces,
    noHouseNumber,
  ]);

  if (country === "az") {
    variants.add(`${normalizedSpaces}, Baku`);
    variants.add(`${noHouseNumber}, Baku`);
    variants.add(`${normalizedSpaces}, Azerbaijan`);
    variants.add(`${noHouseNumber}, Azerbaijan`);
    variants.add(`${normalizedSpaces}, Baku, Azerbaijan`);
    variants.add(`${noHouseNumber}, Baku, Azerbaijan`);
  }

  return Array.from(variants).filter((value) => value.length >= 3);
}

function normalizePhotonLang(locale: string): string {
  const value = locale.trim().toLowerCase();
  if (value === "de" || value === "en" || value === "fr") {
    return value;
  }

  return "en";
}

async function runPhoton(query: string, locale: string, country: string): Promise<Suggestion[]> {
  const lang = normalizePhotonLang(locale);
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=${encodeURIComponent(lang)}`;
  const photonResponse = await fetch(photonUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "PerfoumerCheckout/1.0 (Address Autocomplete)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });

  if (!photonResponse.ok) {
    return [];
  }

  const photonPayload = await photonResponse.json().catch(() => ({}));
  return mapPhotonSuggestions(photonPayload, country);
}

async function runNominatim(query: string, locale: string, country: string): Promise<Suggestion[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    q: query,
    "accept-language": locale,
  });

  if (country) {
    params.set("countrycodes", country);
  }

  const endpoint = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const upstream = await fetch(endpoint, {
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "PerfoumerCheckout/1.0 (Address Autocomplete)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });

  if (!upstream.ok) {
    return [];
  }

  const payload = await upstream.json().catch(() => []);
  return mapNominatimSuggestions(payload);
}

function normalizeCountryCode(input: string | null): string {
  const value = (input || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "az") return "az";

  if (
    value.includes("azerbaijan") ||
    value.includes("azərbaycan") ||
    value.includes("азербайджан")
  ) {
    return "az";
  }

  return "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const locale = (url.searchParams.get("locale") || "az").trim();
  const country = normalizeCountryCode(url.searchParams.get("country"));

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const queryVariants = buildQueryVariants(q, country);

  // 1) Fuzzy autocomplete via Photon (handles misspellings like "sovgiyar abdul").
  for (const query of queryVariants) {
    try {
      const photonSuggestions = await runPhoton(query, locale, country);
      if (photonSuggestions.length > 0) {
        return NextResponse.json({ suggestions: photonSuggestions }, { status: 200 });
      }
    } catch {
      // Continue to next variant/provider.
    }
  }

  // 2) Structured geocoding fallback via Nominatim.
  for (const query of queryVariants) {
    try {
      const suggestions = await runNominatim(query, locale, country);
      if (suggestions.length > 0) {
        return NextResponse.json({ suggestions }, { status: 200 });
      }
    } catch {
      // Continue to next variant.
    }
  }

  return NextResponse.json({ suggestions: [] }, { status: 200 });
}
