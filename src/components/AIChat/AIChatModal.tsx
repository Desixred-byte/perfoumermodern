"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

type FollowUpPrompt = {
  question: string;
  options?: string[];
  allowFreeText?: boolean;
  inputPlaceholder?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  followUp?: FollowUpPrompt | null;
};

const CHAT_PERSIST_KEY = "ai-chat-preserved-conversation-v1";

type AIChatModalProps = {
  isOpen: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onAfterClose?: () => void;
  locale: Locale;
  womanVideoUrl?: string;
  contactVideoUrl?: string;
  triggerLabel?: string;
};

type ModalTab = "chat" | "contact";

const copyByLocale: Record<
  Locale,
  {
    title: string;
    placeholder: string;
    tabChat: string;
    tabContact: string;
    introName: string;
    introLine1: string;
    introLine2: string;
    askAnything: string;
    suggestions: string;
    emptyHint: string;
    question1: string;
    question2: string;
    question3: string;
    question4: string;
    thinking: string;
    error: string;
    contactTitle: string;
    contactBody: string;
    contactEmailLabel: string;
    contactWhatsappLabel: string;
    contactHoursLabel: string;
    contactHoursValue: string;
    contactLocationLabel: string;
    contactLocationValue: string;
    contactDeveloperLabel: string;
    contactDeveloperValue: string;
  }
> = {
  az: {
    title: "Perfoumer-ə xoş gəlmisiniz.",
    placeholder: "Sualınızı yazın...",
    tabChat: "Çat",
    tabContact: "Əlaqə",
    introName: "Remi",
    introLine1: "Perfoumer-ə xoş gəlmisiniz.",
    introLine2: "Zövqünüzə uyğun seçimləri tapmaq və sayt üzrə sizi yönləndirmək üçün buradayam.",
    askAnything: "İstədiyinizi soruşun...",
    suggestions: "Hazır suallar",
    emptyHint: "Ətir, sifariş, çatdırılma və qaytarma barədə yaza bilərsiniz.",
    question1: "Hesabımda sifarişləri harada görürəm?",
    question2: "Mənə ədviyyatlı unisex ətirlər tövsiyə et",
    question3: "Çatdırılma və ödəniş necə işləyir?",
    question4: "Qaytarma qaydası necədir?",
    thinking: "Düşünürəm...",
    error: "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    contactTitle: "Perfoumer komandası ilə birbaşa əlaqə saxlayın.",
    contactBody: "Email və ya WhatsApp ilə sürətli yazın.",
    contactEmailLabel: "Email",
    contactWhatsappLabel: "WhatsApp",
    contactHoursLabel: "İş saatları",
    contactHoursValue: "Həftəiçi 10:00 - 19:00",
    contactLocationLabel: "Baza",
    contactLocationValue: "Bakı, Azərbaycan",
    contactDeveloperLabel: "Vebsayt və AI",
    contactDeveloperValue: "Bakhishov Brands tərəfindən hazırlanıb",
  },
  en: {
    title: "How can I help?",
    placeholder: "Ask me anything...",
    tabChat: "Chat",
    tabContact: "Contact",
    introName: "Remi",
    introLine1: "Checking out Perfoumer.",
    introLine2: "I can walk you through what happened here.",
    askAnything: "Ask me anything...",
    suggestions: "Quick questions",
    emptyHint: "Ask about perfumes, orders, shipping, and returns.",
    question1: "Where can I see my orders?",
    question2: "Suggest spicy unisex perfumes",
    question3: "How does shipping and payment work?",
    question4: "What is your return policy?",
    thinking: "Thinking...",
    error: "Something went wrong. Please try again.",
    contactTitle: "Reach Perfoumer directly.",
    contactBody: "Email or WhatsApp works best.",
    contactEmailLabel: "Email",
    contactWhatsappLabel: "WhatsApp",
    contactHoursLabel: "Support hours",
    contactHoursValue: "Weekdays 10:00 - 19:00",
    contactLocationLabel: "Base",
    contactLocationValue: "Baku, Azerbaijan",
    contactDeveloperLabel: "Website & AI",
    contactDeveloperValue: "Developed by Bakhishov Brands",
  },
  ru: {
    title: "Чем я могу помочь?",
    placeholder: "Напишите ваш вопрос...",
    tabChat: "Чат",
    tabContact: "Контакт",
    introName: "Remi",
    introLine1: "Вы смотрите Perfoumer.",
    introLine2: "Могу быстро провести по сайту и разделам.",
    askAnything: "Спросите что угодно...",
    suggestions: "Быстрые вопросы",
    emptyHint: "Спросите про ароматы, заказы, доставку и возврат.",
    question1: "Где посмотреть мои заказы?",
    question2: "Посоветуйте пряные унисекс ароматы",
    question3: "Как работают доставка и оплата?",
    question4: "Какие условия возврата?",
    thinking: "Думаю...",
    error: "Произошла ошибка. Попробуйте еще раз.",
    contactTitle: "Свяжитесь с Perfoumer напрямую.",
    contactBody: "Быстрее всего через email или WhatsApp.",
    contactEmailLabel: "Email",
    contactWhatsappLabel: "WhatsApp",
    contactHoursLabel: "Часы поддержки",
    contactHoursValue: "Будни 10:00 - 19:00",
    contactLocationLabel: "База",
    contactLocationValue: "Баку, Азербайджан",
    contactDeveloperLabel: "Сайт и AI",
    contactDeveloperValue: "Разработано Bakhishov Brands",
  },
};

