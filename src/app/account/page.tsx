import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { AccountClient } from "@/components/account/AccountClient";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export const metadata: Metadata = {
  title: "Hesabım",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountPage() {
  const locale = await getCurrentLocale();
  const supabaseConfig = getSupabasePublicConfigFromServer();

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-6 pb-6 md:px-10 md:pb-8">
        <section className="pt-8 pb-4 md:pb-5">
          <AccountClient locale={locale} supabase={supabaseConfig} />
        </section>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
