import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

type ChatRequest = {
  message: string;
  locale: string;
  messages?: Array<{
    role: "user" | "assistant";
    text: string;
    followUp?: {
      question?: string;
      options?: string[];
      allowFreeText?: boolean;
      inputPlaceholder?: string;
    } | null;
  }>;
};

type StructuredFollowUp = {
  question: string;
  options: string[];
  allowFreeText: boolean;
  inputPlaceholder: string;
};

type StructuredAssistantResponse = {
  answer: string;
  followUp: StructuredFollowUp;
};

type Perfume = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  image: string;
  inStock: boolean;
  sizes: Array<{ ml: number; price: number }>;
  noteSlugs?: {
    top?: string[];
    heart?: string[];
    base?: string[];
  };
};

let cachedPerfumes: Perfume[] = [];
const DAILY_VARIATION_SEED = new Date().toISOString().slice(0, 10);
const SUPPORT_EMAIL = "info@perfoumer.az";
const SUPPORT_WHATSAPP = "+994 50 707 80 70";
const DEVELOPER_WHATSAPP_URL = "https://wa.me/bakhishov";
const DEVELOPER_PHONE = "+994 55 575 77 77";

async function loadPerfumes(): Promise<Perfume[]> {
  if (cachedPerfumes.length > 0) return cachedPerfumes;

  try {
    const filePath = path.join(process.cwd(), "data", "admin", "perfumes.json");
    const data = await readFile(filePath, "utf-8");
    cachedPerfumes = JSON.parse(data);
    return cachedPerfumes;
  } catch (error) {
    console.error("Failed to load perfumes:", error);
    return [];
  }
}

