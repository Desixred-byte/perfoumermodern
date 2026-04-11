import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type ChatRequest = {
  message: string;
  locale: string;
  pageContext?: {
    pathname?: string;
    currentPerfumeSlug?: string;
  };
  userContext?: {
    signedIn?: boolean;
    email?: string;
    username?: string;
    profileGender?: string;
    device?: {
      userAgent?: string;
      platform?: string;
      language?: string;
      timezone?: string;
    };
    wishlistSlugs?: string[];
    cartItems?: Array<{
      perfumeSlug?: string;
      quantity?: number;
      sizeMl?: number;
      unitPrice?: number;
    }>;
    comments?: Array<{
      perfumeSlug?: string;
      rating?: number;
      createdAt?: string;
    }>;
  };
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
  actionSuggestions?: ActionSuggestion[];
};

type ActionType = "add_to_cart" | "add_to_wishlist" | "remove_from_cart" | "clear_cart" | "remove_from_wishlist";

type ActionSuggestion = {
  id: string;
  type: ActionType;
  perfumeSlug: string;
  perfumeName: string;
  sizeMl?: number;
  quantity?: number;
  unitPrice?: number;
  reason: string;
};

type FollowUpIntent =
  | "recommendation"
  | "orders"
  | "shipping_payment"
  | "returns"
  | "account"
  | "general";

type GiftDiscoverySignals = {
  recipientKnown: boolean;
  occasionKnown: boolean;
  scentKnown: boolean;
  budgetKnown: boolean;
};

type GiftDiscoveryStep = "recipient" | "occasion" | "scent" | "budget" | null;

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

type SanitizedUserContext = {
  signedIn: boolean;
  email: string;
  username: string;
  profileGender: string;
  device: {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
  };
  wishlistSlugs: string[];
  cartItems: Array<{ perfumeSlug: string; quantity: number; sizeMl: number; unitPrice: number }>;
  comments: Array<{ perfumeSlug: string; rating: number; createdAt: string }>;
};

type ActionIntent = ActionType | null;

type SanitizedPageContext = {
  pathname: string;
  currentPerfumeSlug: string;
};

let cachedPerfumes: Perfume[] = [];
const DAILY_VARIATION_SEED = new Date().toISOString().slice(0, 10);
const SUPPORT_EMAIL = "info@perfoumer.az";
const SUPPORT_WHATSAPP = "+994 50 707 80 70";
const DEVELOPER_WHATSAPP_URL = "https://wa.me/bakhishov";
const DEVELOPER_PHONE = "+994 55 575 77 77";
const NOTE_ALIAS_BY_SLUG: Record<string, string[]> = {
  berqamot: ["berqamot", "bergamot"],
  limon: ["limon", "lemon"],
  lavanda: ["lavanda", "lavender"],
  vanil: ["vanil", "vanilla"],
  qizilgul: ["qizilgul", "qızılgül", "rose"],
  yasemen: ["yasemen", "jasmine", "jasmin"],
  sidr: ["sidr", "cedar"],
  sandal: ["sandal", "sandalwood"],
  musk: ["musk", "musc", "musc"],
  müşk: ["musk", "musc", "musc", "müşk"],
  paçuli: ["patchouli", "paculi", "paçuli"],
  paculi: ["patchouli", "paculi", "paçuli"],
  enber: ["enber", "ənbər", "amber"],
  ənbər: ["enber", "ənbər", "amber"],
  ud: ["ud", "oud", "oudh", "agarwood"],
};

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

function sanitizeSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function sanitizeUserContext(input: unknown): SanitizedUserContext | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as NonNullable<ChatRequest["userContext"]>;
  const wishlistSlugs = Array.isArray(raw.wishlistSlugs)
    ? Array.from(new Set(raw.wishlistSlugs.map(sanitizeSlug).filter(Boolean))).slice(0, 60)
    : [];
  const cartItems = Array.isArray(raw.cartItems)
    ? raw.cartItems
        .map((item) => ({
          perfumeSlug: sanitizeSlug(item?.perfumeSlug),
          quantity: Number.isFinite(Number(item?.quantity)) ? Math.max(1, Math.min(50, Number(item?.quantity))) : 1,
          sizeMl: Number.isFinite(Number(item?.sizeMl)) ? Math.max(0, Math.min(500, Number(item?.sizeMl))) : 0,
          unitPrice: Number.isFinite(Number(item?.unitPrice)) ? Math.max(0, Number(item?.unitPrice)) : 0,
        }))
        .filter((item) => item.perfumeSlug)
        .slice(0, 100)
    : [];
  const comments = Array.isArray(raw.comments)
    ? raw.comments
        .map((item) => ({
          perfumeSlug: sanitizeSlug(item?.perfumeSlug),
          rating: Number.isFinite(Number(item?.rating)) ? Math.max(1, Math.min(5, Number(item?.rating))) : 0,
          createdAt: typeof item?.createdAt === "string" ? item.createdAt.trim().slice(0, 40) : "",
        }))
        .filter((item) => item.perfumeSlug)
        .slice(0, 80)
    : [];

  const device = raw.device && typeof raw.device === "object" ? raw.device : {};

  return {
    signedIn: Boolean(raw.signedIn),
    email: typeof raw.email === "string" ? raw.email.trim().slice(0, 120) : "",
    username: typeof raw.username === "string" ? raw.username.trim().slice(0, 80) : "",
    profileGender: typeof raw.profileGender === "string" ? raw.profileGender.trim().slice(0, 40) : "",
    device: {
      userAgent: typeof device.userAgent === "string" ? device.userAgent.trim().slice(0, 180) : "",
      platform: typeof device.platform === "string" ? device.platform.trim().slice(0, 80) : "",
      language: typeof device.language === "string" ? device.language.trim().slice(0, 40) : "",
      timezone: typeof device.timezone === "string" ? device.timezone.trim().slice(0, 80) : "",
    },
    wishlistSlugs,
    cartItems,
    comments,
  };
}

function sanitizePageContext(input: unknown): SanitizedPageContext {
  if (!input || typeof input !== "object") {
    return { pathname: "", currentPerfumeSlug: "" };
  }

  const raw = input as NonNullable<ChatRequest["pageContext"]>;
  const pathname = typeof raw.pathname === "string" ? raw.pathname.trim().slice(0, 180) : "";
  const currentPerfumeSlug = sanitizeSlug(raw.currentPerfumeSlug);

  return {
    pathname,
    currentPerfumeSlug,
  };
}

function stripSensitiveClientFields(context: SanitizedUserContext | null): SanitizedUserContext | null {
  if (!context) return null;

  return {
    ...context,
    signedIn: false,
    email: "",
    username: "",
    profileGender: "",
    wishlistSlugs: [],
    cartItems: [],
    comments: [],
  };
}

