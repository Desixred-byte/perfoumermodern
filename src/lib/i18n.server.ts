import { cookies } from "next/headers";

import { defaultLocale, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getCurrentLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("perfoumer-locale")?.value);
}

export type { Locale } from "@/lib/i18n";
export { defaultLocale, normalizeLocale } from "@/lib/i18n";
