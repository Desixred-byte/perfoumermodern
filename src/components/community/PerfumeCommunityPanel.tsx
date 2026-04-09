"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";
import type { CommentRow } from "@/types/community";

type PerfumeCommunityPanelProps = {
  perfumeSlug: string;
  perfumeName: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  title: string;
  subtitle: string;
  signInTitle: string;
  signInBody: string;
  signInCta: string;
  signOut: string;
  wishlistTitle: string;
  wishlistAdd: string;
  wishlistRemove: string;
  wishlistNeedAuth: string;
  ratingTitle: string;
  ratingLabel: string;
  commentLabel: string;
  commentPlaceholder: string;
  submit: string;
  mustLogin: string;
  loading: string;
  average: string;
  votes: string;
  noComments: string;
  configMissing: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "İstifadəçi rəyləri və wishlist",
    subtitle: "Rəy, ulduz rating və şəxsi wishlist üçün giriş et.",
    signInTitle: "Rəy yazmaq üçün hesabına daxil ol",
    signInBody: "Email ilə hesab yaradıb daxil olduqdan sonra rəy, rating və wishlist aktiv olacaq.",
    signInCta: "Giriş / Qeydiyyat",
    signOut: "Çıxış",
    wishlistTitle: "Mənim wishlist",
    wishlistAdd: "Wishlist-ə əlavə et",
    wishlistRemove: "Wishlist-dən sil",
    wishlistNeedAuth: "Wishlist üçün əvvəlcə daxil olun.",
    ratingTitle: "Rəy yaz",
    ratingLabel: "Rating",
    commentLabel: "Şərh",
    commentPlaceholder: "Bu ətir haqqında fikrinizi yazın...",
    submit: "Rəyi paylaş",
    mustLogin: "Rəy və rating üçün daxil olmaq lazımdır.",
    loading: "Yüklənir...",
    average: "Orta rating",
    votes: "rəy",
    noComments: "Hələ rəy yoxdur. İlk rəyi sən yaz.",
    configMissing:
      "Supabase konfiqurasiyası yoxdur. .env faylında NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY əlavə edin.",
  },
  en: {
    title: "Community reviews and wishlist",
    subtitle: "Sign in to leave comments, ratings, and your personal wishlist.",
    signInTitle: "Sign in to post your review",
    signInBody: "Create an email account and continue to unlock rating, comments, and wishlist.",
    signInCta: "Login / Sign up",
    signOut: "Sign out",
    wishlistTitle: "My wishlist",
    wishlistAdd: "Add to wishlist",
    wishlistRemove: "Remove from wishlist",
    wishlistNeedAuth: "Sign in first to use wishlist.",
    ratingTitle: "Write a review",
    ratingLabel: "Rating",
    commentLabel: "Comment",
    commentPlaceholder: "Share your thoughts about this perfume...",
    submit: "Post review",
    mustLogin: "You need to sign in before posting a review.",
    loading: "Loading...",
    average: "Average rating",
    votes: "reviews",
    noComments: "No reviews yet. Be the first one.",
    configMissing:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
  },
  ru: {
    title: "Отзывы и wishlist",
    subtitle: "Войдите, чтобы оставлять комментарии, рейтинг и личный wishlist.",
    signInTitle: "Войдите, чтобы оставить отзыв",
    signInBody: "Создайте аккаунт через email и откройте рейтинг, комментарии и wishlist.",
    signInCta: "Вход / Регистрация",
    signOut: "Выйти",
    wishlistTitle: "Мой wishlist",
    wishlistAdd: "Добавить в wishlist",
    wishlistRemove: "Удалить из wishlist",
    wishlistNeedAuth: "Сначала войдите в аккаунт.",
    ratingTitle: "Оставить отзыв",
    ratingLabel: "Рейтинг",
    commentLabel: "Комментарий",
    commentPlaceholder: "Напишите, что думаете об этом аромате...",
    submit: "Опубликовать",
    mustLogin: "Чтобы оставить отзыв, нужно войти.",
    loading: "Загрузка...",
    average: "Средний рейтинг",
    votes: "отзывов",
    noComments: "Пока нет отзывов. Будьте первым.",
    configMissing:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.",
  },
};

const formatterByLocale: Record<Locale, string> = {
  az: "az-AZ",
  en: "en-US",
  ru: "ru-RU",
};