async function resolveSecureUserContext(
  request: Request,
  fallbackContext: SanitizedUserContext | null
): Promise<SanitizedUserContext | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1]?.trim();

  if (!accessToken) {
    return stripSensitiveClientFields(fallbackContext);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return stripSensitiveClientFields(fallbackContext);
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return stripSensitiveClientFields(fallbackContext);
  }

  const user = userData.user;
  const [wishlistRes, cartRes, commentsRes] = await Promise.all([
    supabase
      .from("wishlists")
      .select("perfume_slug")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("cart_items")
      .select("perfume_slug,quantity,size_ml,unit_price")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("comments")
      .select("perfume_slug,rating,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const metadata = user.user_metadata ?? {};

  return {
    signedIn: true,
    email: user.email?.trim() ?? "",
    username: typeof metadata.username === "string" ? metadata.username.trim().slice(0, 80) : "",
    profileGender: typeof metadata.gender === "string" ? metadata.gender.trim().slice(0, 40) : "",
    device: fallbackContext?.device ?? {
      userAgent: "",
      platform: "",
      language: "",
      timezone: "",
    },
    wishlistSlugs: ((wishlistRes.data ?? []) as Array<{ perfume_slug?: unknown }>)
      .map((item) => sanitizeSlug(item.perfume_slug))
      .filter(Boolean),
    cartItems: ((cartRes.data ?? []) as Array<{ perfume_slug?: unknown; quantity?: unknown; size_ml?: unknown; unit_price?: unknown }>)
      .map((item) => ({
        perfumeSlug: sanitizeSlug(item.perfume_slug),
        quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Math.min(50, Number(item.quantity))) : 1,
        sizeMl: Number.isFinite(Number(item.size_ml)) ? Math.max(0, Math.min(500, Number(item.size_ml))) : 0,
        unitPrice: Number.isFinite(Number(item.unit_price)) ? Math.max(0, Number(item.unit_price)) : 0,
      }))
      .filter((item) => item.perfumeSlug),
    comments: ((commentsRes.data ?? []) as Array<{ perfume_slug?: unknown; rating?: unknown; created_at?: unknown }>)
      .map((item) => ({
        perfumeSlug: sanitizeSlug(item.perfume_slug),
        rating: Number.isFinite(Number(item.rating)) ? Math.max(1, Math.min(5, Number(item.rating))) : 0,
        createdAt: typeof item.created_at === "string" ? item.created_at.trim().slice(0, 40) : "",
      }))
      .filter((item) => item.perfumeSlug),
  };
}

function isSensitiveDataExfiltrationQuery(message: string): boolean {
  const normalized = normalizeText(message);
  const asksSecrets = /(api key|secret|token|password|jwt|private key|env\b|database dump|credentials|admin access)/iu.test(
    normalized
  );
  const asksOtherUsers =
    /(other users|another user|someone else|all users|başqa istifadəçi|других пользователей|чуж)/iu.test(normalized) &&
    /(email|address|cart|wishlist|order|comment|profile|data|məlumat|данн)/iu.test(normalized);

  return asksSecrets || asksOtherUsers;
}

function sensitiveDataRefusal(locale: string): string {
  if (locale === "az") {
    return "Bu tip həssas və ya digər istifadəçilərə aid məlumatı paylaşa bilmirəm. Öz hesabınızla bağlı suallarda kömək edə bilərəm.";
  }
  if (locale === "ru") {
    return "Я не могу делиться чувствительными данными или данными других пользователей. Могу помочь с вашим собственным аккаунтом.";
  }
  return "I can't share sensitive data or other users' data. I can help with your own account and actions.";
}

function detectActionIntent(message: string): ActionIntent {
  const normalized = normalizeText(message);

  const removeVerb = /(remove|delete|clear|sil|cixar|çıxar|cixart|çıxart|убери|удали|очист)/iu.test(normalized);
  const cartWord = /(cart|sebet|səbət|basket|корзин)/iu.test(normalized);
  const wishlistWord = /(wishlist|istek siyah|istək siyah|избран|favorites?)/iu.test(normalized);

  if (removeVerb && cartWord) {
    if (/(all|hami|hamısı|hamisini|hamısını|все|entire|whole)/iu.test(normalized)) {
      return "clear_cart";
    }
    return "remove_from_cart";
  }

  if (removeVerb && wishlistWord) {
    return "remove_from_wishlist";
  }

  const addCartIntent =
    /(add|elave et|əlavə et|qoy|at|dobav|добав|добавь|append|put)/iu.test(normalized) &&
    cartWord;
  if (addCartIntent) return "add_to_cart";

  const addWishlistIntent =
    /(add|elave et|əlavə et|save|saxla|dobav|добав|добавь)/iu.test(normalized) &&
    wishlistWord;
  if (addWishlistIntent) return "add_to_wishlist";

  return null;
}

function isBulkActionRequest(message: string): boolean {
  const normalized = normalizeText(message);
  const hasBulkWord = /(all|everything|entire|whole|hami|hamisi|hamisini|hamısını|butun|bütün|все|всё|полностью)/iu.test(
    normalized
  );
  const hasActionWord = /(add|remove|delete|clear|elave|əlavə|sil|cixar|çıxar|добав|удал|очист|save)/iu.test(normalized);
  const hasTargetWord = /(cart|sebet|səbət|basket|корзин|wishlist|istek siyah|istək siyah|избран|favorites?)/iu.test(
    normalized
  );

  return hasBulkWord && hasActionWord && hasTargetWord;
}

function bulkActionBlockedReply(locale: string): string {
  if (locale === "az") {
    return "Təhlükəsizlik səbəbilə toplu əməliyyatları (hamısını əlavə et/sil) AI ilə icra etmirəm. İstəsəniz bunu tək-tək məhsullar üzrə edə bilərəm.";
  }
  if (locale === "ru") {
    return "По соображениям безопасности я не выполняю массовые действия через AI (добавить/удалить всё). Могу сделать это по товарам по одному.";
  }
  return "For safety, I don't execute bulk actions through AI (add/remove everything). I can do it item by item.";
}

function isTotalStockCountQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  const asksStock = /(in stock|stok|stoc|stockda|movcud|mövcud|availability|налич|в наличии)/iu.test(normalized);
  const asksTotal = /(total|overall|all|how many|count|sayi|sayı|nece|neçə|общ|сколько)/iu.test(normalized);
  const narrowsByBrand = /(brand|brend|marka|ysl|dior|chanel|tom ford|ajmal|armaf|valentino|roberto cavalli)/iu.test(
    normalized
  );

  return asksStock && asksTotal && !narrowsByBrand;
}

function totalStockBlockedReply(locale: string): string {
  if (locale === "az") {
    return "Ümumi stok sayını paylaşmıram. İstəsəniz brend və ya məhsul üzrə mövcudluğu yoxlaya bilərəm.";
  }
  if (locale === "ru") {
    return "Я не раскрываю общий остаток по складу. Могу проверить наличие по бренду или конкретному товару.";
  }
  return "I don't disclose total inventory counts. I can check availability by brand or specific product.";
}

function pickCartPerfumeForAction(
  message: string,
  perfumes: Perfume[],
  userContext: SanitizedUserContext,
  pageContext: SanitizedPageContext
): Perfume | null {
  const cartSlugSet = new Set(userContext.cartItems.map((item) => item.perfumeSlug));
  const inCartPerfumes = perfumes.filter((perfume) => cartSlugSet.has(perfume.slug));
  if (!inCartPerfumes.length) return null;

  if (pageContext.currentPerfumeSlug && cartSlugSet.has(pageContext.currentPerfumeSlug)) {
    const normalized = normalizeText(message);
    const refersToCurrentItem = /(this|bu|этот|эту|current|hazirki|hazırki)/iu.test(normalized);
    if (refersToCurrentItem || pageContext.pathname.startsWith("/perfumes/")) {
      return inCartPerfumes.find((perfume) => perfume.slug === pageContext.currentPerfumeSlug) ?? null;
    }
  }

  const ranked = inCartPerfumes
    .map((perfume) => ({ perfume, score: scorePerfume(perfume, message) }))
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return null;
  if ((ranked[0]?.score ?? 0) > 80) {
    return ranked[0]?.perfume ?? null;
  }

  return inCartPerfumes.length === 1 ? inCartPerfumes[0] ?? null : null;
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0] ? part[0].toUpperCase() + part.slice(1) : part)
    .join(" ");
}

function pickCartSlugFromContext(
  message: string,
  userContext: SanitizedUserContext,
  pageContext: SanitizedPageContext
): { perfumeSlug: string; sizeMl: number } | null {
  if (!userContext.cartItems.length) return null;

  if (pageContext.currentPerfumeSlug) {
    const byPage = userContext.cartItems.find((item) => item.perfumeSlug === pageContext.currentPerfumeSlug);
    if (byPage) {
      return { perfumeSlug: byPage.perfumeSlug, sizeMl: byPage.sizeMl };
    }
  }

  const normalized = normalizeText(message);
  const scored = userContext.cartItems
    .map((item) => ({
      item,
      score: normalizeText(item.perfumeSlug).split("-").reduce((sum, token) => {
        if (token.length < 3) return sum;
        return normalized.includes(token) ? sum + token.length : sum;
      }, 0),
    }))
    .sort((left, right) => right.score - left.score);

  if ((scored[0]?.score ?? 0) > 0) {
    return { perfumeSlug: scored[0]!.item.perfumeSlug, sizeMl: scored[0]!.item.sizeMl };
  }

  if (userContext.cartItems.length === 1) {
    const only = userContext.cartItems[0]!;
    return { perfumeSlug: only.perfumeSlug, sizeMl: only.sizeMl };
  }

  return null;
}

function bestPerfumeForAction(message: string, perfumes: Perfume[]): Perfume | null {
  const ranked = perfumes
    .map((perfume) => ({ perfume, score: scorePerfume(perfume, message) }))
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return null;
  if ((ranked[0]?.score ?? 0) < 120) return null;
  return ranked[0]?.perfume ?? null;
}

function pickPerfumeForAction(message: string, perfumes: Perfume[], pageContext: SanitizedPageContext): Perfume | null {
  const perfumeBySlug = new Map(perfumes.map((perfume) => [perfume.slug, perfume]));
  const normalized = normalizeText(message);
  const refersToCurrentItem = /(this|bu|этот|эту|current|hazirki|hazırki)/iu.test(normalized);
  const onPerfumeDetailPage = pageContext.pathname.startsWith("/perfumes/");

  if (pageContext.currentPerfumeSlug && (refersToCurrentItem || onPerfumeDetailPage)) {
    const currentPerfume = perfumeBySlug.get(pageContext.currentPerfumeSlug);
    if (currentPerfume) return currentPerfume;
  }

  return bestPerfumeForAction(message, perfumes);
}

function parseRequestedQuantity(message: string): number {
  const normalized = normalizeText(message);
  const direct = normalized.match(/\b(\d{1,2})\b/u);
  if (!direct) return 1;
  return Math.max(1, Math.min(10, Number(direct[1])));
}

function parseRequestedSizeMl(message: string, perfume: Perfume): number {
  const normalized = normalizeText(message);
  const explicit = normalized.match(/\b(\d{2,3})\s?(ml|m l)\b/iu);
  const available = perfume.sizes.map((size) => size.ml).sort((a, b) => a - b);
  if (!available.length) return 0;

  if (explicit) {
    const requested = Number(explicit[1]);
    const exact = available.find((size) => size === requested);
    if (exact) return exact;
  }

  const preferred = available.find((size) => size >= 50) ?? available[Math.floor(available.length / 2)] ?? available[0];
  return preferred;
}

