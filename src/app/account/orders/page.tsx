import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { AccountOrdersClient } from "@/components/account/AccountOrdersClient";
import { getCurrentLocale } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "Hesabım - Sifarişlər",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountOrdersPage() {
  const locale = await getCurrentLocale();

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[880px] px-4 pb-6 md:px-10 md:pb-8">
        <section className="pt-6 pb-4 md:pt-8 md:pb-5">
          <AccountOrdersClient locale={locale} />
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
