import type { Metadata } from "next";

import { LegalPageView } from "@/components/legal/LegalPageView";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getLegalMetadata, getLegalPage } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  return getLegalMetadata(locale, "refund-policy");
}

export default async function RefundPolicyPage() {
  const locale = await getCurrentLocale();
  const page = getLegalPage(locale, "refund-policy");

  return <LegalPageView locale={locale} page={page} />;
}
