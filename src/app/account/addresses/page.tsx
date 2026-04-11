import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { AccountAddressesClient } from "@/components/account/AccountAddressesClient";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "Hesabım - Ünvanlar",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountAddressesPage() {
  const locale = await getCurrentLocale();
  const supabaseConfig = getSupabasePublicConfigFromServer();

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[880px] px-4 pb-6 md:px-10 md:pb-8">
        <section className="pt-6 pb-4 md:pt-8 md:pb-5">
          <AccountAddressesClient locale={locale} supabase={supabaseConfig} />
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