const CONTACT_EMAIL = "info@perfoumer.az";
const CONTACT_WHATSAPP_LABEL = "+994 50 707 80 70";
const CONTACT_WHATSAPP_URL = "https://wa.me/994507078070";
const DEVELOPER_WHATSAPP_URL = "https://wa.me/bakhishov";

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type RecommendationCard = {
  kind: "perfume" | "internal-link";
  name: string;
  details: string;
  href: string;
};

function isLikelyPerfumeContext(text: string): boolean {
  return /(perfume|fragrance|scent|notes?|ətir|qoxu|дух|аромат)/iu.test(text);
}

function titleFromInternalPath(path: string): string {
  if (path.startsWith("/catalog")) return "Catalog";
  if (path.startsWith("/brands")) return "Brands";
  if (path.startsWith("/wishlist")) return "Wishlist";
  if (path.startsWith("/compare")) return "Compare";
  if (path.startsWith("/cart")) return "Cart";
  if (path.startsWith("/account")) return "Account";
  if (path.startsWith("/qoxunu")) return "Scent Quiz";
  if (path.startsWith("/perfumes/")) {
    const slug = path.split("/")[2] || "perfume";
    return slug
      .split("-")
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(" ");
  }

  return "Open page";
}

function perfumeImageCandidates(href: string): string[] {
  if (!href.startsWith("/perfumes/")) return [];
  const slug = href.replace("/perfumes/", "").split(/[?#]/)[0];
  if (!slug) return [];
  const encoded = encodeURIComponent(slug);
  return [
    `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.png`,
    `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.jpg`,
    `https://perfoumer-cdn.vercel.app/perfumes/${encoded}.webp`,
  ];
}

function PerfumeThumb({ href, name, imageSrc }: { href: string; name: string; imageSrc?: string }) {
  const sources = useMemo(() => (imageSrc ? [imageSrc] : perfumeImageCandidates(href)), [href, imageSrc]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const currentSrc = sources[sourceIndex] || "";

  return (
    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md">
      {!failed && currentSrc ? (
        <>
          {!isLoaded ? (
            <div className="absolute inset-0 animate-pulse rounded-md bg-zinc-100" />
          ) : null}
          <Image
            src={currentSrc}
            alt={name}
            fill
            sizes="64px"
            unoptimized
            className={`object-contain transition duration-500 group-hover:scale-[1.07] ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              if (sourceIndex < sources.length - 1) {
                setSourceIndex((prev) => prev + 1);
                setIsLoaded(false);
              } else {
                setFailed(true);
              }
            }}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-[11px] font-medium tracking-[0.08em] text-zinc-700">
          {initials || "PF"}
        </div>
      )}
    </div>
  );
}

function AnimatedDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <span className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0s" }} />
      <span className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0.1s" }} />
      <span className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0.2s" }} />
    </div>
  );
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <AnimatedDots />
      <span
        className="bg-[linear-gradient(110deg,rgba(161,161,170,0.72)_10%,rgba(255,255,255,0.98)_35%,rgba(161,161,170,0.72)_60%)] bg-[length:220%_100%] bg-clip-text text-transparent"
        style={{ animation: "thinkingShimmer 1.65s linear infinite" }}
      >
        {label}
      </span>
    </div>
  );
}

function sanitizeAssistantText(value: string): string {
  return value
    .replace(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/giu, (_match, _quote, href, inner) => {
      const label = String(inner).replace(/<[^>]+>/g, "").trim();
      if (/^tel:/iu.test(href)) return label || href.replace(/^tel:/iu, "");
      if (/^mailto:/iu.test(href)) return label || href.replace(/^mailto:/iu, "");
      if (!label) return href;
      return label === href ? label : `${label} (${href})`;
    })
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>\s*<p[^>]*>/giu, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripRichTextDecorators(value: string): string {
  return sanitizeAssistantText(value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function renderInlineRichText(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__)/g)
    .filter(Boolean)
    .map((segment, index) => {
      const boldMatch = segment.match(/^(?:\*\*|__)(.+)(?:\*\*|__)$/);
      if (!boldMatch) {
        return segment;
      }

      return (
        <strong key={`rich-${index}`} className="font-semibold text-white">
          {boldMatch[1]}
        </strong>
      );
    });
}

type RichTextBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "unordered-list"; items: string[] };

function parseRichTextBlocks(text: string): RichTextBlock[] {
  const normalized = sanitizeAssistantText(text).replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  return normalized
    .split(/\n{2,}/)
    .map((section): RichTextBlock => {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const orderedItems = lines.map((line) => line.match(/^\d+\.\s+(.+)$/u)?.[1] ?? null);
      if (orderedItems.length > 0 && orderedItems.every(Boolean)) {
        return { type: "ordered-list" as const, items: orderedItems as string[] };
      }

      const unorderedItems = lines.map((line) => line.match(/^[-*]\s+(.+)$/u)?.[1] ?? null);
      if (unorderedItems.length > 0 && unorderedItems.every(Boolean)) {
        return { type: "unordered-list" as const, items: unorderedItems as string[] };
      }

      return { type: "paragraph" as const, lines };
    })
    .filter((block) => block.type !== "paragraph" || block.lines.length > 0);
}

function RichTextMessage({ text }: { text: string }) {
  const blocks = useMemo(() => parseRichTextBlocks(text), [text]);

  if (!blocks.length) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "ordered-list") {
          return (
            <ol
              key={`block-${blockIndex}`}
              className="list-decimal space-y-2 pl-5 text-[15px] leading-[1.45] text-zinc-100 marker:text-zinc-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`} className="pl-1">
                  {renderInlineRichText(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              key={`block-${blockIndex}`}
              className="list-disc space-y-2 pl-5 text-[15px] leading-[1.45] text-zinc-100 marker:text-zinc-400"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`} className="pl-1">
                  {renderInlineRichText(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="text-[15px] leading-[1.45] text-zinc-100">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`line-${blockIndex}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineRichText(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function ContactPanel({
  copy,
}: {
  copy: (typeof copyByLocale)[Locale];
}) {
  return (
    <div className="absolute bottom-24 left-6 right-6 z-10">
      <div className="mb-4">
        <p className="mb-1 text-[9px] font-medium uppercase tracking-[0.24em] text-white/45">Powered by</p>
        <DeveloperLogoLink className="opacity-80" />
      </div>
      <p className="text-[13px] text-white/72">{copy.tabContact}</p>
      <p className="mt-1 max-w-[88%] text-[20px] font-semibold leading-[1.12] text-white">{copy.contactTitle}</p>
      <p className="mt-3 max-w-[80%] text-[14px] leading-[1.45] text-zinc-300">{copy.contactBody}</p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{copy.contactEmailLabel}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-1 block text-[18px] font-medium leading-[1.3] text-white transition hover:text-zinc-200"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{copy.contactWhatsappLabel}</p>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-[18px] font-medium leading-[1.3] text-white transition hover:text-zinc-200"
          >
            {CONTACT_WHATSAPP_LABEL}
          </a>
        </div>
      </div>
    </div>
  );
}

function DeveloperLogoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={DEVELOPER_WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Open Bakhishov Brands WhatsApp"
      className={`group inline-flex shrink-0 items-center justify-center text-white transition duration-300 ease-out ${className}`.trim()}
    >
      <Image
        src="/BAKHISHOV.png"
        alt="Bakhishov Brands"
        width={853}
        height={76}
        sizes="120px"
        className="h-[12px] w-auto object-contain opacity-80 transition duration-300 [filter:brightness(0)_invert(1)] group-hover:opacity-100 group-hover:[filter:brightness(0)_invert(1)_drop-shadow(0_0_8px_rgba(255,255,255,0.28))] group-focus-visible:opacity-100 group-focus-visible:[filter:brightness(0)_invert(1)_drop-shadow(0_0_8px_rgba(255,255,255,0.28))]"
      />
    </a>
  );
}

function sanitizeFollowUpPrompt(value: unknown): FollowUpPrompt | null {
  if (!value || typeof value !== "object") return null;

  const prompt = value as {
    question?: unknown;
    options?: unknown;
    allowFreeText?: unknown;
    inputPlaceholder?: unknown;
  };

  const question = typeof prompt.question === "string" ? prompt.question.trim() : "";
  if (!question) return null;

  const options = Array.isArray(prompt.options)
    ? prompt.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()).filter(Boolean).slice(0, 4)
    : [];
  const allowFreeText = Boolean(prompt.allowFreeText);
  const inputPlaceholder =
    typeof prompt.inputPlaceholder === "string" ? prompt.inputPlaceholder.trim().slice(0, 90) : "";

  return {
    question,
    ...(options.length ? { options } : {}),
    ...(allowFreeText ? { allowFreeText } : {}),
    ...(inputPlaceholder ? { inputPlaceholder } : {}),
  };
}

function parseInternalLinkCards(text: string): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const seen = new Set<string>();
  const pathRegex = /(https?:\/\/(?:www\.)?(?:perfoumer\.az|perfoumerweb\.com))?(\/(?:catalog|brands|wishlist|compare|cart|account|qoxunu)(?:[/?#][^\s)]*)?)/giu;

  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(text)) !== null) {
    const href = match[2];
    if (seen.has(href)) continue;
    seen.add(href);

    cards.push({
      kind: "internal-link",
      name: titleFromInternalPath(href),
      details: href,
      href,
    });
  }

  return cards;
}

function parsePerfumeCards(text: string): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const seenNames = new Set<string>();
  const allowPerfumeCards = isLikelyPerfumeContext(text);
  const plainText = stripRichTextDecorators(text);

  const pushInternalLinks = () => {
    for (const linkCard of parseInternalLinkCards(text)) {
      const key = `${linkCard.kind}:${linkCard.href}`;
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      cards.push(linkCard);
    }
  };

  const addCard = (nameRaw: string, detailsRaw: string) => {
    if (!allowPerfumeCards) return;

    const name = stripRichTextDecorators(nameRaw).replace(/[.,;:!?]+$/g, "");
    const details = stripRichTextDecorators(detailsRaw).replace(/^[,\s]+/, "").replace(/[\s]+$/g, "");
    const words = name.split(/\s+/).filter(Boolean);

    if (!name || !details) return;
    if (name.includes("/") || name.includes("http")) return;
    if (words.length < 2 || words.length > 6) return;
    if (name.length < 4 || name.length > 60) return;

    const key = name.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);

    cards.push({ kind: "perfume", name, details, href: "/catalog" });
  };

  // Pattern 1: line-based recommendations (bullets or numbered lines).
  const lines = plainText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalized = line
      .replace(/^\d+\.\s*/, "")
      .replace(/^[-*]\s*/, "");

    const match = normalized.match(/^([^:–-]+?)\s*[:–-]\s*(.+)$/u);
    if (match) {
      addCard(match[1], match[2]);
    }
  }

  // Pattern 2: inline paragraph recommendations: "Brand Name Perfume - details ..."
  const compact = plainText.replace(/\s+/g, " ").trim();
  const inlinePattern =
    /([\p{Lu}][\p{L}\d'&.-]*(?:\s+[\p{Lu}][\p{L}\d'&.-]*){1,5})\s*[–-]\s*([^.;!?]+(?:[.;!?](?!\s*[\p{Lu}][\p{L}\d'&.-]*(?:\s+[\p{Lu}][\p{L}\d'&.-]*){1,5}\s*[–-])[^.;!?]*)*)/gu;

  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlinePattern.exec(compact)) !== null) {
    addCard(inlineMatch[1], inlineMatch[2]);
  }

  // Pattern 3: quoted perfume names in narrative text, e.g. Ajmal "Shadow for Her & Him".
  const quotedPattern =
    /([\p{Lu}][\p{L}\d'&.-]*(?:\s+[\p{Lu}][\p{L}\d'&.-]*){0,3})?\s*["“]([^"”]{3,80})["”]/gu;

  let quotedMatch: RegExpExecArray | null;
  while ((quotedMatch = quotedPattern.exec(compact)) !== null) {
    if (!allowPerfumeCards) continue;

    const maybeBrand = (quotedMatch[1] || "").trim();
    const perfumeCore = quotedMatch[2].trim();
    const perfumeName = maybeBrand ? `${maybeBrand} ${perfumeCore}` : perfumeCore;

    const afterStart = quotedMatch.index + quotedMatch[0].length;
    const trailing = compact.slice(afterStart, afterStart + 180);
    const detailMatch = trailing.match(/^\s*[,;:-]?\s*([^.!?]{8,140})/u);
    const details = detailMatch?.[1]?.trim() || "Tapmaq və detallara baxmaq üçün açın.";

    addCard(perfumeName, details);
  }

  pushInternalLinks();
  return cards.slice(0, 5);
}

