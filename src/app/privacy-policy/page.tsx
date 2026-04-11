import type { Metadata } from "next";

import { LegalPageView } from "@/components/legal/LegalPageView";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getLegalMetadata, getLegalPage } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  return getLegalMetadata(locale, "privacy-policy");
}

export default async function PrivacyPolicyPage() {
  const locale = await getCurrentLocale();
  const page = getLegalPage(locale, "privacy-policy");

  return <LegalPageView locale={locale} page={page} />;
}
