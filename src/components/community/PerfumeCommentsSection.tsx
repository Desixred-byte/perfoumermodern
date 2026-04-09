"use client";

import { ArrowRight, ChatCircleDots, Heart } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";

import { formatMessage, type Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";
import type { CommentRow } from "@/types/community";

type PerfumeCommentsSectionProps = {
  perfumeSlug: string;
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  heading: string;
  subheading: string;
  writeReview: string;
  yourRating: string;
  yourExperience: string;
  rating: string;
  comment: string;
  commentPlaceholder: string;
  newest: string;
  oldest: string;
  submit: string;
  average: string;
  reviews: string;
  noComments: string;
  loading: string;
  unknownUser: string;
  heartsValue: string;
  chooseHearts: string;
  loginRequired: string;
  usernameMissing: string;
  ratingInvalid: string;
  commentTooShort: string;
  commentTooLong: string;
  submitSuccess: string;
  submitFailed: string;
  slowDown: string;
  alreadyReviewed: string;
  oneReviewOnly: string;
  configMissing: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    heading: "İstifadəçi Rəyləri",
    subheading: "Bu məhsul üçün bütün rəylər və qiymətləndirmələr",
    writeReview: "Rəy Yaz",
    yourRating: "Sənin qiymətləndirmən",
    yourExperience: "Sənin təcrübən",
    rating: "Qiymətləndirmə",
    comment: "Şərh",
    commentPlaceholder: "Təcrübəni bölüş...",
    newest: "Ən yenilər",
    oldest: "Ən köhnələr",
    submit: "Rəyi paylaş",
    average: "Orta qiymət",
    reviews: "rəy",
    noComments: "Hələ rəy yoxdur — ilk təcrübəni sən paylaş.",
    loading: "Yüklənir...",
    unknownUser: "İstifadəçi",
    heartsValue: "{count}/5 ürək",
    chooseHearts: "{count} ürək seç",
    loginRequired: "Rəy yazmaq üçün əvvəlcə daxil olun.",
    usernameMissing: "Rəy yazmaq üçün istifadəçi adı tələb olunur.",
    ratingInvalid: "Qiymətləndirmə 1 ilə 5 arasında olmalıdır.",
    commentTooShort: "Rəy ən azı {count} simvol olmalıdır.",
    commentTooLong: "Rəy ən çox {count} simvol ola bilər.",
    submitSuccess: "Rəyiniz uğurla paylaşıldı.",
    submitFailed: "Rəy paylaşılmadı. Zəhmət olmasa yenidən cəhd edin.",
    slowDown: "Çox tez-tez paylaşım etdiniz. Bir az sonra yenidən yoxlayın.",
    alreadyReviewed: "Bu məhsul üçün artıq rəy yazmısınız.",
    oneReviewOnly: "Hər istifadəçi bu məhsul üçün yalnız bir rəy paylaşa bilər.",
    configMissing: "Supabase konfiqurasiyası yoxdur.",
  },
  en: {
    heading: "Customer Reviews",
    subheading: "All comments and ratings for this perfume",
    writeReview: "Write a Review",
    yourRating: "Your rating",
    yourExperience: "Your experience",
    rating: "Rating",
    comment: "Comment",
    commentPlaceholder: "Share your experience...",
    newest: "Newest",
    oldest: "Oldest",
    submit: "Post comment",
    average: "Average rating",
    reviews: "reviews",
    noComments: "No reviews yet — be the first to share your experience.",
    loading: "Loading...",
    unknownUser: "User",
    heartsValue: "{count}/5 hearts",
    chooseHearts: "Choose {count} hearts",
    loginRequired: "Please sign in first to leave a comment.",
    usernameMissing: "A username is required before posting comments.",
    ratingInvalid: "Rating must be between 1 and 5.",
    commentTooShort: "Comment must be at least {count} characters.",
    commentTooLong: "Comment can be at most {count} characters.",
    submitSuccess: "Your comment was posted successfully.",
    submitFailed: "Could not post your comment. Please try again.",
    slowDown: "You are posting too quickly. Please wait a bit and try again.",
    alreadyReviewed: "You already posted a review for this perfume.",
    oneReviewOnly: "Each user can post only one review per perfume.",
    configMissing: "Supabase configuration is missing.",
  },
  ru: {
    heading: "Отзывы покупателей",
    subheading: "Все комментарии и оценки для этого аромата",
    writeReview: "Оставить отзыв",
    yourRating: "Ваша оценка",
    yourExperience: "Ваш опыт",
    rating: "Рейтинг",
    comment: "Комментарий",
    commentPlaceholder: "Поделитесь впечатлением...",
    newest: "Сначала новые",
    oldest: "Сначала старые",
    submit: "Опубликовать",
    average: "Средний рейтинг",
    reviews: "отзывов",
    noComments: "Пока нет отзывов — поделитесь впечатлением первым.",
    loading: "Загрузка...",
    unknownUser: "Пользователь",
    heartsValue: "{count}/5 сердец",
    chooseHearts: "Выбрать {count} серд.",
    loginRequired: "Чтобы оставить отзыв, сначала войдите в аккаунт.",
    usernameMissing: "Перед публикацией отзыва нужно указать имя пользователя.",
    ratingInvalid: "Рейтинг должен быть от 1 до 5.",
    commentTooShort: "Комментарий должен быть не короче {count} символов.",
    commentTooLong: "Комментарий может быть не длиннее {count} символов.",
    submitSuccess: "Ваш отзыв успешно опубликован.",
    submitFailed: "Не удалось опубликовать отзыв. Попробуйте еще раз.",
    slowDown: "Вы публикуете слишком часто. Подождите немного и попробуйте снова.",
    alreadyReviewed: "Вы уже оставили отзыв для этого аромата.",
    oneReviewOnly: "Каждый пользователь может оставить только один отзыв для аромата.",
    configMissing: "Конфигурация Supabase отсутствует.",
  },
};

