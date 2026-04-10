"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type PerfumeHeroCoverProps = {
  src: string;
  alt: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

const DEFAULT_PALETTE: [Rgb, Rgb, Rgb] = [
  { r: 229, g: 225, b: 215 },
  { r: 216, g: 211, b: 202 },
  { r: 204, g: 199, b: 191 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const colorDistance = (a: Rgb, b: Rgb) =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

const soften = (input: Rgb) => {
  const mix = 0.43;
  return {
    r: Math.round(input.r * (1 - mix) + 245 * mix),
    g: Math.round(input.g * (1 - mix) + 244 * mix),
    b: Math.round(input.b * (1 - mix) + 242 * mix),
  };
};

const toRgba = (input: Rgb, alpha: number) =>
  `rgba(${clamp(Math.round(input.r), 0, 255)}, ${clamp(Math.round(input.g), 0, 255)}, ${clamp(Math.round(input.b), 0, 255)}, ${alpha})`;

const buildGradientLayers = (palette: [Rgb, Rgb, Rgb]) => {
  const [a, b, c] = palette.map(soften);
  return {
    layerA: `radial-gradient(128% 92% at 16% 14%, ${toRgba(a, 0.62)} 0%, rgba(255,255,255,0) 58%)`,
    layerB: `radial-gradient(112% 86% at 84% 22%, ${toRgba(b, 0.44)} 0%, rgba(255,255,255,0) 62%)`,
    layerC: `radial-gradient(120% 96% at 50% 94%, ${toRgba(c, 0.36)} 0%, rgba(255,255,255,0) 64%)`,
    base: "linear-gradient(180deg,#f1f1ef 0%, #e5e3de 100%)",
  };
};

function extractPalette(image: HTMLImageElement): [Rgb, Rgb, Rgb] | null {
  const canvas = document.createElement("canvas");
  const width = 44;
  const height = 44;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return null;
  }

  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const buckets = new Map<string, { r: number; g: number; b: number; weight: number }>();

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.2) {
      continue;
    }

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = (r + g + b) / 3;
    const pixelWeight = alpha * (0.45 + saturation * 1.35) * (brightness < 35 ? 0.35 : 1);

    const key = `${Math.floor(r / 28)}-${Math.floor(g / 28)}-${Math.floor(b / 28)}`;
    const current = buckets.get(key);
    if (!current) {
      buckets.set(key, {
        r: r * pixelWeight,
        g: g * pixelWeight,
        b: b * pixelWeight,
        weight: pixelWeight,
      });
    } else {
      current.r += r * pixelWeight;
      current.g += g * pixelWeight;
      current.b += b * pixelWeight;
      current.weight += pixelWeight;
    }
  }

  const ordered = Array.from(buckets.values())
    .filter((item) => item.weight > 0.15)
    .map((item) => ({
      r: item.r / item.weight,
      g: item.g / item.weight,
      b: item.b / item.weight,
      score: item.weight,
    }))
    .sort((left, right) => right.score - left.score);

  if (!ordered.length) {
    return null;
  }

  const selected: Rgb[] = [];
  for (const candidate of ordered) {
    const color = { r: candidate.r, g: candidate.g, b: candidate.b };
    if (selected.every((existing) => colorDistance(existing, color) > 42)) {
      selected.push(color);
    }
    if (selected.length === 3) {
      break;
    }
  }

  while (selected.length < 3) {
    selected.push(DEFAULT_PALETTE[selected.length]);
  }

  return [selected[0], selected[1], selected[2]];
}

export function PerfumeHeroCover({ src, alt }: PerfumeHeroCoverProps) {
  const [palette, setPalette] = useState<[Rgb, Rgb, Rgb]>(DEFAULT_PALETTE);

  useEffect(() => {
    let mounted = true;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    const applyDefault = () => {
      if (!mounted) {
        return;
      }
      setPalette(DEFAULT_PALETTE);
    };

    image.onload = () => {
      if (!mounted) {
        return;
      }

      try {
        const extracted = extractPalette(image);
        if (!extracted) {
          applyDefault();
          return;
        }
        setPalette(extracted);
      } catch {
        applyDefault();
      }
    };

    image.onerror = applyDefault;
    image.src = src;

    return () => {
      mounted = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  const gradients = useMemo(() => buildGradientLayers(palette), [palette]);

  return (
    <div className="relative overflow-hidden rounded-[2.15rem] p-8 shadow-[0_24px_70px_rgba(24,24,24,0.08)] ring-1 ring-white/70 md:p-12 xl:flex xl:h-[calc(100vh-10rem)] xl:items-center xl:justify-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: gradients.base }}
      />
      <div
        aria-hidden="true"
        className="perfume-cover-aura-layer perfume-cover-aura-layer-a pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ backgroundImage: gradients.layerA }}
      />
      <div
        aria-hidden="true"
        className="perfume-cover-aura-layer perfume-cover-aura-layer-b pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ backgroundImage: gradients.layerB }}
      />
      <div
        aria-hidden="true"
        className="perfume-cover-aura-layer perfume-cover-aura-layer-c pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ backgroundImage: gradients.layerC }}
      />
      <div
        aria-hidden="true"
        className="perfume-cover-overlay pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.46)_0%,rgba(255,255,255,0.2)_40%,rgba(247,246,243,0.38)_100%)]"
      />
      <Image
        src={src}
        alt={alt}
        width={900}
        height={1200}
        priority
        sizes="(max-width: 767px) 82vw, (max-width: 1279px) 72vw, 38vw"
        className="perfume-cover-image relative z-[1] mx-auto h-[420px] w-auto max-w-full object-contain drop-shadow-[0_28px_42px_rgba(0,0,0,0.18)] md:h-[560px] xl:h-[min(70vh,640px)] xl:max-w-[74%]"
      />
    </div>
  );
}