function AssistantContent({
  text,
  onCardClick,
}: {
  text: string;
  onCardClick?: (href: string, kind: RecommendationCard["kind"]) => void;
}) {
  const cards = useMemo(() => parsePerfumeCards(text), [text]);
  const [resolvedByName, setResolvedByName] = useState<Record<string, { href: string; image: string; name: string }>>({});
  const visibleCards = useMemo(
    () =>
      cards.filter((card) => {
        if (card.kind === "internal-link") return true;
        return Boolean(resolvedByName[card.name.toLowerCase()]);
      }),
    [cards, resolvedByName]
  );

  const perfumeNamesToResolve = useMemo(
    () => cards.filter((card) => card.kind === "perfume").map((card) => card.name),
    [cards]
  );

  useEffect(() => {
    const perfumeNames = perfumeNamesToResolve.filter((name) => {
      const key = name.toLowerCase();
      if (resolvedByName[key]) return false;
      return true;
    });

    if (!perfumeNames.length) return;

    let isActive = true;

    (async () => {
      try {
        const response = await fetch("/api/perfumes/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: perfumeNames }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          items?: Array<{ requestName: string; slug: string; name: string; image: string }>;
        };

        if (!isActive || !Array.isArray(data.items)) return;

        setResolvedByName((prev) => {
          const next = { ...prev };
          for (const item of data.items ?? []) {
            const key = item.requestName.toLowerCase();
            next[key] = {
              href: `/perfumes/${item.slug}`,
              image: item.image,
              name: item.name,
            };
          }
          return next;
        });
      } catch {
        // Keep fallback card behavior if resolver fails.
      }
    })();

    return () => {
      isActive = false;
    };
  }, [perfumeNamesToResolve, resolvedByName]);

  if (visibleCards.length >= 1) {
    return (
      <div className="space-y-2">
        <RichTextMessage text={text} />
        <div className="space-y-2">
          {visibleCards.map((card, idx) => {
            const resolved = card.kind === "perfume" ? resolvedByName[card.name.toLowerCase()] : undefined;
            const href = resolved?.href || card.href;
            const imageSrc = resolved?.image;
            const displayName = resolved?.name || card.name;
            const isInternalLink = card.kind === "internal-link";

            return (
              <Link
                key={`${card.name}-${idx}`}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  onCardClick?.(href, card.kind);
                }}
                className={
                  isInternalLink
                    ? "group block rounded-lg border border-white/75 bg-white px-3 py-2 text-zinc-900 transition duration-300 hover:-translate-y-[1px]"
                    : "group relative block overflow-hidden rounded-xl border border-white/85 bg-white p-2.5 text-zinc-900 transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_26px_rgba(255,255,255,0.22)]"
                }
                style={{
                  opacity: 0,
                  animation: `suggestionCardIn 380ms cubic-bezier(0.22,1,0.36,1) ${Math.min(idx * 80, 360)}ms forwards`,
                }}
              >
                {isInternalLink ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[14px] font-medium text-zinc-900">{displayName}</p>
                    <span className="shrink-0 text-zinc-500 transition duration-300 group-hover:translate-x-1">
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                        <path d="M7.22 4.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 010-1.06z" />
                      </svg>
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="pointer-events-none absolute -left-24 top-0 h-full w-16 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-all duration-700 group-hover:left-[calc(100%+4rem)] group-hover:opacity-100" />
                    <div className="flex items-start gap-2.5">
                      <PerfumeThumb key={imageSrc || href} href={href} name={displayName} imageSrc={imageSrc} />

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-[14px] font-medium text-zinc-900">{displayName}</p>
                        <p
                          className="text-[12px] leading-[1.35] text-zinc-600"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {card.details}
                        </p>
                      </div>

                      <span className="mt-0.5 shrink-0 self-center text-zinc-500 transition duration-300 group-hover:translate-x-1">
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                          <path d="M7.22 4.22a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.06l-5.25 5.25a.75.75 0 11-1.06-1.06L11.94 10 7.22 5.28a.75.75 0 010-1.06z" />
                        </svg>
                      </span>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return <RichTextMessage text={text} />;
}

function useTypewriter(sourceText: string, shouldAnimate: boolean) {
  const [visibleText, setVisibleText] = useState(shouldAnimate ? "" : sourceText);

  useEffect(() => {
    let frameId: number | null = null;
    let timeoutId: number | null = null;

    if (!shouldAnimate) {
      frameId = window.requestAnimationFrame(() => {
        setVisibleText(sourceText);
      });

      return () => {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setVisibleText("");
      let index = 0;

      const step = () => {
        index += 2;
        setVisibleText(sourceText.slice(0, index));
        if (index < sourceText.length) {
          timeoutId = window.setTimeout(step, 16);
        }
      };

      timeoutId = window.setTimeout(step, 50);
    });

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [sourceText, shouldAnimate]);

  return visibleText;
}

function AnimatedAssistantText({
  text,
  animate,
  onCardClick,
}: {
  text: string;
  animate: boolean;
  onCardClick?: (href: string, kind: RecommendationCard["kind"]) => void;
}) {
  const hasCards = useMemo(() => parsePerfumeCards(text).length > 0, [text]);
  const visibleText = useTypewriter(text, animate);

  if (hasCards) {
    return <AssistantContent text={text} onCardClick={onCardClick} />;
  }

  if (animate && visibleText !== text) {
    return <RichTextMessage text={visibleText} />;
  }

  return <AssistantContent text={text} onCardClick={onCardClick} />;
}

function FollowUpPromptView({
  prompt,
  disabled,
  onOptionSelect,
}: {
  prompt: FollowUpPrompt;
  disabled: boolean;
  onOptionSelect: (option: string) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
        <p className="text-[14px] leading-[1.45] text-zinc-100">{renderInlineRichText(prompt.question)}</p>
      </div>

      {prompt.options?.length ? (
        <div className="flex flex-wrap gap-2">
          {prompt.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onOptionSelect(option)}
              disabled={disabled}
              className="rounded-full border border-white/20 bg-white/8 px-3 py-2 text-[12px] font-medium text-white transition hover:border-white/35 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AIChatModal({
  isOpen,
  onOpen,
  onClose,
  onAfterClose,
  locale,
  womanVideoUrl,
  contactVideoUrl,
  triggerLabel,
}: AIChatModalProps) {
  const router = useRouter();
  const copy = copyByLocale[locale];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("chat");
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [isBackTransitioning, setIsBackTransitioning] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const onAfterCloseRef = useRef(onAfterClose);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRafOneRef = useRef<number | null>(null);
  const openRafTwoRef = useRef<number | null>(null);

  useEffect(() => {
    onAfterCloseRef.current = onAfterClose;
  }, [onAfterClose]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CHAT_PERSIST_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { messages?: Message[]; locale?: Locale };
      if (parsed.locale !== locale || !Array.isArray(parsed.messages) || !parsed.messages.length) return;

      setMessages(parsed.messages);
      setTypingMessageId(null);
      window.sessionStorage.removeItem(CHAT_PERSIST_KEY);
    } catch {
      // Ignore malformed persisted data.
    }
  }, [locale]);

  const presetQuestions = useMemo(
    () => [copy.question1, copy.question2, copy.question3, copy.question4],
    [copy]
  );
  const activeFollowUp = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== "assistant" || !message.followUp?.question) continue;

      const hasLaterUserMessage = messages.slice(index + 1).some((nextMessage) => nextMessage.role === "user");
      if (!hasLaterUserMessage) {
        return { messageId: message.id, prompt: message.followUp };
      }
    }

    return null;
  }, [messages]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateViewport = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      if (backTimerRef.current) clearTimeout(backTimerRef.current);
      if (openRafOneRef.current !== null) cancelAnimationFrame(openRafOneRef.current);
      if (openRafTwoRef.current !== null) cancelAnimationFrame(openRafTwoRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("chat");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isCompactViewport) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isCompactViewport, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (openRafOneRef.current !== null) cancelAnimationFrame(openRafOneRef.current);
      if (openRafTwoRef.current !== null) cancelAnimationFrame(openRafTwoRef.current);

      // Force a collapse baseline first so reopening always animates, even under rapid toggles.
      setIsExpanded(false);
      setIsBackTransitioning(false);

      openRafOneRef.current = requestAnimationFrame(() => {
        openRafTwoRef.current = requestAnimationFrame(() => {
          setIsExpanded(true);
        });
      });
      return;
    }

    if (openRafOneRef.current !== null) cancelAnimationFrame(openRafOneRef.current);
    if (openRafTwoRef.current !== null) cancelAnimationFrame(openRafTwoRef.current);

    setIsExpanded(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onAfterCloseRef.current?.();
    }, 520);
  }, [isOpen]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const frameId = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: messages.length > 0 ? "smooth" : "auto",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen || !pendingNavigation) return;

    const timer = setTimeout(() => {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }, 560);

    return () => clearTimeout(timer);
  }, [isOpen, pendingNavigation, router]);

  const handleSendMessage = async (messageText: string = input) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    const requestStartedAt = Date.now();
    setActiveTab("chat");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: Date.now(),
    };

    const nextConversation = [...messages, userMessage];
    setMessages(nextConversation);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          locale,
          messages: nextConversation.map((message) => ({
            role: message.role,
            text: message.text,
            followUp: message.followUp ?? null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("AI chat request failed");
      }

      const data = (await response.json()) as { response?: string; followUp?: unknown };
      const remainingThinkingMs = Math.max(0, 650 - (Date.now() - requestStartedAt));
      if (remainingThinkingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingThinkingMs));
      }
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.response || copy.error,
        createdAt: Date.now(),
        followUp: sanitizeFollowUpPrompt(data.followUp),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTypingMessageId(assistantMessage.id);
      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      const duration = Math.min(2600, Math.max(900, assistantMessage.text.length * 18));
      typingResetTimerRef.current = setTimeout(() => {
        setTypingMessageId((current) => (current === assistantMessage.id ? null : current));
      }, duration);
    } catch {
      const remainingThinkingMs = Math.max(0, 650 - (Date.now() - requestStartedAt));
      if (remainingThinkingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingThinkingMs));
      }
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        text: copy.error,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setTypingMessageId(errorMessage.id);
      if (typingResetTimerRef.current) clearTimeout(typingResetTimerRef.current);
      typingResetTimerRef.current = setTimeout(() => {
        setTypingMessageId((current) => (current === errorMessage.id ? null : current));
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionNavigate = (href: string, kind: RecommendationCard["kind"]) => {
    if (kind === "perfume") {
      try {
        window.sessionStorage.setItem(
          CHAT_PERSIST_KEY,
          JSON.stringify({ messages, locale })
        );
      } catch {
        // Ignore storage errors.
      }
    }

    setPendingNavigation(href);
    onClose();
  };

  const handleBackToHero = () => {
    if (isBackTransitioning) return;

    setIsBackTransitioning(true);
    if (backTimerRef.current) clearTimeout(backTimerRef.current);

    backTimerRef.current = setTimeout(() => {
      setMessages([]);
      setInput("");
      setIsLoading(false);
      setActiveTab("chat");
      setTypingMessageId(null);
      setIsBackTransitioning(false);

      try {
        window.sessionStorage.removeItem(CHAT_PERSIST_KEY);
      } catch {
        // Ignore storage errors.
      }
    }, 220);
  };

  const frameInset = isCompactViewport ? 12 : 24;
  const availableWidth = `calc(100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - ${
    frameInset * 2
  }px)`;
  const availableHeight = `calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - ${
    frameInset * 2
  }px)`;

  const panelStyle: CSSProperties = {
    width: isExpanded ? (isCompactViewport ? availableWidth : 420) : 220,
    height: isExpanded ? (isCompactViewport ? availableHeight : 640) : 56,
    borderRadius: isExpanded ? (isCompactViewport ? 24 : 28) : 999,
    maxWidth: availableWidth,
    maxHeight: availableHeight,
    transformOrigin: "right bottom",
    boxShadow: isExpanded
      ? "0 26px 70px rgba(0,0,0,0.45), 0 10px 24px rgba(0,0,0,0.35)"
      : "0 10px 22px rgba(0,0,0,0.28)",
    transform: "translateZ(0)",
    willChange: "width, height, border-radius, transform, opacity",
    contain: "layout paint",
    transition: isExpanded
      ? "width 420ms cubic-bezier(0.22,1,0.36,1), height 420ms cubic-bezier(0.22,1,0.36,1) 180ms, border-radius 320ms ease 120ms, box-shadow 260ms ease"
      : "height 380ms cubic-bezier(0.22,1,0.36,1), width 320ms cubic-bezier(0.22,1,0.36,1) 120ms, border-radius 280ms ease 80ms, box-shadow 220ms ease",
    right: `calc(env(safe-area-inset-right, 0px) + ${frameInset}px)`,
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${frameInset}px)`,
  };
  const composerPlaceholder =
    activeFollowUp?.prompt.allowFreeText && activeFollowUp.prompt.inputPlaceholder
      ? activeFollowUp.prompt.inputPlaceholder
      : messages.length === 0
        ? copy.askAnything
        : copy.placeholder;
  const isHeroMode = messages.length === 0;
  const showContactView = isHeroMode && activeTab === "contact";
  const showComposer = activeTab === "chat";
  const shouldUseFocusedModal = isCompactViewport;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 ${shouldUseFocusedModal ? "bg-black/35 backdrop-blur-sm" : "bg-transparent"}`}
        onClick={shouldUseFocusedModal ? onClose : undefined}
        style={{
          opacity: isExpanded && shouldUseFocusedModal ? 1 : 0,
          transition: isExpanded ? "opacity 220ms ease-out" : "opacity 220ms ease-in",
          pointerEvents: isExpanded && shouldUseFocusedModal ? "auto" : "none",
        }}
      />

      <div
        className={`fixed z-50 overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 transform-gpu will-change-transform [transition:transform_640ms_cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded ? "scale-100" : isCompactViewport ? "scale-100" : "hover:scale-[1.03]"
        }`}
        style={panelStyle}
      >
        <button
          onClick={onOpen}
          className="absolute inset-0 z-40"
          style={{
            opacity: isExpanded ? 0 : 1,
            pointerEvents: isExpanded ? "none" : "auto",
          }}
          aria-label={triggerLabel || copy.title}
        />

        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center gap-2 text-white"
          style={{
            opacity: isExpanded ? 0 : 1,
            transform: isExpanded
              ? isCompactViewport
                ? "translateY(8px) scale(0.96)"
                : "translate(-104px, 236px) scale(0.9)"
              : "translate(0, 0) scale(1)",
            transition: isExpanded
              ? "opacity 300ms ease 210ms, transform 640ms cubic-bezier(0.22,1,0.36,1) 40ms"
              : "opacity 260ms ease 160ms, transform 420ms cubic-bezier(0.22,1,0.36,1) 80ms",
          }}
        >
          <AnimatedDots />
          <span
            className="text-sm"
            style={{
              filter: isExpanded ? "blur(6px)" : "blur(0px)",
              transition: isExpanded ? "filter 280ms ease" : "filter 200ms ease",
            }}
          >
            {triggerLabel || copy.title}
          </span>
        </div>

        <div
          className="relative flex h-full flex-col overflow-hidden"
          style={{
            pointerEvents: isExpanded ? "auto" : "none",
            opacity: isExpanded ? 1 : 0,
            transform: "translateY(0)",
            willChange: "opacity, transform",
            transition: isExpanded
              ? "opacity 240ms ease 500ms"
              : "opacity 140ms ease 20ms",
          }}
        >
          {messages.length === 0 ? (
            <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-black sm:rounded-[28px]">
              {womanVideoUrl ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: isExpanded && activeTab === "chat" ? 1 : 0,
                    transition: "opacity 320ms ease",
                    willChange: "opacity",
                  }}
                >
                  <source src={womanVideoUrl} type="video/mp4" />
                </video>
              ) : null}
              {contactVideoUrl ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: isExpanded && activeTab === "contact" ? 1 : 0,
                    transition: "opacity 320ms ease",
                    willChange: "opacity",
                  }}
                >
                  <source src={contactVideoUrl} type="video/mp4" />
                </video>
              ) : null}

              {showContactView ? (
                <>
                  <div className="absolute inset-0 bg-black/18" />
                  <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black via-black/88 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black via-black/95 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/22 to-black/92" />
              )}

              <div className="absolute left-5 top-4 z-10 flex items-center gap-3 text-[14px] sm:left-6 sm:top-5 sm:text-[15px]">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`transition ${
                    activeTab === "chat" ? "font-medium text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {copy.tabChat}
                </button>
                <button
                  onClick={() => setActiveTab("contact")}
                  className={`transition ${
                    activeTab === "contact" ? "font-medium text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {copy.tabContact}
                </button>
              </div>

              <button
                onClick={onClose}
                className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white sm:right-4 sm:top-4 sm:h-9 sm:w-9"
                aria-label="Close chat"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>

              {activeTab === "chat" ? (
                <div className="absolute bottom-24 left-5 right-5 z-10 sm:left-6 sm:right-6">
                  <p className="text-[13px] text-white/75">{copy.introName}</p>
                  <p className="mt-1 max-w-[95%] text-[18px] font-semibold leading-[1.1] text-white sm:max-w-[90%] sm:text-[20px] sm:leading-[1.12]">
                    {copy.introLine1}
                  </p>
                  <p className="mt-1 max-w-[95%] text-[18px] font-semibold leading-[1.1] text-white sm:max-w-[90%] sm:text-[20px] sm:leading-[1.12]">
                    {copy.introLine2}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendMessage(presetQuestions[0])}
                      className="rounded-full bg-white px-3 py-2 text-[11px] font-medium text-black transition hover:bg-zinc-100 sm:px-4 sm:text-[12px]"
                    >
                      {presetQuestions[0]}
                    </button>
                    <button
                      onClick={() => handleSendMessage(presetQuestions[1])}
                      className="rounded-full bg-zinc-700/90 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-zinc-600 sm:px-4 sm:text-[12px]"
                    >
                      {presetQuestions[1]}
                    </button>
                    <button
                      onClick={() => handleSendMessage(presetQuestions[2])}
                      className="rounded-full bg-zinc-800/90 px-3 py-2 text-[11px] font-medium text-zinc-200 transition hover:bg-zinc-700 sm:px-4 sm:text-[12px]"
                    >
                      {presetQuestions[2]}
                    </button>
                  </div>
                </div>
              ) : (
                <ContactPanel copy={copy} />
              )}

            </div>
          ) : (
            <>
              <div
                className="flex items-center justify-between px-3 pt-3 sm:px-3 sm:pt-3"
                style={{
                  animation: isBackTransitioning
                    ? "chatBackOut 220ms ease forwards"
                    : "fadeUp 220ms ease-out 30ms both",
                }}
              >
                <button
                  onClick={handleBackToHero}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition-all duration-300 ease-out hover:bg-zinc-800 hover:text-white active:scale-95 ${
                    isBackTransitioning ? "pointer-events-none scale-90 opacity-0" : "scale-100 opacity-100"
                  }`}
                  aria-label="Back"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 transition-transform duration-300 ${
                      isBackTransitioning ? "-translate-x-1" : "translate-x-0"
                    }`}
                    fill="currentColor"
                  >
                    <path d="M12.79 4.23a.75.75 0 010 1.06L8.06 10l4.73 4.71a.75.75 0 11-1.06 1.06l-5.25-5.24a.75.75 0 010-1.06l5.25-5.24a.75.75 0 011.06 0z" />
                  </svg>
                </button>

                <button
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  aria-label="Close chat"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                    <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                  </svg>
                </button>
              </div>

              <div
                ref={messagesContainerRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-24 pt-3 sm:space-y-4 sm:px-4 sm:pb-28 sm:pt-4"
                style={{
                  animation: isBackTransitioning
                    ? "chatBackOut 220ms ease forwards"
                    : "chatDrop 260ms ease-out 60ms both",
                  scrollbarGutter: "stable",
                }}
              >
                {messages.map((message) => (
                  <div key={message.id} className="space-y-1" style={{ animation: "fadeUp 220ms ease-out" }}>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{message.role === "user" ? "You" : copy.introName}</span>
                      <span className="text-[11px] text-zinc-500">{formatMessageTime(message.createdAt)}</span>
                    </div>
                    <div
                      className={`text-[15px] leading-[1.45] ${message.role === "user" ? "text-zinc-200" : "text-zinc-100"}`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          {message.text.trim() ? (
                            <AnimatedAssistantText
                              text={message.text}
                              animate={typingMessageId === message.id && !isLoading}
                              onCardClick={handleSuggestionNavigate}
                            />
                          ) : null}
                          {activeFollowUp?.messageId === message.id ? (
                            <FollowUpPromptView
                              prompt={activeFollowUp.prompt}
                              disabled={isLoading}
                              onOptionSelect={(option) => {
                                if (isLoading) return;
                                handleSendMessage(option);
                              }}
                            />
                          ) : null}
                        </>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}

                {isLoading ? (
                  <div className="space-y-2" style={{ animation: "fadeUp 220ms ease-out" }}>
                    <div className="text-sm text-zinc-300">{copy.introName}</div>
                    <ThinkingIndicator label={copy.thinking} />
                  </div>
                ) : null}
              </div>
            </>
          )}

          {showComposer ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black via-black/96 to-transparent sm:h-28" />

              <div
                className="absolute bottom-4 left-4 right-4 z-20 sm:bottom-5 sm:left-5 sm:right-5"
                style={{
                  opacity: isExpanded ? 1 : 0,
                  transform: isExpanded ? "translateY(0) scale(1)" : "translateY(0) scale(0.97)",
                  filter: isExpanded ? "blur(0px)" : "blur(6px)",
                  transition: isExpanded
                    ? "opacity 240ms ease 520ms, transform 360ms cubic-bezier(0.22,1,0.36,1) 480ms, filter 280ms ease 500ms"
                    : "opacity 280ms ease 30ms, transform 420ms cubic-bezier(0.22,1,0.36,1) 20ms, filter 300ms ease 20ms",
                }}
              >
                <div className="flex items-center gap-3 px-1 py-1 text-white/80">
                  <AnimatedDots />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoading) {
                        handleSendMessage();
                      }
                    }}
                    placeholder={composerPlaceholder}
                    className="w-full bg-transparent text-[13px] text-zinc-300 outline-none placeholder:text-zinc-400 sm:text-[12px]"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes chatDrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes suggestionCardIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes chatBackOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(8px);
          }
        }

        @keyframes thinkingShimmer {
          from {
            background-position: 200% 0;
          }
          to {
            background-position: -20% 0;
          }
        }
      `}</style>
    </>
  );
}