function actionReasonText(locale: string, actionType: ActionType, perfumeName: string): string {
  if (locale === "az") {
    if (actionType === "add_to_cart") {
      return `İstəsəniz ${perfumeName} məhsulunu bir kliklə səbətinizə əlavə edə bilərəm.`;
    }
    if (actionType === "add_to_wishlist") {
      return `İstəsəniz ${perfumeName} məhsulunu bir kliklə wishlist-ə əlavə edə bilərəm.`;
    }
    if (actionType === "remove_from_cart") {
      return `İstəsəniz ${perfumeName} məhsulunu səbətinizdən silə bilərəm.`;
    }
    if (actionType === "remove_from_wishlist") {
      return `İstəsəniz ${perfumeName} məhsulunu wishlist-dən silə bilərəm.`;
    }
    return "İstəsəniz səbətinizdəki bütün məhsulları bir kliklə silə bilərəm.";
  }
  if (locale === "ru") {
    if (actionType === "add_to_cart") {
      return `Если хотите, могу в один клик добавить ${perfumeName} в корзину.`;
    }
    if (actionType === "add_to_wishlist") {
      return `Если хотите, могу в один клик добавить ${perfumeName} в wishlist.`;
    }
    if (actionType === "remove_from_cart") {
      return `Если хотите, могу удалить ${perfumeName} из корзины.`;
    }
    if (actionType === "remove_from_wishlist") {
      return `Если хотите, могу удалить ${perfumeName} из wishlist.`;
    }
    return "Если хотите, могу очистить всю корзину в один клик.";
  }
  if (actionType === "add_to_cart") {
    return `If you want, I can add ${perfumeName} to your cart in one tap.`;
  }
  if (actionType === "add_to_wishlist") {
    return `If you want, I can add ${perfumeName} to your wishlist in one tap.`;
  }
  if (actionType === "remove_from_cart") {
    return `If you want, I can remove ${perfumeName} from your cart.`;
  }
  if (actionType === "remove_from_wishlist") {
    return `If you want, I can remove ${perfumeName} from your wishlist.`;
  }
  return "If you want, I can clear your entire cart in one tap.";
}

function buildDirectActionReply(locale: string, action: ActionSuggestion): string {
  if (locale === "az") {
    if (action.type === "add_to_cart") return `${action.perfumeName} üçün hazırdır. Təsdiqlə düyməsinə toxunun, səbətə əlavə edim.`;
    if (action.type === "add_to_wishlist") return `${action.perfumeName} üçün hazırdır. Təsdiqlə düyməsinə toxunun, wishlist-ə əlavə edim.`;
    if (action.type === "remove_from_cart") return `${action.perfumeName} üçün hazırdır. Təsdiqlə düyməsinə toxunun, səbətdən silim.`;
    if (action.type === "remove_from_wishlist") return `${action.perfumeName} üçün hazırdır. Təsdiqlə düyməsinə toxunun, wishlist-dən silim.`;
    return "Hazırdır. Təsdiqlə düyməsinə toxunun, səbəti tam təmizləyim.";
  }

  if (locale === "ru") {
    if (action.type === "add_to_cart") return `Готово для ${action.perfumeName}. Нажмите подтверждение, и я добавлю в корзину.`;
    if (action.type === "add_to_wishlist") return `Готово для ${action.perfumeName}. Нажмите подтверждение, и я добавлю в wishlist.`;
    if (action.type === "remove_from_cart") return `Готово для ${action.perfumeName}. Нажмите подтверждение, и я удалю из корзины.`;
    if (action.type === "remove_from_wishlist") return `Готово для ${action.perfumeName}. Нажмите подтверждение, и я удалю из wishlist.`;
    return "Готово. Нажмите подтверждение, и я очищу всю корзину.";
  }

  if (action.type === "add_to_cart") return `Ready for ${action.perfumeName}. Tap approve and I will add it to cart.`;
  if (action.type === "add_to_wishlist") return `Ready for ${action.perfumeName}. Tap approve and I will add it to wishlist.`;
  if (action.type === "remove_from_cart") return `Ready for ${action.perfumeName}. Tap approve and I will remove it from cart.`;
  if (action.type === "remove_from_wishlist") return `Ready for ${action.perfumeName}. Tap approve and I will remove it from wishlist.`;
  return "Ready. Tap approve and I will clear your cart.";
}

function buildActionSuggestions(
  message: string,
  locale: string,
  userContext: SanitizedUserContext | null,
  perfumes: Perfume[],
  pageContext: SanitizedPageContext
): ActionSuggestion[] {
  if (!userContext?.signedIn) return [];

  const intent = detectActionIntent(message);
  if (!intent) return [];

  if (intent === "clear_cart") {
    return [
      {
        id: "clear-cart-all",
        type: "clear_cart",
        perfumeSlug: "all",
        perfumeName: locale === "az" ? "Bütün məhsullar" : locale === "ru" ? "Все товары" : "All items",
        reason: actionReasonText(locale, "clear_cart", "all"),
      },
    ];
  }

  if (intent === "remove_from_cart") {
    const targetPerfume = pickCartPerfumeForAction(message, perfumes, userContext, pageContext);
    if (targetPerfume) {
      const cartEntry = userContext.cartItems.find((item) => item.perfumeSlug === targetPerfume.slug);
      return [
        {
          id: `remove-cart-${targetPerfume.slug}-${cartEntry?.sizeMl ?? 0}`,
          type: "remove_from_cart",
          perfumeSlug: targetPerfume.slug,
          perfumeName: `${targetPerfume.brand} ${targetPerfume.name}`,
          ...(cartEntry?.sizeMl ? { sizeMl: cartEntry.sizeMl } : {}),
          reason: actionReasonText(locale, "remove_from_cart", `${targetPerfume.brand} ${targetPerfume.name}`),
        },
      ];
    }

    const targetFromContext = pickCartSlugFromContext(message, userContext, pageContext);
    if (!targetFromContext) return [];

    const readableName = humanizeSlug(targetFromContext.perfumeSlug);
    return [
      {
        id: `remove-cart-${targetFromContext.perfumeSlug}-${targetFromContext.sizeMl ?? 0}`,
        type: "remove_from_cart",
        perfumeSlug: targetFromContext.perfumeSlug,
        perfumeName: readableName,
        ...(targetFromContext.sizeMl ? { sizeMl: targetFromContext.sizeMl } : {}),
        reason: actionReasonText(locale, "remove_from_cart", readableName),
      },
    ];
  }

  if (intent === "remove_from_wishlist") {
    const wishlistSlugSet = new Set(userContext.wishlistSlugs);
    const wishlistedPerfumes = perfumes.filter((perfume) => wishlistSlugSet.has(perfume.slug));
    const target = pickPerfumeForAction(message, wishlistedPerfumes, pageContext);
    if (!target) return [];

    return [
      {
        id: `remove-wishlist-${target.slug}`,
        type: "remove_from_wishlist",
        perfumeSlug: target.slug,
        perfumeName: `${target.brand} ${target.name}`,
        reason: actionReasonText(locale, "remove_from_wishlist", `${target.brand} ${target.name}`),
      },
    ];
  }

  const perfume = pickPerfumeForAction(message, perfumes, pageContext);
  if (!perfume) return [];

  if (intent === "add_to_wishlist") {
    return [
      {
        id: `wishlist-${perfume.slug}`,
        type: "add_to_wishlist",
        perfumeSlug: perfume.slug,
        perfumeName: `${perfume.brand} ${perfume.name}`,
        reason: actionReasonText(locale, "add_to_wishlist", `${perfume.brand} ${perfume.name}`),
      },
    ];
  }

  const sizeMl = parseRequestedSizeMl(message, perfume);
  const size = perfume.sizes.find((entry) => entry.ml === sizeMl) ?? perfume.sizes[0];
  if (!size) return [];

  return [
    {
      id: `cart-${perfume.slug}-${size.ml}`,
      type: "add_to_cart",
      perfumeSlug: perfume.slug,
      perfumeName: `${perfume.brand} ${perfume.name}`,
      sizeMl: size.ml,
      quantity: parseRequestedQuantity(message),
      unitPrice: size.price,
      reason: actionReasonText(locale, "add_to_cart", `${perfume.brand} ${perfume.name}`),
    },
  ];
}

function shouldNudgeGuestSignUp(message: string): boolean {
  const normalized = normalizeText(message);
  const actionableRequest =
    /(add|save|elave|əlavə|saxla|dobav|добав|checkout|buy|satin al|купить|track|izle|отслед|orders?|sifaris|заказ|account|hesab|аккаунт|wishlist|cart|sebet|səbət)/iu.test(
      normalized
    );
  if (!actionableRequest) return false;

  const stableSeed = hashString(`${DAILY_VARIATION_SEED}:${normalized}`) % 100;
  return stableSeed < 34;
}

function guestSignUpNudge(locale: string): string {
  if (locale === "az") {
    return "Qısa qeydiyyatla mən sizin üçün səbətə və wishlist-ə birbaşa əlavə etmə, həmçinin sifariş izləmə köməkçisi kimi işləyə bilərəm. /login";
  }
  if (locale === "ru") {
    return "После короткой регистрации я смогу добавлять товары в корзину и wishlist по вашему подтверждению и помогать с заказами. /login";
  }
  return "With a quick sign-up, I can add items to cart and wishlist for you (with approval) and help with order actions. /login";
}

