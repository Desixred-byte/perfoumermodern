"use client";

import { Heart } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type PerfumeWishlistButtonProps = {
  perfumeSlug: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

const copy = {
  az: {
    save: "İstək siyahısına əlavə et",
    saved: "Saxlanılıb",
  },
  en: {
    save: "Add to wishlist",
    saved: "Saved",
  },
  ru: {
    save: "Добавить в wishlist",
    saved: "Сохранено",
  },
} as const;

export function PerfumeWishlistButton({ perfumeSlug, locale, supabase: supabaseConfig }: PerfumeWishlistButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonFx, setButtonFx] = useState<"save" | "remove" | null>(null);

  const loginHref = useMemo(() => {
    const nextPath = pathname || `/perfumes/${perfumeSlug}`;
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }, [pathname, perfumeSlug]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setIsInWishlist(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      return;
    }

    let isMounted = true;

    const loadWishlistState = async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("perfume_slug")
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug)
        .maybeSingle();

      if (!isMounted) return;
      setIsInWishlist(Boolean(data));
    };

    void loadWishlistState();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user, perfumeSlug]);

  useEffect(() => {
    if (!buttonFx) {
      return;
    }

    const timer = window.setTimeout(() => {
      setButtonFx(null);
    }, 620);

    return () => {
      window.clearTimeout(timer);
    };
  }, [buttonFx]);

  const toggleWishlist = async () => {
    if (!isSupabaseConfigured(supabaseConfig ?? undefined) || !supabase) {
      return;
    }

    if (!session?.user) {
      router.push(loginHref);
      return;
    }

    setIsSubmitting(true);

    if (isInWishlist) {
      await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug);
      setIsInWishlist(false);
      setButtonFx("remove");
      setIsSubmitting(false);
      return;
    }

    await supabase.from("wishlists").insert({
      user_id: session.user.id,
      perfume_slug: perfumeSlug,
    });
    setIsInWishlist(true);
    setButtonFx("save");
    setIsSubmitting(false);
  };

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      disabled={isSubmitting}
      className={[
        "wishlist-pill inline-flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-medium",
        isInWishlist
          ? "wishlist-pill--saved border-zinc-900 bg-zinc-900 text-white"
          : "wishlist-pill--idle border-zinc-300 bg-white text-zinc-700",
        buttonFx === "save" ? "wishlist-pill--save-burst" : "",
        buttonFx === "remove" ? "wishlist-pill--remove-swipe" : "",
        isSubmitting ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
      aria-label={isInWishlist ? copy[locale].saved : copy[locale].save}
    >
      <span
        className={[
          "wishlist-pill-icon",
          buttonFx === "save" ? "wishlist-pill-icon--pop" : "",
          buttonFx === "remove" ? "wishlist-pill-icon--fall" : "",
        ].join(" ")}
      >
        <Heart size={18} weight={isInWishlist ? "fill" : "regular"} />
      </span>
      {isInWishlist ? copy[locale].saved : copy[locale].save}
    </button>
  );
}
