import type { Metadata } from "next";

import { LegalPageView } from "@/components/legal/LegalPageView";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getLegalMetadata, getLegalPage } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  return getLegalMetadata(locale, "terms-and-conditions");
}

export default async function TermsAndConditionsPage() {
  const locale = await getCurrentLocale();
  const page = getLegalPage(locale, "terms-and-conditions");

  return <LegalPageView locale={locale} page={page} />;
}
