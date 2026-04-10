import path from "node:path";
import { readFileSync } from "node:fs";

import { NextResponse } from "next/server";

type AvatarModerationRequest = {
  imageUrl?: string;
};

type OpenAIModerationResponse = {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
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

  const root = process.cwd();
  const fromEnv = parseEnvFile(path.join(root, ".env"));
  const fromEnvLocal = parseEnvFile(path.join(root, ".env.local"));

  return (fromEnvLocal[key] || fromEnv[key] || "").trim();
}

function parseReasons(result: NonNullable<OpenAIModerationResponse["results"]>[number]) {
  const categories = result.categories ?? {};
  const scores = result.category_scores ?? {};

  const dangerousKeys = [
    "sexual",
    "sexual/minors",
    "violence/graphic",
    "self-harm/intent",
    "self-harm/instructions",
  ];

  const reasons: string[] = [];

  for (const key of dangerousKeys) {
    if (categories[key]) {
      reasons.push(key);
      continue;
    }

    const score = scores[key];
    if (typeof score === "number" && score >= 0.45) {
      reasons.push(key);
    }
  }

  return reasons;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AvatarModerationRequest;
  const imageUrl = body.imageUrl?.trim();

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  const apiKey = getEnvValue("QOXUNU_OPENAI_API_KEY") || getEnvValue("OPENAI_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "openai_api_key_missing" }, { status: 503 });
  }

  const moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        },
      ],
    }),
  });

  if (!moderationResponse.ok) {
    return NextResponse.json({ error: "moderation_unavailable" }, { status: 503 });
  }

  const moderationJson = (await moderationResponse.json()) as OpenAIModerationResponse;
  const result = moderationJson.results?.[0];

  if (!result) {
    return NextResponse.json({ error: "invalid_moderation_response" }, { status: 503 });
  }

  const reasons = parseReasons(result);
  const allowed = !result.flagged && reasons.length === 0;

  return NextResponse.json({
    allowed,
    reasons,
  });
}
