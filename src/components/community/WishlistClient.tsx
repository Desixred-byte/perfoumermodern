"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";
import type { Perfume } from "@/types/catalog";
import type { WishlistRow } from "@/types/community";

type WishlistClientProps = {
  perfumes: Perfume[];
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  title: string;
  subtitle: string;
  configMissing: string;
  signInTitle: string;
  signInBody: string;
  signInCta: string;
  loading: string;
  noItems: string;
  remove: string;
  signOut: string;
  signedInAs: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "Mənim Wishlist",
    subtitle: "Yalnız sənə aid saxladığın ətirlər.",
    configMissing:
      "Supabase konfiqurasiyası yoxdur. .env faylında NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY əlavə edin.",
    signInTitle: "Wishlist üçün giriş et",
    signInBody: "Ayrı login səhifəsindən daxil olub şəxsi wishlist-i gör.",
    signInCta: "Giriş / Qeydiyyat",
    loading: "Yüklənir...",
    noItems: "Wishlist boşdur. Məhsul səhifəsindən əlavə edə bilərsən.",
    remove: "Sil",
    signOut: "Çıxış",
    signedInAs: "Daxil olan",
  },
  en: {
    title: "My Wishlist",
    subtitle: "Your saved perfumes, just for your account.",
    configMissing:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
    signInTitle: "Sign in to view wishlist",
    signInBody: "Use the dedicated login screen and come back to your personal list.",
    signInCta: "Login / Sign up",
    loading: "Loading...",
    noItems: "Your wishlist is empty. Add perfumes from product pages.",
    remove: "Remove",
    signOut: "Sign out",
    signedInAs: "Signed in as",
  },
  ru: {
    title: "Мой Wishlist",
    subtitle: "Сохраненные ароматы только для вашего аккаунта.",
    configMissing:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.",
    signInTitle: "Войдите, чтобы увидеть wishlist",
    signInBody: "Используйте отдельный экран входа и вернитесь к личному списку.",
    signInCta: "Вход / Регистрация",
    loading: "Загрузка...",
    noItems: "Wishlist пока пуст. Добавляйте ароматы со страницы товара.",
    remove: "Удалить",
    signOut: "Выйти",
    signedInAs: "Вы вошли как",
  },
};

export function WishlistClient({ perfumes, locale, supabase: supabaseConfig }: WishlistClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(() => Boolean(supabase));
  const [isListLoading, setIsListLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [wishlists, setWishlists] = useState<WishlistRow[]>([]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session ?? null);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      if (!nextSession) {
        setWishlists([]);
        setIsListLoading(false);
      }
      router.refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      return;
    }

    let isMounted = true;

    const loadWishlists = async () => {
      setIsListLoading(true);

      const { data, error } = await supabase
        .from("wishlists")
        .select("user_id,perfume_slug,created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        setWishlists([]);
      } else {
        setWishlists((data as WishlistRow[] | null) ?? []);
      }

      setIsListLoading(false);
    };

    void loadWishlists();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user]);

  const perfumesBySlug = useMemo(
    () => new Map(perfumes.map((perfume) => [perfume.slug, perfume])),
    [perfumes],
  );

  const wishedPerfumes = useMemo(
    () =>
      wishlists
        .map((item) => perfumesBySlug.get(item.perfume_slug))
        .filter((item): item is Perfume => Boolean(item)),
    [wishlists, perfumesBySlug],
  );

  const removeFromWishlist = async (perfumeSlug: string) => {
    if (!supabase || !session?.user) {
      return;
    }

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", session.user.id)
      .eq("perfume_slug", perfumeSlug);

    if (error) {
      setMessage(error.message);
      return;
    }

    setWishlists((prev) => prev.filter((item) => item.perfume_slug !== perfumeSlug));
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/login?next=%2Fwishlist");
    router.refresh();
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  if (isSessionLoading) {
    return <p className="text-sm text-zinc-500">{copy.loading}</p>;
  }

  if (!session) {
    return (
      <div className="max-w-xl rounded-[1.8rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f3f3f2_70%)] p-6 shadow-sm">
        <h2 className="text-2xl leading-tight text-zinc-900">{copy.signInTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{copy.signInBody}</p>
        <Link
          href="/login?next=%2Fwishlist"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
        >
          {copy.signInCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.4rem] border border-zinc-200 bg-white px-4 py-3">
        <p className="text-sm text-zinc-600">
          {copy.signedInAs}: <span className="font-medium text-zinc-900">{session.user.email}</span>
        </p>

        <button
          type="button"
          onClick={signOut}
          className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
        >
          {copy.signOut}
        </button>
      </div>

      {isListLoading ? <p className="text-sm text-zinc-500">{copy.loading}</p> : null}

      {!isListLoading && wishedPerfumes.length === 0 ? (
        <p className="text-sm text-zinc-600">{copy.noItems}</p>
      ) : null}

      {wishedPerfumes.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          {wishedPerfumes.map((perfume) => (
            <div key={perfume.slug} className="space-y-2">
              <ProductCard perfume={perfume} locale={locale} />
              <button
                type="button"
                onClick={() => removeFromWishlist(perfume.slug)}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                {copy.remove}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