function rankTasteSignals(userContext: SanitizedUserContext, perfumes: Perfume[]) {
  const perfumeBySlug = new Map(perfumes.map((perfume) => [perfume.slug, perfume]));
  const brandScore = new Map<string, number>();
  const noteScore = new Map<string, number>();
  const genderScore = new Map<string, number>();

  const addPerfumeSignal = (slug: string, weight: number) => {
    const perfume = perfumeBySlug.get(slug);
    if (!perfume) return;

    const brand = perfume.brand.trim();
    if (brand) {
      brandScore.set(brand, (brandScore.get(brand) ?? 0) + weight);
    }

    const gender = perfume.gender.trim();
    if (gender) {
      genderScore.set(gender, (genderScore.get(gender) ?? 0) + weight);
    }

    const notes = [
      ...(perfume.noteSlugs?.top ?? []),
      ...(perfume.noteSlugs?.heart ?? []),
      ...(perfume.noteSlugs?.base ?? []),
    ];
    for (const note of notes) {
      if (!note) continue;
      noteScore.set(note, (noteScore.get(note) ?? 0) + weight);
    }
  };

  for (const slug of userContext.wishlistSlugs) {
    addPerfumeSignal(slug, 4);
  }

  for (const item of userContext.cartItems) {
    addPerfumeSignal(item.perfumeSlug, Math.max(2, item.quantity));
  }

  for (const comment of userContext.comments) {
    if (comment.rating >= 4) {
      addPerfumeSignal(comment.perfumeSlug, 3);
    } else if (comment.rating > 0 && comment.rating <= 2) {
      addPerfumeSignal(comment.perfumeSlug, -1);
    }
  }

  const sortMap = (map: Map<string, number>) =>
    Array.from(map.entries())
      .filter(([, score]) => score > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([name]) => name);

  return {
    topBrands: sortMap(brandScore).slice(0, 5),
    topNotes: sortMap(noteScore).slice(0, 8),
    topGenders: sortMap(genderScore).slice(0, 3),
  };
}

