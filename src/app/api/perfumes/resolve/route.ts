import { NextResponse } from "next/server";

import { getPerfumes } from "@/lib/catalog";

type ResolveRequest = {
  names?: string[];
};

type ResolveItem = {
  requestName: string;
  slug: string;
  name: string;
  image: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  if (query === candidate) return 1000;
  if (candidate.includes(query)) return 700 + query.length;
  if (query.includes(candidate)) return 500 + candidate.length;

  const queryWords = query.split(" ").filter(Boolean);
  const candidateWords = candidate.split(" ").filter(Boolean);

  let overlap = 0;
  for (const word of queryWords) {
    if (candidateWords.includes(word)) overlap += 1;
  }

  return overlap * 100;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ResolveRequest;
  const names = Array.isArray(body.names)
    ? body.names
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (!names.length) {
    return NextResponse.json({ items: [] as ResolveItem[] });
  }

  const perfumes = await getPerfumes();

  const indexed = perfumes.map((perfume) => {
    const byName = normalize(perfume.name);
    const byBrandName = normalize(`${perfume.brand} ${perfume.name}`);

    return {
      slug: perfume.slug,
      name: perfume.name,
      image: perfume.image,
      byName,
      byBrandName,
    };
  });

  const items: ResolveItem[] = [];

  for (const originalName of names) {
    const query = normalize(originalName);
    let best:
      | {
          slug: string;
          name: string;
          image: string;
          score: number;
        }
      | undefined;

    for (const perfume of indexed) {
      const score = Math.max(scoreMatch(query, perfume.byName), scoreMatch(query, perfume.byBrandName));
      if (!best || score > best.score) {
        best = {
          slug: perfume.slug,
          name: perfume.name,
          image: perfume.image,
          score,
        };
      }
    }

    if (best && best.score >= 200) {
      items.push({
        requestName: originalName,
        slug: best.slug,
        name: best.name,
        image: best.image,
      });
    }
  }

  return NextResponse.json({ items });
}