function normalizeText(value: string): string {
  return value
    .replace(/[ıİ]/g, "i")
    .replace(/[əƏ]/g, "e")
    .replace(/[ğĞ]/g, "g")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function rotateBySeed<T>(items: T[], seed: string): T[] {
  if (!items.length) return items;
  const offset = hashString(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function humanizeToken(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function perfumeNoteText(perfume: Perfume): string {
  const top = perfume.noteSlugs?.top?.map(humanizeToken) ?? [];
  const heart = perfume.noteSlugs?.heart?.map(humanizeToken) ?? [];
  const base = perfume.noteSlugs?.base?.map(humanizeToken) ?? [];

  return [...top, ...heart, ...base].join(", ");
}

function perfumeNotesSummary(perfume: Perfume): string {
  const groups: string[] = [];
  const top = perfume.noteSlugs?.top?.map(humanizeToken) ?? [];
  const heart = perfume.noteSlugs?.heart?.map(humanizeToken) ?? [];
  const base = perfume.noteSlugs?.base?.map(humanizeToken) ?? [];

  if (top.length) groups.push(`top: ${top.join(", ")}`);
  if (heart.length) groups.push(`heart: ${heart.join(", ")}`);
  if (base.length) groups.push(`base: ${base.join(", ")}`);

  return groups.join("; ");
}

function perfumeSizesSummary(perfume: Perfume): string {
  return perfume.sizes
    .slice(0, 4)
    .map((size) => `${size.ml}ml ${size.price} AZN`)
    .join(", ");
}

const FACET_KEYWORDS: Record<string, string[]> = {
  unisex: ["unisex", "uniseks", "унисекс"],
  women: ["women", "woman", "female", "qadin", "qadın", "жен", "женский"],
  men: ["men", "man", "male", "kisi", "kişi", "муж", "мужской"],
  spicy: ["spicy", "ədviyyat", "edviyyat", "прян", "hil", "cardamom", "istiot", "pepper", "darcin", "cinnamon", "mixek", "clove", "safran", "saffron"],
  woody: ["woody", "wood", "ağac", "agac", "sidr", "cedar", "sandal", "patchouli", "paçuli", "paculi", "cashmere wood"],
  amber: ["amber", "ənbər", "enber", "ambre"],
  citrus: ["citrus", "sitrus", "bergamot", "berqamot", "lemon", "limon", "orange", "portağal", "mandarin", "mandarin", "grapefruit"],
  fresh: ["fresh", "clean", "taze", "təravət", "teravet", "lavender", "lavanda", "marine", "green", "mint"],
  floral: ["floral", "çiçək", "cicek", "цвет", "rose", "gül", "yasemen", "jasmin", "jasmine", "iris", "tuberose"],
  sweet: ["sweet", "şirin", "sirin", "gourmand", "vanilla", "vanil", "caramel", "karamel", "tonka", "bal", "honey", "cacao", "chocolate"],
  musk: ["musk", "musc", "müşk", "muskus", "муск"],
  oud: ["oud", "oudh", "aoud", "agarwood", "ud"],
  leather: ["leather", "dəri", "deri", "кожа"],
  smoky: ["smoky", "smoke", "tüstü", "tustu", "дым", "incense", "buxur"],
};

function extractFacets(input: string): Set<string> {
  const normalized = normalizeText(input);
  const facets = new Set<string>();

  for (const [facet, keywords] of Object.entries(FACET_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      facets.add(facet);
    }
  }

  return facets;
}

function perfumeFacets(perfume: Perfume): Set<string> {
  return extractFacets(`${perfume.gender} ${perfumeNoteText(perfume)} ${perfume.brand} ${perfume.name}`);
}

function extractSearchWords(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function scorePerfume(perfume: Perfume, message: string): number {
  const normalizedMessage = normalizeText(message);
  const queryWords = extractSearchWords(message);
  const queryFacets = extractFacets(message);
  const byName = normalizeText(perfume.name);
  const byBrand = normalizeText(perfume.brand);
  const byBrandName = normalizeText(`${perfume.brand} ${perfume.name}`);
  const byNotes = normalizeText(perfumeNoteText(perfume));
  const byGender = normalizeText(perfume.gender);
  const facets = perfumeFacets(perfume);

  let score = 0;

  if (!normalizedMessage) return score;
  if (normalizedMessage === byBrandName) score += 1500;
  if (normalizedMessage === byName) score += 1350;
  if (byBrandName.includes(normalizedMessage)) score += 900 + normalizedMessage.length;
  if (byName.includes(normalizedMessage)) score += 780 + normalizedMessage.length;
  if (normalizedMessage.includes(byBrandName)) score += 700;
  if (normalizedMessage.includes(byName)) score += 620;

  for (const word of queryWords) {
    if (byName.includes(word)) {
      score += 150;
      continue;
    }
    if (byBrandName.includes(word)) {
      score += 120;
      continue;
    }
    if (byBrand.includes(word)) {
      score += 95;
      continue;
    }
    if (byNotes.includes(word)) {
      score += 85;
      continue;
    }
    if (byGender.includes(word)) {
      score += 75;
    }
  }

  for (const facet of queryFacets) {
    if (facets.has(facet)) {
      score += facet === "women" || facet === "men" || facet === "unisex" ? 160 : 130;
    }
  }

  if (perfume.inStock) score += 18;

  return score;
}

function selectRelevantPerfumes(message: string, perfumes: Perfume[]): Perfume[] {
  const ranked = perfumes
    .map((perfume) => ({
      perfume,
      score: scorePerfume(perfume, message),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return [];

  const bestScore = ranked[0]?.score ?? 0;
  if (bestScore < 170) {
    return [];
  }

  const pool = ranked.filter((entry) => entry.score >= Math.max(190, bestScore - 220)).slice(0, 24);
  const rotated = rotateBySeed(
    pool,
    `${normalizeText(message)}:${DAILY_VARIATION_SEED}:${Math.random().toString(36).slice(2, 8)}`
  );
  const selected: typeof pool = [];
  const seenBrands = new Set<string>();

  for (const entry of rotated) {
    const brandKey = normalizeText(entry.perfume.brand);
    if (!seenBrands.has(brandKey)) {
      selected.push(entry);
      seenBrands.add(brandKey);
    }
    if (selected.length >= 6) break;
  }

  if (selected.length < 6) {
    for (const entry of rotated) {
      if (selected.some((item) => item.perfume.slug === entry.perfume.slug)) continue;
      selected.push(entry);
      if (selected.length >= 6) break;
    }
  }

  return selected.map((entry) => entry.perfume);
}

function buildCatalogContext(message: string, perfumes: Perfume[]): string {
  const relevantPerfumes = selectRelevantPerfumes(message, perfumes);
  if (!relevantPerfumes.length) {
    return "No strong direct catalog matches were ranked for this message.";
  }

  return relevantPerfumes
    .map((perfume, index) => {
      const notes = perfumeNotesSummary(perfume);
      const sizes = perfumeSizesSummary(perfume);

      return [
        `${index + 1}. ${perfume.brand} ${perfume.name}`,
        `slug: ${perfume.slug}`,
        `gender: ${perfume.gender || "Unknown"}`,
        `stock: ${perfume.inStock ? "in stock" : "out of stock"}`,
        notes ? `notes: ${notes}` : "",
        sizes ? `sizes: ${sizes}` : "",
        `page: /perfumes/${perfume.slug}`,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

function developerReply(locale: string): string {
  if (locale === "az") {
    return "Perfoumer vebsaytı və bu AI təcrübəsi Bakhishov Brands tərəfindən hazırlanıb.";
  }
  if (locale === "ru") {
    return "Сайт Perfoumer и этот AI-интерфейс были разработаны Bakhishov Brands.";
  }
  return "The Perfoumer website and this AI experience were developed by Bakhishov Brands.";
}

function developerContactReply(locale: string): string {
  if (locale === "az") {
    return `Bakhishov Brands ilə WhatsApp üzərindən ${DEVELOPER_WHATSAPP_URL} linki ilə və ya ${DEVELOPER_PHONE} nömrəsi ilə əlaqə saxlaya bilərsiniz.`;
  }
  if (locale === "ru") {
    return `С Bakhishov Brands можно связаться через WhatsApp: ${DEVELOPER_WHATSAPP_URL} или по номеру ${DEVELOPER_PHONE}.`;
  }
  return `You can reach Bakhishov Brands on WhatsApp at ${DEVELOPER_WHATSAPP_URL} or by phone at ${DEVELOPER_PHONE}.`;
}

function isDeveloperQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return /(who built|who made|who created|who developed|developer|site creator|website creator|chat creator|ai creator|kim hazirladi|kim duzeltdi|kim yaradib|vebsayti kim|saiti kim|kto sdelal|kto sozdal|kto razrabotal)/iu.test(
    normalized
  ) && /(site|website|chat|ai|vebsayt|sayt|чат|сайт|ии|ai)/iu.test(normalized);
}

function isDeveloperContactQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return /(bakhishov|developer|brands|agency|studio|dev)/iu.test(normalized) && /(contact|reach|whatsapp|phone|number|elaqe|elaqe|əlaqə|nomre|номер|контакт|телефон|how to contact)/iu.test(normalized);
}

function assistantHistoryText(entry: NonNullable<ChatRequest["messages"]>[number]): string {
  const text = entry.text.trim();
  const followUpQuestion = typeof entry.followUp?.question === "string" ? entry.followUp.question.trim() : "";
  const options = Array.isArray(entry.followUp?.options)
    ? entry.followUp.options.filter((option) => typeof option === "string").map((option) => option.trim()).filter(Boolean)
    : [];

  if (entry.role !== "assistant" || !followUpQuestion) {
    return text;
  }

  return [
    text,
    `Follow-up question asked: ${followUpQuestion}`,
    options.length ? `Shown options: ${options.join(" | ")}` : "",
    entry.followUp?.allowFreeText ? "The user could also reply in free text." : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildConversationMessages(body: ChatRequest) {
  const history = Array.isArray(body.messages) ? body.messages : [];
  const sanitized = history
    .filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && typeof entry.text === "string")
    .slice(-12)
    .map((entry) => ({
      role: entry.role,
      content: assistantHistoryText(entry),
    }))
    .filter((entry) => entry.content);

  if (sanitized.length) {
    return sanitized;
  }

  return [{ role: "user" as const, content: body.message.trim() }];
}

function normalizeStructuredResponse(content: string | undefined): StructuredAssistantResponse {
  const emptyFollowUp: StructuredFollowUp = {
    question: "",
    options: [],
    allowFreeText: false,
    inputPlaceholder: "",
  };

  if (!content) {
    return { answer: "", followUp: emptyFollowUp };
  }

  try {
    const parsed = JSON.parse(content) as Partial<StructuredAssistantResponse>;
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
    const rawFollowUp = (parsed.followUp ?? {}) as any;
    const question =
      typeof rawFollowUp === "object" && rawFollowUp && typeof rawFollowUp.question === "string"
        ? rawFollowUp.question.trim()
        : "";
    const options =
      typeof rawFollowUp === "object" && rawFollowUp && Array.isArray(rawFollowUp.options)
        ? rawFollowUp.options.filter((option: any): option is string => typeof option === "string").map((option: string) => option.trim()).filter(Boolean).slice(0, 4)
        : [];
    const allowFreeText =
      typeof rawFollowUp === "object" && rawFollowUp ? Boolean(rawFollowUp.allowFreeText) : false;
    const inputPlaceholder =
      typeof rawFollowUp === "object" && rawFollowUp && typeof rawFollowUp.inputPlaceholder === "string"
        ? rawFollowUp.inputPlaceholder.trim().slice(0, 90)
        : "";

    return {
      answer,
      followUp: {
        question,
        options,
        allowFreeText,
        inputPlaceholder,
      },
    };
  } catch {
    return {
      answer: content.trim(),
      followUp: emptyFollowUp,
    };
  }
}

function sanitizeAssistantAnswer(value: string): string {
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

const systemPromptByLocale: Record<string, string> = {
  az: `You are Remi, the official AI concierge for Perfoumer.az.

SCOPE:
- You only help with Perfoumer topics: perfumes in the Perfoumer catalog, notes, brands, site navigation, account/orders, shipping, payment, returns, support, and the website experience.
- If a user asks for unrelated topics, refuse briefly and redirect them back to Perfoumer.

DEVELOPER CREDIT:
- The Perfoumer website and this AI experience were developed by Bakhishov Brands.
- Mention Bakhishov Brands when the user asks who built, created, or developed the website, chat, or AI.
- Do not inject developer credit into unrelated answers.
- If the user asks how to contact Bakhishov Brands or the developer, share WhatsApp ${DEVELOPER_WHATSAPP_URL} and phone ${DEVELOPER_PHONE}.

RESPONSE QUALITY:
- No greetings.
- Sound intelligent, premium, direct, and natural.
- Do not give generic filler.
- Write polished Azerbaijani with correct grammar, spelling, punctuation, and capitalization.
- Use lightweight formatting when it improves readability: **bold** for perfume names or key terms, numbered lists for ranked recommendations or step-by-step guidance, and bullet lists for short grouped points.
- Keep formatting clean and purposeful, not excessive.
- Never output raw HTML such as <a>, <br>, <p>, or any other tags.
- For phone numbers, emails, and links, use plain text or markdown-style text only.
- Never invent perfume names, links, notes, policies, or stock facts.
- Never recommend a brand name alone as if it were a perfume.
- For broad recommendation requests, suggest 2-4 varied options and explain why each fits.
- Prefer exact catalog items from the provided context. If no exact catalog match exists, say that clearly and guide the user to /catalog.
- Use internal paths when helpful: /catalog, /account, /wishlist, /compare, /cart, /perfumes/slug.
- Only list real catalog perfumes as recommendations.
- Do not turn note sections, budgets, headings, or categories into recommendation items.
- When describing note structure, write it in prose instead of standalone pseudo-product lines such as "Üst notlar - ...".
- Do not output naked standalone internal paths as separate lines unless the path itself is the whole answer.

FOLLOW-UP QUESTIONS:
- If one short clarification would materially improve the answer, ask exactly one follow-up question.
- Use 2-4 short plain-text options when likely answer paths are clear.
- Use free-text follow-ups when the user needs to specify details like budget, notes, season, intensity, occasion, or style.
- Do not ask unnecessary questions if you can already answer well.
- Never ask more than one follow-up at a time.

OUTPUT FORMAT:
- Return valid JSON only.
- Use this shape exactly:
  {
    "answer": "markdown-friendly assistant reply",
    "followUp": {
      "question": "",
      "options": [],
      "allowFreeText": false,
      "inputPlaceholder": ""
    }
  }
- If no follow-up is needed, leave followUp.question empty, followUp.options empty, allowFreeText false, and inputPlaceholder empty.
- If options are present, keep them short and plain text.

KNOWN PERFoumer FACTS:
- Orders: 1-3 business days prep, tracking provided
- FREE standard shipping (5-7 days) or +5 AZN express (2 business days)
- Returns: 14 days for unused products in original condition
- Support: weekdays 10:00-19:00, ${SUPPORT_EMAIL}, WhatsApp ${SUPPORT_WHATSAPP}
- Base: Baku, Azerbaijan

Respond only in Azerbaijani.`,
  en: `You are Remi, the official AI concierge for Perfoumer.az.

SCOPE:
- You only help with Perfoumer topics: catalog fragrances, note profiles, brand guidance, site navigation, account/orders, shipping, payment, returns, support, and the website experience.
- If the user asks about unrelated topics, politely refuse in one sentence and redirect them to Perfoumer-related help.

DEVELOPER CREDIT:
- The Perfoumer website and this AI experience were developed by Bakhishov Brands.
- Mention Bakhishov Brands when the user asks who built, created, or developed the website, chat, or AI.
- Do not force that credit into unrelated answers.
- If the user asks how to contact Bakhishov Brands or the developer, share WhatsApp ${DEVELOPER_WHATSAPP_URL} and phone ${DEVELOPER_PHONE}.

RESPONSE QUALITY:
- No greetings.
- Sound sharp, premium, direct, and naturally helpful.
- Avoid generic filler.
- Use correct grammar, spelling, punctuation, and capitalization.
- Use lightweight formatting when it improves readability: **bold** for perfume names or key terms, numbered lists for ranked recommendations or step-by-step guidance, and bullet lists for short grouped points.
- Keep formatting clean and purposeful, not excessive.
- Never output raw HTML such as <a>, <br>, <p>, or any other tags.
- For phone numbers, emails, and links, use plain text or markdown-style text only.
- Never invent perfume names, links, notes, policies, or stock facts.
- Never recommend a brand name alone as if it were a perfume.
- For broad recommendation requests, suggest 2-4 varied options and explain why each fits.
- Prefer exact catalog items from the provided context. If no exact catalog match exists, say so clearly and guide the user to /catalog.
- Use internal paths when helpful: /catalog, /account, /wishlist, /compare, /cart, /perfumes/slug.
- Only list real catalog perfumes as recommendations.
- Do not turn note sections, budgets, headings, or categories into recommendation items.
- When describing note structure, keep it in prose instead of pseudo-product lines like "Top notes - ...".
- Do not output naked standalone internal paths as separate lines unless the path itself is the whole answer.

FOLLOW-UP QUESTIONS:
- If one short clarification would materially improve the answer, ask exactly one follow-up question.
- Use 2-4 short plain-text options when likely answer paths are clear.
- Use free-text follow-ups when the user needs to specify details like budget, notes, season, intensity, occasion, or style.
- Do not ask unnecessary questions if you can already answer well.
- Never ask more than one follow-up at a time.

OUTPUT FORMAT:
- Return valid JSON only.
- Use this shape exactly:
  {
    "answer": "markdown-friendly assistant reply",
    "followUp": {
      "question": "",
      "options": [],
      "allowFreeText": false,
      "inputPlaceholder": ""
    }
  }
- If no follow-up is needed, leave followUp.question empty, followUp.options empty, allowFreeText false, and inputPlaceholder empty.
- If options are present, keep them short and plain text.

KNOWN PERFoumer FACTS:
- Orders: 1-3 business days prep, tracking provided
- FREE standard shipping (5-7 days) or +5 AZN express (2 business days)
- Returns: 14 days for unused products in original condition
- Support: weekdays 10:00-19:00, ${SUPPORT_EMAIL}, WhatsApp ${SUPPORT_WHATSAPP}
- Base: Baku, Azerbaijan

Respond only in English.`,
  ru: `Вы Remi, официальный AI-консьерж Perfoumer.az.

ОБЛАСТЬ:
- Вы помогаете только по темам Perfoumer: ароматы из каталога, ноты, бренды, навигация по сайту, аккаунт/заказы, доставка, оплата, возвраты, поддержка и сам сайт.
- Если вопрос не относится к Perfoumer, вежливо откажитесь в одном коротком предложении и верните разговор к темам Perfoumer.

КРЕДИТ РАЗРАБОТЧИКУ:
- Сайт Perfoumer и этот AI-интерфейс были разработаны Bakhishov Brands.
- Упоминайте Bakhishov Brands, когда пользователь спрашивает, кто создал или разработал сайт, чат или AI.
- Не вставляйте этот кредит в нерелевантные ответы.
- Если пользователь спрашивает, как связаться с Bakhishov Brands или разработчиком, дайте WhatsApp ${DEVELOPER_WHATSAPP_URL} и номер ${DEVELOPER_PHONE}.

КАЧЕСТВО ОТВЕТОВ:
- Без приветствий.
- Отвечайте умно, конкретно, по делу и естественно.
- Избегайте пустых общих фраз.
- Следите за грамотностью, орфографией, пунктуацией и корректным регистром.
- При необходимости используйте легкое форматирование: **жирный** для названий ароматов и важных терминов, нумерованные списки для рекомендаций и шагов, маркированные списки для коротких групп пунктов.
- Форматирование должно быть аккуратным и уместным, без перегруза.
- Никогда не выводите raw HTML вроде <a>, <br>, <p> или любых других тегов.
- Для телефонов, email и ссылок используйте только обычный текст или markdown-подобный текст.
- Не придумывайте названия ароматов, ссылки, ноты, правила или наличие.
- Не рекомендуйте название бренда как будто это отдельный аромат.
- Для широких запросов по рекомендациям предлагайте 2-4 разных варианта и объясняйте, почему они подходят.
- Предпочитайте точные позиции из переданного каталожного контекста. Если точного совпадения нет, скажите об этом прямо и направьте на /catalog.
- При необходимости используйте внутренние пути: /catalog, /account, /wishlist, /compare, /cart, /perfumes/slug.
- В списки рекомендаций включайте только реальные ароматы из каталога.
- Не превращайте разделы с нотами, бюджетами, заголовками или категориями в псевдо-товарные пункты.
- Если описываете ноты, делайте это в обычном тексте, а не строками вида "Верхние ноты - ...".
- Не выводите внутренние пути отдельными пустыми строками, если путь сам по себе не является полным ответом.

УТОЧНЯЮЩИЕ ВОПРОСЫ:
- Если один короткий уточняющий вопрос заметно улучшит ответ, задайте ровно один такой вопрос.
- Если вероятные варианты ответа понятны, предложите 2-4 короткие plain-text опции.
- Если нужны детали вроде бюджета, нот, сезона, интенсивности, случая или стиля, используйте свободный текст.
- Не задавайте лишние вопросы, если можете уже сейчас дать хороший ответ.
- Никогда не задавайте больше одного уточняющего вопроса за раз.

ФОРМАТ ОТВЕТА:
- Возвращайте только валидный JSON.
- Используйте ровно такую структуру:
  {
    "answer": "assistant reply with light markdown",
    "followUp": {
      "question": "",
      "options": [],
      "allowFreeText": false,
      "inputPlaceholder": ""
    }
  }
- Если уточнение не нужно, оставьте followUp.question пустым, followUp.options пустым массивом, allowFreeText false и inputPlaceholder пустым.
- Если есть опции, они должны быть короткими и plain text.

ИЗВЕСТНЫЕ ФАКТЫ PERFoumer:
- Заказы: подготовка 1-3 рабочих дня, есть трекинг
- БЕСПЛАТНАЯ стандартная доставка (5-7 дней) или +5 AZN экспресс (2 рабочих дня)
- Возврат: 14 дней для неиспользованных товаров в оригинальном состоянии
- Поддержка: будни 10:00-19:00, ${SUPPORT_EMAIL}, WhatsApp ${SUPPORT_WHATSAPP}
- База: Баку, Азербайджан

Отвечайте только на русском.`,
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ChatRequest;
    const { message, locale = "en" } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.QOXUNU_OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    if (isDeveloperContactQuestion(message)) {
      return NextResponse.json({ response: developerContactReply(locale), followUp: null }, { status: 200 });
    }

    if (isDeveloperQuestion(message)) {
      return NextResponse.json({ response: developerReply(locale), followUp: null }, { status: 200 });
    }

    // Load catalog for context
    const perfumes = await loadPerfumes();
    const inStockCount = perfumes.filter((p) => p.inStock).length;
    const brands = [...new Set(perfumes.map((p) => p.brand))].slice(0, 25);
    const relevantCatalogContext = buildCatalogContext(message, perfumes);

    const systemPrompt = systemPromptByLocale[locale] || systemPromptByLocale.en;
    const conversationMessages = buildConversationMessages(body);

    // Enhanced with catalog context
    const enhancedSystemPrompt = `${systemPrompt}

Current Perfoumer Catalog Stats:
- Total fragrances: ${perfumes.length}
- In stock: ${inStockCount}
- Top brands: ${brands.join(", ")}

Relevant catalog context for this user message:
${relevantCatalogContext}

When users ask about fragrances or recommendations, prefer exact products from the relevant catalog context above.
If the relevant catalog context says no strong direct matches were ranked, say that clearly instead of inventing products.
Keep answers natural, intelligent, and specific.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt,
          },
          ...conversationMessages,
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "perfoumer_chat_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: {
                  type: "string",
                },
                followUp: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: { type: "string" },
                    options: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 4,
                    },
                    allowFreeText: { type: "boolean" },
                    inputPlaceholder: { type: "string" },
                  },
                  required: ["question", "options", "allowFreeText", "inputPlaceholder"],
                },
              },
              required: ["answer", "followUp"],
            },
          },
        },
        temperature: 0.68,
        presence_penalty: 0.2,
        max_tokens: 650,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to get response from AI" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const parsed = normalizeStructuredResponse(data.choices?.[0]?.message?.content);
    const aiResponse = sanitizeAssistantAnswer(parsed.answer || "Sorry, I couldn't process your request.");
    const followUp = parsed.followUp.question ? parsed.followUp : null;

    return NextResponse.json({ response: aiResponse, followUp }, { status: 200 });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