export function PerfumeCommunityPanel({
  perfumeSlug,
  perfumeName,
  locale,
  supabase: supabaseConfig,
}: PerfumeCommunityPanelProps) {
  const copy = copyByLocale[locale];
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(() => Boolean(supabase));
  const [isLoadingComments, setIsLoadingComments] = useState(() => Boolean(supabase));
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [rating, setRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isWishlistSubmitting, setIsWishlistSubmitting] = useState(false);

  const authHref = useMemo(() => {
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
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setIsInWishlist(false);
      }
      router.refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoadingComments(true);

      const { data, error } = await supabase
        .from("comments")
        .select("id,user_id,user_email,perfume_slug,rating,comment,created_at")
        .eq("perfume_slug", perfumeSlug)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setFeedbackMessage(error.message);
        setComments([]);
      } else {
        setComments((data as CommentRow[] | null) ?? []);
      }

      setIsLoadingComments(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [supabase, perfumeSlug]);

  useEffect(() => {
    if (!supabase || !session?.user) {
      return;
    }

    let isMounted = true;

    const loadWishlistState = async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("perfume_slug")
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug)
        .maybeSingle();

      if (!isMounted) return;
      if (error) {
        setFeedbackMessage(error.message);
        return;
      }

      setIsInWishlist(Boolean(data));
    };

    void loadWishlistState();

    return () => {
      isMounted = false;
    };
  }, [supabase, session?.user, perfumeSlug]);

  const avgRating = useMemo(() => {
    if (!comments.length) {
      return null;
    }

    const total = comments.reduce((sum, item) => sum + item.rating, 0);
    return (total / comments.length).toFixed(1);
  }, [comments]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !session?.user) {
      setFeedbackMessage(copy.mustLogin);
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    setIsCommentSubmitting(true);
    setFeedbackMessage("");

    const { error } = await supabase.from("comments").insert({
      user_id: session.user.id,
      user_email: session.user.email ?? "",
      perfume_slug: perfumeSlug,
      rating,
      comment: commentText.trim(),
    });

    if (error) {
      setFeedbackMessage(error.message);
      setIsCommentSubmitting(false);
      return;
    }

    const { data, error: refetchError } = await supabase
      .from("comments")
      .select("id,user_id,user_email,perfume_slug,rating,comment,created_at")
      .eq("perfume_slug", perfumeSlug)
      .order("created_at", { ascending: false });

    if (refetchError) {
      setFeedbackMessage(refetchError.message);
    } else {
      setComments((data as CommentRow[] | null) ?? []);
      setCommentText("");
      setRating(5);
    }

    setIsCommentSubmitting(false);
  };

  const toggleWishlist = async () => {
    if (!supabase || !session?.user) {
      setFeedbackMessage(copy.wishlistNeedAuth);
      return;
    }

    setIsWishlistSubmitting(true);
    setFeedbackMessage("");

    if (isInWishlist) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", session.user.id)
        .eq("perfume_slug", perfumeSlug);

      if (error) {
        setFeedbackMessage(error.message);
      } else {
        setIsInWishlist(false);
      }

      setIsWishlistSubmitting(false);
      return;
    }

    const { error } = await supabase.from("wishlists").insert({
      user_id: session.user.id,
      perfume_slug: perfumeSlug,
    });

    if (error) {
      setFeedbackMessage(error.message);
    } else {
      setIsInWishlist(true);
    }

    setIsWishlistSubmitting(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setFeedbackMessage(error.message);
    } else {
      setFeedbackMessage("");
    }
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return (
      <section className="rounded-[1.95rem] bg-white/96 p-6 shadow-[0_20px_54px_rgba(24,24,24,0.05)] ring-1 ring-zinc-200/80 md:p-8">
        <p className="text-sm text-zinc-600">{copy.configMissing}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.95rem] bg-white/96 p-6 shadow-[0_20px_54px_rgba(24,24,24,0.05)] ring-1 ring-zinc-200/80 md:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl leading-tight tracking-[-0.02em] text-zinc-900 md:text-4xl">{copy.title}</h2>
        <p className="text-zinc-500">{copy.subtitle}</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <div className="space-y-5 rounded-[1.4rem] bg-zinc-50 p-5 ring-1 ring-zinc-200/80">
          {!session && !isSessionLoading ? (
            <div className="rounded-2xl border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f4f4f3_70%)] p-5 shadow-sm">
              <p className="text-lg font-medium text-zinc-900">{copy.signInTitle}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.signInBody}</p>
              <Link
                href={authHref}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
              >
                {copy.signInCta}
              </Link>
            </div>
          ) : null}

          {isSessionLoading ? <p className="text-sm text-zinc-500">{copy.loading}</p> : null}

          {session ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">{session.user.email}</p>

              <button
                type="button"
                onClick={toggleWishlist}
                disabled={isWishlistSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isInWishlist ? copy.wishlistRemove : copy.wishlistAdd}
              </button>

              <p className="text-xs text-zinc-500">
                {copy.wishlistTitle}: {isInWishlist ? "1" : "0"} • {perfumeName}
              </p>

              <button
                type="button"
                onClick={signOut}
                className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
              >
                {copy.signOut}
              </button>
            </div>
          ) : null}

          {feedbackMessage ? <p className="text-sm text-zinc-600">{feedbackMessage}</p> : null}
        </div>

        <div className="space-y-5 rounded-[1.4rem] bg-zinc-50 p-5 ring-1 ring-zinc-200/80">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-zinc-400 uppercase">{copy.ratingTitle}</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-2xl font-medium text-zinc-900">{avgRating ?? "-"}</p>
              <p className="mb-0.5 text-sm text-zinc-500">
                {copy.average} • {comments.length} {copy.votes}
              </p>
            </div>
          </div>

          {session ? (
            <form className="space-y-3" onSubmit={submitComment}>
              <label className="block">
                <span className="mb-1 block text-sm text-zinc-600">{copy.ratingLabel}</span>
                <select
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-zinc-600">{copy.commentLabel}</span>
                <textarea
                  required
                  minLength={2}
                  maxLength={600}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={copy.commentPlaceholder}
                  className="h-28 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-zinc-400"
                />
              </label>

              <button
                type="submit"
                disabled={isCommentSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.submit}
              </button>
            </form>
          ) : (
            <p className="text-sm text-zinc-500">{copy.mustLogin}</p>
          )}

          <div className="space-y-3">
            {isLoadingComments ? <p className="text-sm text-zinc-500">{copy.loading}</p> : null}

            {!isLoadingComments && comments.length === 0 ? (
              <p className="text-sm text-zinc-500">{copy.noComments}</p>
            ) : null}

            {!isLoadingComments
              ? comments.map((item) => (
                  <article key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-700">{item.user_email}</p>
                      <p className="text-xs text-zinc-500">
                        {new Intl.DateTimeFormat(formatterByLocale[locale], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">{item.rating} / 5</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">{item.comment}</p>
                  </article>
                ))
              : null}
          </div>
        </div>
      </div>
    </section>
  );
}
