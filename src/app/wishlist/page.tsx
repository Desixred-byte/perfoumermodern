import { Footer } from "@/components/Footer";
import { WishlistClient } from "@/components/community/WishlistClient";
import { getPerfumes } from "@/lib/catalog";
import { getCurrentLocale } from "@/lib/i18n.server";
import { getSupabasePublicConfigFromServer } from "@/lib/supabase/env.server";

export default async function WishlistPage() {
  const supabaseConfig = getSupabasePublicConfigFromServer();
  const locale = await getCurrentLocale();
  const perfumes = await getPerfumes();

  return (
    <div className="bg-[#f3f3f2]">
      <div className="mx-auto max-w-[1540px] px-6 pb-14 md:px-10">
        <section className="pt-30 pb-8">
          <h1 className="text-[3rem] leading-[0.95] tracking-[-0.04em] text-zinc-900 md:text-[4.4rem]">
            Wishlist
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-500">
            Login-based personal list for perfumes you want to keep and compare later.
          </p>
        </section>

        <WishlistClient perfumes={perfumes} locale={locale} supabase={supabaseConfig} />
      </div>

      <Footer locale={locale} />
    </div>
  );
}