function buildPersonalizationContext(userContext: SanitizedUserContext | null, perfumes: Perfume[]): string {
  if (!userContext) {
    return "No user context provided. Treat as guest and do not assume account-specific data.";
  }

  const taste = rankTasteSignals(userContext, perfumes);
  const cartLineCount = userContext.cartItems.length;
  const cartQuantity = userContext.cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return [
    `signed_in: ${userContext.signedIn ? "yes" : "no"}`,
    userContext.email ? `email: ${userContext.email}` : "",
    userContext.username ? `username: ${userContext.username}` : "",
    userContext.profileGender ? `profile_gender (explicit only): ${userContext.profileGender}` : "",
    userContext.device.language ? `device_language: ${userContext.device.language}` : "",
    userContext.device.platform ? `device_platform: ${userContext.device.platform}` : "",
    userContext.device.timezone ? `device_timezone: ${userContext.device.timezone}` : "",
    `wishlist_count: ${userContext.wishlistSlugs.length}`,
    `cart_line_count: ${cartLineCount}`,
    `cart_total_quantity: ${cartQuantity}`,
    `comment_count: ${userContext.comments.length}`,
    taste.topBrands.length ? `preferred_brands: ${taste.topBrands.join(", ")}` : "",
    taste.topNotes.length ? `preferred_notes: ${taste.topNotes.join(", ")}` : "",
    taste.topGenders.length ? `preferred_gender_buckets: ${taste.topGenders.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function isCartCountQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return /(how many|nece|neçə|skolko|count|sayi|sayi|колич)/iu.test(normalized) && /(cart|sebet|səbət|basket|корзин)/iu.test(normalized);
}

function buildCartCountReply(locale: string, totalQuantity: number, lineCount: number): string {
  if (locale === "az") {
    if (lineCount === 0) return "Hazırda səbətiniz boş görünür.";
    return `Hazırda səbətinizdə ${lineCount} məhsul növü var, ümumi say isə ${totalQuantity}-dir.`;
  }
  if (locale === "ru") {
    if (lineCount === 0) return "Сейчас ваша корзина выглядит пустой.";
    return `Сейчас в вашей корзине ${lineCount} позиций, общее количество — ${totalQuantity}.`;
  }
  if (lineCount === 0) return "Your cart looks empty right now.";
  return `You currently have ${lineCount} cart lines with a total quantity of ${totalQuantity}.`;
}

function isCartTotalQuestion(message: string): boolean {
  const normalized = normalizeText(message);
  return /(how much|total|worth|qiymet|qiymət|cemi|cəmi|sum|итог|общ|стоим)/iu.test(normalized) && /(cart|sebet|səbət|basket|корзин)/iu.test(normalized);
}

function buildCartTotalReply(locale: string, totalAmount: number, lineCount: number): string {
  const rounded = Number.isFinite(totalAmount) ? Number(totalAmount.toFixed(2)) : 0;
  if (locale === "az") {
    if (lineCount === 0) return "Hazırda səbətiniz boşdur.";
    return `Hazırda səbətinizin ümumi məbləği ${rounded} ₼ təşkil edir.`;
  }
  if (locale === "ru") {
    if (lineCount === 0) return "Сейчас ваша корзина пустая.";
    return `Сейчас общая сумма вашей корзины составляет ${rounded} AZN.`;
  }
  if (lineCount === 0) return "Your cart is empty right now.";
  return `Your current cart total is ${rounded} AZN.`;
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
    return { answer: "", followUp: emptyFollowUp, actionSuggestions: [] };
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
    const actionSuggestions =
      Array.isArray(parsed.actionSuggestions)
        ? parsed.actionSuggestions
            .filter((action): action is ActionSuggestion => Boolean(action) && typeof action === "object")
            .slice(0, 2)
        : [];

    return {
      answer,
      followUp: {
        question,
        options,
        allowFreeText,
        inputPlaceholder,
      },
      actionSuggestions,
    };
  } catch {
    return {
      answer: content.trim(),
      followUp: emptyFollowUp,
      actionSuggestions: [],
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

function getAllNoteSlugs(perfumes: Perfume[]): Set<string> {
  const slugs = new Set<string>();
  for (const perfume of perfumes) {
    for (const slug of perfume.noteSlugs?.top ?? []) slugs.add(slug);
    for (const slug of perfume.noteSlugs?.heart ?? []) slugs.add(slug);
    for (const slug of perfume.noteSlugs?.base ?? []) slugs.add(slug);
  }
  return slugs;
}

function pickClosestAvailableSlug(preferredSlug: string, availableSlugs: Set<string>): string | null {
  if (availableSlugs.has(preferredSlug)) return preferredSlug;

  const preferred = normalizeText(humanizeToken(preferredSlug));
  const candidates = Array.from(availableSlugs)
    .map((slug) => ({ slug, normalized: normalizeText(humanizeToken(slug)) }))
    .filter((entry) => entry.normalized === preferred || entry.normalized.includes(preferred))
    .sort((left, right) => {
      if (left.slug.length !== right.slug.length) return left.slug.length - right.slug.length;
      return left.slug.localeCompare(right.slug);
    });

  return candidates[0]?.slug ?? null;
}

function resolveRequestedNoteSlug(message: string, perfumes: Perfume[]): string | null {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) return null;
  const normalizedWords = new Set(normalizedMessage.split(" ").filter(Boolean));

  const availableSlugs = getAllNoteSlugs(perfumes);

  for (const [slug, aliases] of Object.entries(NOTE_ALIAS_BY_SLUG)) {
    if (
      aliases.some((alias) => {
        const normalizedAlias = normalizeText(alias);
        if (!normalizedAlias) return false;

        // Short aliases must match a full token to avoid false positives like "got" -> "ot".
        if (normalizedAlias.length < 4) {
          return normalizedWords.has(normalizedAlias);
        }

        return normalizedMessage.includes(normalizedAlias);
      })
    ) {
      const canonical = pickClosestAvailableSlug(slug, availableSlugs);
      if (canonical) return canonical;
    }
  }

  const sortedSlugs = Array.from(availableSlugs).sort((left, right) => right.length - left.length);
  for (const slug of sortedSlugs) {
    const normalizedSlug = normalizeText(humanizeToken(slug));
    if (!normalizedSlug) continue;

    if (normalizedSlug.length < 4) {
      if (normalizedWords.has(normalizedSlug)) {
        return slug;
      }
      continue;
    }

    if (normalizedSlug.includes(" ")) {
      if (normalizedMessage.includes(normalizedSlug)) {
        return slug;
      }
      continue;
    }

    if (normalizedWords.has(normalizedSlug)) {
      return slug;
    }
  }

  return null;
}

function hasExplicitNoteIntent(message: string): boolean {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) return false;

  if (/(note|notes|nota|notu|нот|ноты|верхние|сердечные|базовые)/iu.test(normalizedMessage)) {
    return true;
  }

  // Also treat explicit mention of known note aliases as note intent.
  return Object.values(NOTE_ALIAS_BY_SLUG).some((aliases) =>
    aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      if (!normalizedAlias) return false;
      if (normalizedAlias.length < 4) return false;
      return normalizedMessage.includes(normalizedAlias);
    })
  );
}

function appendNoteCatalogLink(answer: string, locale: string, noteSlug: string): string {
  if (!answer) return answer;
  if (/\/catalog\b/iu.test(answer)) return answer;
  if (/\/catalog\?note=/iu.test(answer)) return answer;

  const path = `/catalog?note=${encodeURIComponent(noteSlug)}`;

  if (locale === "az") {
    return `${answer}\n\nBu nota görə filtrlənmiş kataloq: ${path}`;
  }
  if (locale === "ru") {
    return `${answer}\n\nКаталог с фильтром по этой ноте: ${path}`;
  }
  return `${answer}\n\nFiltered catalog for this note: ${path}`;
}

function getStartingPrice(perfume: Perfume): number {
  return perfume.sizes[0]?.price ?? Number.POSITIVE_INFINITY;
}

function extractBudgetBounds(message: string): { min?: number; max?: number } {
  const normalized = normalizeText(message);
  const rangeMatch = normalized.match(/(\d{1,4})\s*[-–]\s*(\d{1,4})\s*(?:azn|manat)?/iu);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  const underMatch = normalized.match(/(?:under|up to|below|at most|<=|max(?:imum)?|qeder|qədər|kimi|nedek|до)\s*(\d{1,4})/iu);
  if (underMatch) {
    const max = Number(underMatch[1]);
    if (Number.isFinite(max)) return { max };
  }

  return {};
}

function appendFallbackRecommendationLinks(answer: string, locale: string, message: string, perfumes: Perfume[]): string {
  if (!answer) return answer;
  if (/\/perfumes\/[a-z0-9-]+/iu.test(answer)) return answer;

  const ranked = selectRelevantPerfumes(message, perfumes);
  if (!ranked.length) return answer;

  const budget = extractBudgetBounds(message);
  const budgetFiltered = ranked.filter((perfume) => {
    const price = getStartingPrice(perfume);
    if (!Number.isFinite(price)) return false;
    if (typeof budget.min === "number" && price < budget.min) return false;
    if (typeof budget.max === "number" && price > budget.max) return false;
    return true;
  });

  const picks = (budgetFiltered.length ? budgetFiltered : ranked).slice(0, 3);
  if (!picks.length) return answer;

  const lines = picks.map((perfume, index) => `${index + 1}. **${perfume.brand} ${perfume.name}** - /perfumes/${perfume.slug}`);

  if (locale === "az") {
    return `${answer}\n\nKonkret seçimlər:\n${lines.join("\n")}`;
  }
  if (locale === "ru") {
    return `${answer}\n\nКонкретные варианты:\n${lines.join("\n")}`;
  }

  return `${answer}\n\nConcrete picks:\n${lines.join("\n")}`;
}

function detectFollowUpIntent(message: string): FollowUpIntent {
  const normalized = normalizeText(message);

  if (/(ətir|qoxu|parfum|perfume|fragrance|аромат|дух)/iu.test(normalized)) {
    return "recommendation";
  }
  if (/(order|sifaris|заказ|orders)/iu.test(normalized)) {
    return "orders";
  }
  if (/(shipping|catdirilma|dostavka|delivery|odeni[sş]|payment|oplata|track|izle)/iu.test(normalized)) {
    return "shipping_payment";
  }
  if (/(qaytar|return|возврат|refund)/iu.test(normalized)) {
    return "returns";
  }
  if (/(hesab|account|akkaunt|кабинет|profil|profile)/iu.test(normalized)) {
    return "account";
  }

  return "general";
}

function isGiftIntentMessage(message: string): boolean {
  const normalized = normalizeText(message);

  if (/(gift|hediyye|hədiyyə|podarok|подар)/iu.test(normalized)) {
    return true;
  }

  return /(for my|for a|ucun|üçün|для|моей|моему)/iu.test(normalized)
    && /(daughter|son|wife|husband|mother|mom|father|dad|friend|girlfriend|boyfriend|qizim|qızım|oglum|oğlum|anam|atam|arvadim|dostum|дочь|сын|жена|муж|мама|папа|друг|подруга)/iu.test(
      normalized
    );
}

function hasActiveGiftFlow(body: ChatRequest): boolean {
  const history = Array.isArray(body.messages) ? body.messages : [];
  const recentAssistant = history.filter((entry) => entry.role === "assistant").slice(-4);

  return recentAssistant.some((entry) => {
    const followUpQuestion = typeof entry.followUp?.question === "string" ? entry.followUp.question : "";
    const combined = `${entry.text || ""} ${followUpQuestion}`;
    return /(gift|hediyye|hədiyyə|podarok|подар)/iu.test(normalizeText(combined));
  });
}

function getLastAssistantGiftFollowUpQuestion(body: ChatRequest): string {
  const history = Array.isArray(body.messages) ? body.messages : [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.role !== "assistant") continue;
    const question = typeof entry.followUp?.question === "string" ? entry.followUp.question.trim() : "";
    if (!question) continue;

    const combined = normalizeText(`${entry.text || ""} ${question}`);
    if (/(gift|hediyye|hədiyyə|podarok|подар)/iu.test(combined)) {
      return question;
    }
  }

  return "";
}

function buildGiftContextText(body: ChatRequest): string {
  const history = Array.isArray(body.messages) ? body.messages : [];
  const userMessages = history
    .filter((entry) => entry.role === "user" && typeof entry.text === "string")
    .slice(-8)
    .map((entry) => entry.text.trim())
    .filter(Boolean);

  return normalizeText(userMessages.join(" "));
}

function detectGiftDiscoverySignals(text: string): GiftDiscoverySignals {
  const recipientKnown = /(daughter|son|wife|husband|mother|mom|father|dad|friend|girlfriend|boyfriend|qizim|qızım|oglum|oğlum|anam|atam|arvadim|dostum|дочь|сын|жена|муж|мама|папа|друг|подруга|for my|ucun|üçün|для)/iu.test(
    text
  );
  const occasionKnown = /(birthday|anniversary|wedding|date|party|office|daily|everyday|dogum gunu|doğum günü|toyun|nisan|nişan|gece|вечер|день рождения|свадь|юбилей|праздник)/iu.test(
    text
  );
  const scentKnown = /(fresh|sweet|spicy|woody|floral|citrus|vanilla|oud|musky|light|heavy|clean|sirin|şirin|ədviyyat|agir|ağır|yungul|yüngül|temiz|təmiz|свеж|сладк|прян|древес|цветоч|цитрус|ванил|уд|мускус|легк|тяж)/iu.test(
    text
  );
  const budgetKnown = /(azn|usd|eur|manat|rub|руб|\$|€|₼|\b\d{2,4}\b|under\s*\d+|up to\s*\d+|between\s*\d+|aralig|aralığ|araliginda|aralığında|budce|büdcə|бюджет)/iu.test(
    text
  );

  return { recipientKnown, occasionKnown, scentKnown, budgetKnown };
}

function nextGiftDiscoveryStep(signals: GiftDiscoverySignals): GiftDiscoveryStep {
  if (!signals.recipientKnown) return "recipient";
  if (!signals.occasionKnown) return "occasion";
  if (!signals.scentKnown) return "scent";
  if (!signals.budgetKnown) return "budget";
  return null;
}

function inferGiftStepFromQuestion(question: string): GiftDiscoveryStep {
  const normalized = normalizeText(question);
  if (!normalized) return null;

  if (/(kim ucun|kim üçün|for who|who is|for whom|для кого|кому)/iu.test(normalized)) return "recipient";
  if (/(hansi furset|hansı fürsət|occasion|which occasion|for what occasion|повод|случа)/iu.test(normalized)) return "occasion";
  if (/(qoxu uslubu|qoxu üslubu|scent|fragrance profile|which scent|профиль аромата|аромат)/iu.test(normalized)) return "scent";
  if (/(budce|büdcə|budget|price range|бюджет)/iu.test(normalized)) return "budget";

  return null;
}

function applyGiftStepAnswerHeuristic(
  signals: GiftDiscoverySignals,
  askedStep: GiftDiscoveryStep,
  latestUserMessage: string
): GiftDiscoverySignals {
  if (!askedStep) return signals;

  const normalizedAnswer = normalizeText(latestUserMessage);
  if (!normalizedAnswer) return signals;

  if (askedStep === "recipient") {
    return { ...signals, recipientKnown: true };
  }
  if (askedStep === "occasion") {
    return { ...signals, occasionKnown: true };
  }
  if (askedStep === "scent") {
    return { ...signals, scentKnown: true };
  }
  return { ...signals, budgetKnown: true };
}

function giftDiscoveryPreface(locale: string): string {
  if (locale === "az") {
    return "Əla, bunu birlikdə düzgün seçək. Ən yaxşı hədiyyə variantını tapmaq üçün qısa şəkildə bir-bir dəqiqləşdirəcəyəm.";
  }
  if (locale === "ru") {
    return "Отлично, давайте подберем это точно. Чтобы дать уверенный результат, уточню несколько коротких вопросов по одному.";
  }
  return "Great, let's narrow this down properly. I'll ask a few short questions one by one so the final pick is accurate.";
}

function giftDiscoveryProgressReply(locale: string, nextStep: Exclude<GiftDiscoveryStep, null>): string {
  if (locale === "az") {
    if (nextStep === "occasion") return "Super. İndi fürsəti dəqiqləşdirək.";
    if (nextStep === "scent") return "Yaxşıdır. İndi qoxu istiqamətini seçək.";
    if (nextStep === "budget") return "Gözəl. Son olaraq büdcəni dəqiqləşdirək.";
    return "Əla, davam edək.";
  }
  if (locale === "ru") {
    if (nextStep === "occasion") return "Отлично. Теперь уточним повод.";
    if (nextStep === "scent") return "Хорошо. Теперь выберем направление аромата.";
    if (nextStep === "budget") return "Отлично. В конце уточним бюджет.";
    return "Отлично, продолжим.";
  }
  if (nextStep === "occasion") return "Great. Now let's pin down the occasion.";
  if (nextStep === "scent") return "Nice. Next, let's lock in the scent direction.";
  if (nextStep === "budget") return "Perfect. Last step: budget range.";
  return "Great, let's continue.";
}

function buildGiftDiscoveryFollowUp(locale: string, step: Exclude<GiftDiscoveryStep, null>): StructuredFollowUp {
  if (locale === "az") {
    if (step === "recipient") {
      return {
        question: "Hədiyyə kim üçündür?",
        options: ["Qadın", "Kişi", "Unisex", "Dəqiq deyil"],
        allowFreeText: true,
        inputPlaceholder: "Məs: qızım, həyat yoldaşım, dostum",
      };
    }
    if (step === "occasion") {
      return {
        question: "Hansı fürsət üçün düşünürsünüz?",
        options: ["Ad günü", "Gündəlik istifadə", "Axşam tədbiri", "Xüsusi gün"],
        allowFreeText: true,
        inputPlaceholder: "Məs: ad günü hədiyyəsi",
      };
    }
    if (step === "scent") {
      return {
        question: "Qoxu üslubu necə olsun?",
        options: ["Fresh və təmiz", "Şirin və isti", "Ağır və qalıcı", "Yüngül və rahat"],
        allowFreeText: true,
        inputPlaceholder: "Məs: vanilli, çiçəkli, ədviyyatlı",
      };
    }

    return {
      question: "Büdcə aralığınız nə qədərdir?",
      options: ["20-50 AZN", "50-100 AZN", "100-200 AZN", "200+ AZN"],
      allowFreeText: true,
      inputPlaceholder: "Məs: 80 AZN ətrafı",
    };
  }

  if (locale === "ru") {
    if (step === "recipient") {
      return {
        question: "Для кого подарок?",
        options: ["Для женщины", "Для мужчины", "Унисекс", "Пока не уверен(а)"],
        allowFreeText: true,
        inputPlaceholder: "Например: для дочери, для супруги, для друга",
      };
    }
    if (step === "occasion") {
      return {
        question: "Для какого случая?",
        options: ["День рождения", "На каждый день", "Вечер/мероприятие", "Особый случай"],
        allowFreeText: true,
        inputPlaceholder: "Например: подарок на день рождения",
      };
    }
    if (step === "scent") {
      return {
        question: "Какой профиль аромата ближе?",
        options: ["Свежий и чистый", "Сладкий и теплый", "Насыщенный и стойкий", "Легкий и мягкий"],
        allowFreeText: true,
        inputPlaceholder: "Например: ванильный, цветочный, пряный",
      };
    }

    return {
      question: "Какой у вас бюджет?",
      options: ["20-50 AZN", "50-100 AZN", "100-200 AZN", "200+ AZN"],
      allowFreeText: true,
      inputPlaceholder: "Например: около 80 AZN",
    };
  }

  if (step === "recipient") {
    return {
      question: "Who is the gift for?",
      options: ["Woman", "Man", "Unisex", "Not sure yet"],
      allowFreeText: true,
      inputPlaceholder: "Example: my daughter, my partner, my friend",
    };
  }
  if (step === "occasion") {
    return {
      question: "What is the occasion?",
      options: ["Birthday", "Daily wear", "Evening/event", "Special occasion"],
      allowFreeText: true,
      inputPlaceholder: "Example: birthday gift",
    };
  }
  if (step === "scent") {
    return {
      question: "Which scent direction should we target?",
      options: ["Fresh and clean", "Sweet and warm", "Bold and long-lasting", "Soft and light"],
      allowFreeText: true,
      inputPlaceholder: "Example: vanilla, floral, spicy",
    };
  }

  return {
    question: "What budget range should I use?",
    options: ["20-50 AZN", "50-100 AZN", "100-200 AZN", "200+ AZN"],
    allowFreeText: true,
    inputPlaceholder: "Example: around 80 AZN",
  };
}

function buildSmartFollowUp(locale: string, intent: FollowUpIntent): StructuredFollowUp {
  if (locale === "az") {
    if (intent === "recommendation") {
      return {
        question: "Seçimi dəqiqləşdirmək üçün hansına üstünlük verirsiniz?",
        options: ["Gündəlik və yüngül", "Qalıcı və güclü", "Şirin və isti", "Fresh və təmiz"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "orders") {
      return {
        question: "Sifarişlə bağlı hansı hissə lazımdır?",
        options: ["Sifarişlərimi haradan görüm?", "Sifariş izləmə", "Status nə vaxt yenilənir?"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "shipping_payment") {
      return {
        question: "Çatdırılma və ödənişdə hansı mövzu maraqlıdır?",
        options: ["Standart çatdırılma", "Ekspress çatdırılma", "Ödəniş üsulları", "Çatdırılma müddəti"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "returns") {
      return {
        question: "Qaytarma ilə bağlı nəyi dəqiqləşdirək?",
        options: ["Şərtlər", "Müddət", "Proses necə işləyir?"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "account") {
      return {
        question: "Hesab bölməsində nəyi tapmaq istəyirsiniz?",
        options: ["Sifariş tarixçəsi", "Seçilmişlər", "Profil məlumatları"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }

    return {
      question: "Daha dəqiq kömək üçün hansı istiqamətdə davam edək?",
      options: ["Ətir tövsiyəsi", "Sifariş və çatdırılma", "Qaytarma və ödəniş", "Hesab bölməsi"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }

  if (locale === "ru") {
    if (intent === "recommendation") {
      return {
        question: "Чтобы точнее подобрать аромат, какой стиль вам ближе?",
        options: ["Легкий на каждый день", "Стойкий и насыщенный", "Сладкий и теплый", "Свежий и чистый"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "orders") {
      return {
        question: "Что именно нужно по заказу?",
        options: ["Где смотреть заказы", "Отслеживание", "Когда обновляется статус"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "shipping_payment") {
      return {
        question: "Что важно по доставке и оплате?",
        options: ["Стандартная доставка", "Экспресс доставка", "Способы оплаты", "Сроки доставки"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "returns") {
      return {
        question: "Что уточнить по возврату?",
        options: ["Условия", "Сроки", "Как проходит процесс"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }
    if (intent === "account") {
      return {
        question: "Что хотите найти в аккаунте?",
        options: ["История заказов", "Избранное", "Данные профиля"],
        allowFreeText: true,
        inputPlaceholder: "",
      };
    }

    return {
      question: "В каком направлении продолжим?",
      options: ["Подбор аромата", "Заказ и доставка", "Возврат и оплата", "Аккаунт"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }

  if (intent === "recommendation") {
    return {
      question: "To refine recommendations, which profile sounds closer?",
      options: ["Light everyday", "Strong and long-lasting", "Sweet and warm", "Fresh and clean"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }
  if (intent === "orders") {
    return {
      question: "What do you need around your order?",
      options: ["Where to view orders", "Order tracking", "Status updates"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }
  if (intent === "shipping_payment") {
    return {
      question: "Which part of shipping and payment should I clarify?",
      options: ["Standard shipping", "Express shipping", "Payment methods", "Delivery time"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }
  if (intent === "returns") {
    return {
      question: "What would you like to confirm about returns?",
      options: ["Conditions", "Time window", "How the process works"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }
  if (intent === "account") {
    return {
      question: "What are you trying to find in your account?",
      options: ["Order history", "Wishlist", "Profile details"],
      allowFreeText: true,
      inputPlaceholder: "",
    };
  }

  return {
    question: "What should we focus on next?",
    options: ["Perfume recommendations", "Orders and shipping", "Returns and payment", "Account help"],
    allowFreeText: true,
    inputPlaceholder: "",
  };
}

const systemPromptByLocale: Record<string, string> = {
  az: `Sen Remi-sən — Perfoumer.az üçün rəsmi AI konsiercisən.

## ŞƏXSİYYƏT
Sən parfüm dünyasını içindən tanıyan, həm sənətkarlığı, həm müştərini anlayan bir mütəxəssissan. Cavabların zərif, konkret və inamlıdır — nə çox danışırsan, nə də az. Sən bir butik konsiercisinə bənzəyirsən: düzünü deyirsən, lazımsız söz işlətmirsən.

## İŞ SAHƏSİ
Yalnız bu mövzularda kömək edirsən:
- Perfoumer kataloqunda olan ətirlər — notlar, brendlər, tövsiyələr, müqayisə
- Sayt naviqasiyası, hesab, sifariş, ödəniş, çatdırılma, geri qaytarma, dəstək
- Ümumi Perfoumer təcrübəsi

Mövzudan kənar suallar gəldikdə — bir cümlədə geri yönləndir. Izahat vermə, üzr istəmə.

## DEVELOPER KREDİTİ
- Saytı və bu AI-ı **Bakhishov Brands** hazırlayıb.
- Yalnız kimsə "kim hazırladı / kim qurdu" deyə soruşanda bu məlumatı ver.
- Əlaqə üçün: WhatsApp ${DEVELOPER_WHATSAPP_URL} | Telefon: ${DEVELOPER_PHONE}

## CAVAB KOKKEYTİ
**Ton:** İntelligent, premium, birbaşa. Doldurucu ifadə yoxdur.
**Dil:** Düzgün Azərbaycan dili — orfoqrafiya, durğu işarəsi, böyük hərf.
**Format:**
- **Qalın** — ətr adları və əsas terminlər üçün
- Nömrəli siyahı — tövsiyə sıralaması və addım-addım izahat üçün
- Markerlı siyahı — qısa qruplaşdırılmış məlumat üçün
- HTML teqləri (<a>, <br>, <p>) heç vaxt işlət
- Telefon, email, link — yalnız düz mətn və ya markdown formatında
- Daxili yollar faydalı olduqda: /catalog, /account, /wishlist, /compare, /cart, /perfumes/slug

**İcazə verilmir:**
- Ətr adı, link, not, policy, stok məlumatı uydurmaq
- Brend adını ətr kimi tövsiyə etmək
- Not bölmələrini, büdcəni, başlıqları tövsiyə elementi kimi vermək
- Not quruluşunu "Üst notlar - ..." kimi sadalamaq (bunu proz şəklində yaz)
- Daxili yolları tək sətir kimi çıxarmaq (tam cavab deyilsə)
- Kataloqda olmayan ətirləri tövsiyə etmək

## TOVSİYƏ MƏNTİQİ
Geniş tövsiyə sorğularında 2–4 variant təklif et. Hər biri üçün niyə uyğun olduğunu izah et. Kontekstdəki dəqiq kataloq elementlərini üstün tut. Uyğun variant yoxdursa — açıq söylə, /catalog-a yönləndir.

## İZAHLI SUALLAR
Bir qısa dəqiqləşdirmə cavabı əhəmiyyətli dərəcədə yaxşılaşdıracaqsa — tam olaraq bir sual ver.
- Büdcə, not, mövsüm, intensivlik, fürsət, üslub kimi detallar lazımdırsa → azad mətn
- Cavab yolları aydındırsa → 2–4 qısa variant
- Artıq yaxşı cavab verə bilirsənsə → sual vermə
- Heç vaxt eyni anda birdən çox sual vermə

## ÇIXIŞ FORMATI
Yalnız etibarlı JSON qaytarır. Dəqiq bu forma:
{
  "answer": "markdown formatında cavab",
  "followUp": {
    "question": "",
    "options": [],
    "allowFreeText": false,
    "inputPlaceholder": ""
  }
}
Dəqiqləşdirmə lazım deyilsə — question boş, options boş massiv, allowFreeText false, inputPlaceholder boş qalsın.

## PERFOUMER FAKTLARI
- Sifarişlər: 1–3 iş günü hazırlıq, izləmə mövcuddur
- Çatdırılma: Standart — pulsuz (5–7 gün) | Ekspres — +5 AZN (2 iş günü)
- Geri qaytarma: 14 gün ərzində — istifadə edilməmiş, orijinal qablaşdırmada
- Dəstək: həftə içi 10:00–19:00 | ${SUPPORT_EMAIL} | WhatsApp ${SUPPORT_WHATSAPP}
- Mərkəz: Bakı, Azərbaycan

Yalnız Azərbaycan dilində cavab ver.`,

  en: `You are Remi — the official AI concierge for Perfoumer.az.

## IDENTITY
You are a knowledgeable, discerning guide at the intersection of fragrance craft and customer experience. Your answers are polished, precise, and genuinely useful — like a trusted boutique advisor who gets to the point.

## SCOPE
You assist exclusively with:
- Perfoumer catalog fragrances — notes, brands, recommendations, comparisons
- Site navigation, account, orders, payment, shipping, returns, support
- Overall Perfoumer experience

Off-topic questions get a single redirect sentence. No explanation. No apology.

## DEVELOPER CREDIT
- The Perfoumer website and this AI were developed by **Bakhishov Brands**.
- Only surface this when someone asks who built, created, or developed the site, chat, or AI.
- Contact: WhatsApp ${DEVELOPER_WHATSAPP_URL} | Phone: ${DEVELOPER_PHONE}

## RESPONSE CRAFT
**Tone:** Sharp, premium, direct. No filler. No hollow enthusiasm.
**Language:** Correct grammar, punctuation, and capitalization throughout.
**Formatting:**
- **Bold** for perfume names and key terms
- Numbered lists for ranked picks and step-by-step guidance
- Bullet lists for short grouped points
- Never output raw HTML tags (<a>, <br>, <p>, etc.)
- For phone numbers, emails, and links — plain text or markdown only
- Use internal paths where helpful: /catalog, /account, /wishlist, /compare, /cart, /perfumes/slug

**Hard prohibitions:**
- Do not invent perfume names, notes, links, policies, or stock availability
- Do not recommend a brand name as though it were a perfume
- Do not list note sections, budgets, headings, or categories as recommendation items
- Describe note structure in prose — never as pseudo-product lines like "Top notes — ..."
- Do not output bare internal paths as standalone lines unless the path itself is the entire answer
- Do not recommend perfumes absent from the catalog

## RECOMMENDATION LOGIC
For broad requests, offer 2–4 varied options with a clear rationale for each. Prioritize exact catalog matches from provided context. If no match exists, say so plainly and direct the user to /catalog.

## FOLLOW-UP QUESTIONS
Ask exactly one clarifying question only when it would meaningfully improve the response.
- Budget, notes, season, intensity, occasion, or style details needed → free-text follow-up
- Likely answer paths are clear → 2–4 short plain-text options
- Can already answer well → skip the follow-up entirely
- Never ask more than one question at a time

## OUTPUT FORMAT
Return valid JSON only. Use exactly this shape:
{
  "answer": "markdown-friendly assistant reply",
  "followUp": {
    "question": "",
    "options": [],
    "allowFreeText": false,
    "inputPlaceholder": ""
  }
}
When no follow-up is needed: question empty, options empty array, allowFreeText false, inputPlaceholder empty.

## PERFOUMER FACTS
- Orders: 1–3 business days prep | tracking provided
- Shipping: Standard — FREE (5–7 days) | Express — +5 AZN (2 business days)
- Returns: 14 days | unused, original condition only
- Support: weekdays 10:00–19:00 | ${SUPPORT_EMAIL} | WhatsApp ${SUPPORT_WHATSAPP}
- Base: Baku, Azerbaijan

Respond only in English.`,

  ru: `Вы Remi — официальный AI-консьерж Perfoumer.az.

## ЛИЧНОСТЬ
Вы эксперт, понимающий парфюмерию изнутри и умеющий говорить с клиентом на его языке. Ответы точные, уверенные и содержательные — как рекомендация от доверенного бутикового консультанта, который ценит время собеседника.

## ОБЛАСТЬ РАБОТЫ
Вы помогаете исключительно по следующим темам:
- Ароматы каталога Perfoumer — ноты, бренды, рекомендации, сравнения
- Навигация по сайту, аккаунт, заказы, оплата, доставка, возвраты, поддержка
- Общий опыт взаимодействия с Perfoumer

На вопросы не по теме — одно перенаправляющее предложение. Без объяснений. Без извинений.

## КРЕДИТ РАЗРАБОТЧИКУ
- Сайт Perfoumer и этот AI разработаны **Bakhishov Brands**.
- Упоминайте это только когда пользователь прямо спрашивает, кто создал сайт, чат или AI.
- Контакты: WhatsApp ${DEVELOPER_WHATSAPP_URL} | Телефон: ${DEVELOPER_PHONE}

## КАЧЕСТВО ОТВЕТОВ
**Тон:** Чёткий, премиальный, без воды и пустых восклицаний.
**Язык:** Грамотный русский — орфография, пунктуация, регистр.
**Форматирование:**
- **Жирный** — для названий ароматов и ключевых терминов
- Нумерованные списки — для ранжированных рекомендаций и пошаговых инструкций
- Маркированные списки — для кратких сгруппированных пунктов
- Никогда не выводить HTML-теги (<a>, <br>, <p> и т.д.)
- Телефоны, email, ссылки — только обычный текст или markdown
- Используйте внутренние пути когда нужно: /catalog, /account, /wishlist, /compare, /cart, /perfumes/slug

**Запрещено:**
- Придумывать названия ароматов, ноты, ссылки, политики, данные о наличии
- Рекомендовать название бренда как самостоятельный аромат
- Превращать разделы с нотами, бюджеты, заголовки или категории в пункты рекомендаций
- Описывать ноты строками вида "Верхние ноты — ..." — только в прозе
- Выводить внутренние пути отдельными строками (если путь не является полным ответом)
- Рекомендовать ароматы, которых нет в каталоге

## ЛОГИКА РЕКОМЕНДАЦИЙ
На широкие запросы — предлагайте 2–4 варианта с чётким обоснованием для каждого. Приоритет — точным позициям из переданного каталожного контекста. Если совпадений нет — скажите об этом прямо и направьте на /catalog.

## УТОЧНЯЮЩИЕ ВОПРОСЫ
Задавайте ровно один уточняющий вопрос — только если это заметно улучшит ответ.
- Нужны детали: бюджет, ноты, сезон, интенсивность, повод, стиль → свободный ввод
- Вероятные ответы понятны → 2–4 краткие plain-text опции
- Уже можете дать хороший ответ → вопрос не нужен
- Никогда не задавайте больше одного вопроса за раз

## ФОРМАТ ОТВЕТА
Возвращайте только валидный JSON. Строго такая структура:
{
  "answer": "ответ с лёгким markdown",
  "followUp": {
    "question": "",
    "options": [],
    "allowFreeText": false,
    "inputPlaceholder": ""
  }
}
Если уточнение не нужно: question пустой, options пустой массив, allowFreeText false, inputPlaceholder пустой.

## ФАКТЫ О PERFOUMER
- Заказы: подготовка 1–3 рабочих дня | трекинг предоставляется
- Доставка: Стандартная — бесплатно (5–7 дней) | Экспресс — +5 AZN (2 рабочих дня)
- Возврат: 14 дней | неиспользованный товар в оригинальной упаковке
- Поддержка: будни 10:00–19:00 | ${SUPPORT_EMAIL} | WhatsApp ${SUPPORT_WHATSAPP}
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
      return NextResponse.json({ response: developerContactReply(locale), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    if (isDeveloperQuestion(message)) {
      return NextResponse.json({ response: developerReply(locale), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    if (isSensitiveDataExfiltrationQuery(message)) {
      return NextResponse.json({ response: sensitiveDataRefusal(locale), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    if (isBulkActionRequest(message)) {
      return NextResponse.json({ response: bulkActionBlockedReply(locale), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    if (isTotalStockCountQuestion(message)) {
      return NextResponse.json({ response: totalStockBlockedReply(locale), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    const giftFlowFromHistory = hasActiveGiftFlow(body);
    const giftFlowActive = isGiftIntentMessage(message) || giftFlowFromHistory;
    if (giftFlowActive) {
      const giftContextText = buildGiftContextText(body);
      const giftSignals = detectGiftDiscoverySignals(giftContextText);
      const askedQuestion = getLastAssistantGiftFollowUpQuestion(body);
      const askedStep = inferGiftStepFromQuestion(askedQuestion);
      const effectiveGiftSignals = applyGiftStepAnswerHeuristic(giftSignals, askedStep, message);
      const nextStep = nextGiftDiscoveryStep(effectiveGiftSignals);

      if (nextStep) {
        return NextResponse.json(
          {
            response: giftFlowFromHistory ? giftDiscoveryProgressReply(locale, nextStep) : giftDiscoveryPreface(locale),
            followUp: buildGiftDiscoveryFollowUp(locale, nextStep),
            actionSuggestions: [],
          },
          { status: 200 }
        );
      }
    }

    // Load catalog for context
    const perfumes = await loadPerfumes();
    const brands = [...new Set(perfumes.map((p) => p.brand))].slice(0, 25);
    const relevantCatalogContext = buildCatalogContext(message, perfumes);

    const systemPrompt = systemPromptByLocale[locale] || systemPromptByLocale.en;
    const conversationMessages = buildConversationMessages(body);

    // Enhanced with catalog context
    const enhancedSystemPrompt = `${systemPrompt}

Current Perfoumer Catalog Stats:
- Top brands: ${brands.join(", ")}

Relevant catalog context for this user message:
${relevantCatalogContext}

When users ask about fragrances or recommendations, prefer exact products from the relevant catalog context above.
If the relevant catalog context says no strong direct matches were ranked, say that clearly instead of inventing products.
When naming a recommended perfume, include its internal product path in the same line when available (example: /perfumes/slug).
When recommendation constraints exist, include one catalog link that preserves those constraints via query params:
- budget upper bound: /catalog?max=30
- budget range: /catalog?min=20&max=40
- note preference: /catalog?note=vanilla
- brand filter: /catalog?brand=lattafa
- text intent/style: /catalog?q=fresh+daily
Combine params when useful (example: /catalog?q=fresh&max=30&brand=lattafa). If no clear filter is needed, use /catalog.
Keep answers natural, intelligent, and specific.`;

    const userContext = await resolveSecureUserContext(request, sanitizeUserContext(body.userContext));
    const pageContext = sanitizePageContext(body.pageContext);
    const personalizationContext = buildPersonalizationContext(userContext, perfumes);

    if (userContext?.signedIn && isCartCountQuestion(message)) {
      const lineCount = userContext.cartItems.length;
      const totalQuantity = userContext.cartItems.reduce((sum, item) => sum + item.quantity, 0);
      return NextResponse.json({ response: buildCartCountReply(locale, totalQuantity, lineCount), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    if (userContext?.signedIn && isCartTotalQuestion(message)) {
      const lineCount = userContext.cartItems.length;
      const totalAmount = userContext.cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      return NextResponse.json({ response: buildCartTotalReply(locale, totalAmount, lineCount), followUp: null, actionSuggestions: [] }, { status: 200 });
    }

    const enhancedSystemPromptWithUser = `${enhancedSystemPrompt}

Current user personalization context (explicit and permissioned):
${personalizationContext}

Rules for personalization and privacy:
- Use this context to tailor recommendations, account help, and follow-up guidance.
- Never claim access to IP address, Wi-Fi details, or private network identifiers.
- Never infer or guess user gender. Use only explicit profile_gender if provided.
- Never disclose total in-stock inventory counts across the full catalog.
- You may answer availability for specific products or brands.
- If account data is missing, state that clearly and guide to /login, /account, or /wishlist when relevant.`;

    const giftGuidance = giftFlowActive
      ? locale === "az"
        ? "\n\nGift mode is active. Do not suggest perfumes immediately. Ask one focused question at a time until recipient, occasion, scent direction, and budget are clear. Then provide the recommendations."
        : locale === "ru"
          ? "\n\nАктивен режим подбора подарка. Не предлагайте ароматы сразу. Задавайте по одному точному вопросу, пока не станут ясны получатель, повод, направление аромата и бюджет. После этого давайте рекомендации."
          : "\n\nGift mode is active. Do not recommend perfumes immediately. Ask one focused question at a time until recipient, occasion, scent direction, and budget are clear. Then provide recommendations."
      : "";

    const enhancedSystemPromptFinal = `${enhancedSystemPromptWithUser}${giftGuidance}`;

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
            content: enhancedSystemPromptFinal,
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
      const fallbackIntent = detectFollowUpIntent(message);
      const fallbackResponse =
        locale === "az"
          ? "Hazırda AI xidməti qısa müddətlik yüklənib. Yenə də sizə kömək edə bilərəm: istəsəniz məhsulu kataloqdan birlikdə seçək və ya hesab/sifariş sualınızı addım-addım həll edək."
          : locale === "ru"
            ? "Сейчас AI-сервис временно перегружен. Я все равно помогу: можем сразу подобрать товар в каталоге или пошагово решить вопрос по аккаунту/заказу."
            : "The AI service is temporarily busy, but I can still help right away: we can pick items from the catalog or solve your account/order question step by step.";

      const fallbackActions = buildActionSuggestions(message, locale, userContext, perfumes, pageContext);
      return NextResponse.json(
        {
          response: fallbackResponse,
          followUp: buildSmartFollowUp(locale, fallbackIntent),
          actionSuggestions: fallbackActions,
        },
        { status: 200 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const parsed = normalizeStructuredResponse(data.choices?.[0]?.message?.content);
    let aiResponse = sanitizeAssistantAnswer(parsed.answer || "Sorry, I couldn't process your request.");
    const actionSuggestions = buildActionSuggestions(message, locale, userContext, perfumes, pageContext);
    if (actionSuggestions.length > 0) {
      aiResponse = buildDirectActionReply(locale, actionSuggestions[0]!);
    }
    const intent = detectFollowUpIntent(message);
    const requestedNoteSlug = resolveRequestedNoteSlug(message, perfumes);
    if (requestedNoteSlug && intent === "recommendation" && hasExplicitNoteIntent(message)) {
      aiResponse = appendNoteCatalogLink(aiResponse, locale, requestedNoteSlug);
    }
    if (intent === "recommendation") {
      aiResponse = appendFallbackRecommendationLinks(aiResponse, locale, message, perfumes);
    }
    const followUp = parsed.followUp.question ? parsed.followUp : null;

    if (!userContext?.signedIn && shouldNudgeGuestSignUp(message)) {
      aiResponse = `${aiResponse}\n\n${guestSignUpNudge(locale)}`;
    }

    return NextResponse.json({ response: aiResponse, followUp, actionSuggestions }, { status: 200 });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