const localeFormat = {
  az: "az-AZ",
  en: "en-US",
  ru: "ru-RU",
} as const;

const MIN_COMMENT_LENGTH = 6;
const MAX_COMMENT_LENGTH = 600;
const COMMENT_COOLDOWN_MS = 15_000;

const getUsernameFromEmail = (email: string | null | undefined) => {
  const localPart = (email ?? "").split("@")[0]?.trim() ?? "";
  if (!localPart) return "";
  return localPart.slice(0, 40);
};

const normalizeCommentRows = (rows: unknown[]): CommentRow[] => {
  return rows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => {
      const usernameValue = typeof row.username === "string" ? row.username.trim() : "";
      const emailValue = typeof row.user_email === "string" ? row.user_email : null;

      return {
        id: String(row.id ?? ""),
        user_id: String(row.user_id ?? ""),
        username: usernameValue || getUsernameFromEmail(emailValue) || "user",
        user_email: emailValue,
        perfume_slug: String(row.perfume_slug ?? ""),
        rating: Number(row.rating ?? 0),
        comment: String(row.comment ?? ""),
        created_at: String(row.created_at ?? ""),
      };
    });
};

export function PerfumeCommentsSection({ perfumeSlug, locale, supabase: supabaseConfig }: PerfumeCommentsSectionProps) {
  const copy = copyByLocale[locale];
  const pathname = usePathname();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [rating, setRating] = useState(5);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const loadComments = async () => {
      setIsLoading(true);

      const withUsernameSelect = "id,user_id,username,user_email,perfume_slug,rating,comment,created_at";
      const fallbackSelect = "id,user_id,user_email,perfume_slug,rating,comment,created_at";

      let query = await supabase
        .from("comments")
        .select(withUsernameSelect)
        .eq("perfume_slug", perfumeSlug)
        .order("created_at", { ascending: false });

      if (query.error?.message.toLowerCase().includes("username")) {
        query = await supabase
          .from("comments")
          .select(fallbackSelect)
          .eq("perfume_slug", perfumeSlug)
          .order("created_at", { ascending: false });
      }

      if (!isMounted) return;

      setComments(normalizeCommentRows((query.data as unknown[] | null) ?? []));
      setIsLoading(false);
    };

    void loadComments();

    return () => {
      isMounted = false;
    };
  }, [supabase, perfumeSlug]);

  const average = useMemo(() => {
    if (!comments.length) return null;
    const total = comments.reduce((sum, item) => sum + item.rating, 0);
    return (total / comments.length).toFixed(1);
  }, [comments]);

  const sortedComments = useMemo(() => {
    const list = [...comments];
    list.sort((a, b) => {
      const left = new Date(a.created_at).getTime();
      const right = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? right - left : left - right;
    });
    return list;
  }, [comments, sortOrder]);

  const hasReviewed = useMemo(() => {
    const userId = session?.user?.id;
    if (!userId) return false;
    return comments.some((item) => item.user_id === userId);
  }, [comments, session?.user?.id]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !isSupabaseConfigured(supabaseConfig ?? undefined)) {
      return;
    }

    if (!session?.user) {
      setMessageTone("error");
      setMessage(copy.loginRequired);
      router.push(loginHref);
      return;
    }

    if (hasReviewed) {
      setMessageTone("error");
      setMessage(copy.alreadyReviewed);
      return;
    }

    if (rating < 1 || rating > 5) {
      setMessageTone("error");
      setMessage(copy.ratingInvalid);
      return;
    }

    const normalizedComment = commentText.trim();
    if (normalizedComment.length < MIN_COMMENT_LENGTH) {
      setMessageTone("error");
      setMessage(formatMessage(copy.commentTooShort, { count: MIN_COMMENT_LENGTH }));
      return;
    }

    if (normalizedComment.length > MAX_COMMENT_LENGTH) {
      setMessageTone("error");
      setMessage(formatMessage(copy.commentTooLong, { count: MAX_COMMENT_LENGTH }));
      return;
    }

    if (Date.now() - lastSubmittedAt < COMMENT_COOLDOWN_MS) {
      setMessageTone("error");
      setMessage(copy.slowDown);
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setMessageTone("error");

    const metadataUsername =
      typeof session.user.user_metadata?.username === "string"
        ? session.user.user_metadata.username.trim()
        : "";
    const commentUsername = metadataUsername || getUsernameFromEmail(session.user.email);

    if (!commentUsername) {
      setMessage(copy.usernameMissing);
      setIsSubmitting(false);
      return;
    }

    let { error } = await supabase.from("comments").insert({
      user_id: session.user.id,
      username: commentUsername,
      user_email: session.user.email ?? "",
      perfume_slug: perfumeSlug,
      rating,
      comment: normalizedComment,
    });

    if (error?.message.toLowerCase().includes("username")) {
      const fallbackInsert = await supabase.from("comments").insert({
        user_id: session.user.id,
        user_email: session.user.email ?? "",
        perfume_slug: perfumeSlug,
        rating,
        comment: normalizedComment,
      });
      error = fallbackInsert.error;
    }

    if (error) {
      const normalized = error.message.toLowerCase();
      if (normalized.includes("duplicate") || normalized.includes("unique")) {
        setMessageTone("error");
        setMessage(copy.oneReviewOnly);
        setIsSubmitting(false);
        return;
      }
      setMessageTone("error");
      setMessage(copy.submitFailed);
      setIsSubmitting(false);
      return;
    }

    const withUsernameSelect = "id,user_id,username,user_email,perfume_slug,rating,comment,created_at";
    const fallbackSelect = "id,user_id,user_email,perfume_slug,rating,comment,created_at";
    let refreshQuery = await supabase
      .from("comments")
      .select(withUsernameSelect)
      .eq("perfume_slug", perfumeSlug)
      .order("created_at", { ascending: false });

    if (refreshQuery.error?.message.toLowerCase().includes("username")) {
      refreshQuery = await supabase
        .from("comments")
        .select(fallbackSelect)
        .eq("perfume_slug", perfumeSlug)
        .order("created_at", { ascending: false });
    }

    setComments(normalizeCommentRows((refreshQuery.data as unknown[] | null) ?? []));
    setCommentText("");
    setRating(5);
    setLastSubmittedAt(Date.now());
    setMessageTone("success");
    setMessage(copy.submitSuccess);
    setIsSubmitting(false);
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  return (
    <section className="mt-24">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="text-5xl leading-[0.98] text-zinc-800 md:text-6xl">{copy.heading}</h2>
          <p className="mt-3 text-zinc-500">{copy.subheading}</p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs tracking-[0.08em] text-zinc-500 uppercase shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <span>{copy.rating}</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value === "asc" ? "asc" : "desc")}
            className="rounded-full bg-transparent pr-2 text-xs text-zinc-700 outline-none"
            aria-label="Sort reviews"
          >
            <option value="desc">{copy.newest}</option>
            <option value="asc">{copy.oldest}</option>
          </select>
        </label>
      </div>

      <div className="mt-8 space-y-5">
        <div className="rounded-[1.5rem] bg-white px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:px-8 md:py-7">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                {copy.average}
              </p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-5xl leading-none tracking-[-0.03em] text-zinc-900">{average ?? "-"}</p>
                <p className="mb-1 text-sm text-zinc-500">
                  {comments.length} {copy.reviews}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-rose-500">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Heart
                    key={value}
                    size={16}
                    weight={
                      average && Number(average) >= value
                        ? "fill"
                        : average && Number(average) > value - 1
                          ? "duotone"
                          : "regular"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-50 px-4 py-2">
              <ChatCircleDots size={18} className="text-zinc-700" />
              <span className="text-sm font-medium text-zinc-700">
                {comments.length} {copy.reviews}
              </span>
            </div>
          </div>
        </div>

        {!hasReviewed ? (
          <div className="rounded-[1.5rem] bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-8">
            <p className="text-2xl tracking-[-0.02em] text-zinc-900">{copy.writeReview}</p>
            <div className="mt-5 h-px bg-[rgba(0,0,0,0.05)]" />

            <form className="mt-6 space-y-6" onSubmit={submitComment}>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                  {copy.yourRating}
                </span>
                <div className="flex items-center gap-2.5">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className="grid h-9 w-9 place-items-center text-zinc-300 transition hover:scale-110 hover:text-rose-400"
                        aria-label={formatMessage(copy.chooseHearts, { count: value })}
                      >
                        <Heart
                          size={24}
                          weight={active ? "fill" : "regular"}
                          className={active ? "text-rose-500" : "text-zinc-300"}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-zinc-500">{formatMessage(copy.heartsValue, { count: rating })}</p>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                  {copy.yourExperience}
                </span>
                <textarea
                  required
                  minLength={MIN_COMMENT_LENGTH}
                  maxLength={MAX_COMMENT_LENGTH}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder={copy.commentPlaceholder}
                  className="h-36 w-full resize-none rounded-2xl border-none bg-[#f8f8f8] px-5 py-4 text-[15px] leading-7 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
                />
              </label>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-zinc-900 px-7 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.2)] transition hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_12px_24px_rgba(24,24,24,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.submit}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

            {message ? (
              <p
                className={[
                  "mt-4 rounded-xl px-3 py-2 text-sm ring-1",
                  messageTone === "success"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-zinc-100 text-zinc-700 ring-zinc-200",
                ].join(" ")}
              >
                {message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4">
          {isLoading ? <p className="text-sm text-zinc-500">{copy.loading}</p> : null}
          {!isLoading && sortedComments.length === 0 ? (
            <p className="text-sm italic text-zinc-500">{copy.noComments}</p>
          ) : null}

          {!isLoading
            ? sortedComments.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                        {(item.username || copy.unknownUser).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-medium text-zinc-800">{item.username || copy.unknownUser}</p>
                        <div className="flex items-center gap-1 text-rose-500">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Heart
                              key={`${item.id}-${value}`}
                              size={14}
                              weight={item.rating >= value ? "fill" : "regular"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {new Intl.DateTimeFormat(localeFormat[locale], {
                        dateStyle: "medium",
                      }).format(new Date(item.created_at))}
                    </p>
                  </div>

                  <div className="my-4 h-px bg-[rgba(0,0,0,0.05)]" />
                  <p className="text-sm leading-7 text-zinc-700">{item.comment}</p>
                </article>
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
