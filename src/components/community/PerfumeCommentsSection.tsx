"use client";

import { ArrowRight, CaretDown, ChatCircleDots, Heart, Trash } from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
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
  noRatingsYet: string;
  firstReviewPrompt: string;
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
  deleteOwnComment: string;
  deletingComment: string;
  deleteCommentTitle: string;
  deleteCommentCancel: string;
  deleteCommentAction: string;
  deleteCommentConfirm: string;
  deleteCommentSuccess: string;
  deleteCommentFailed: string;
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
    noRatingsYet: "Hələ qiymətləndirmə yoxdur",
    firstReviewPrompt: "Bu məhsulu ilk dəyərləndirən sən ol",
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
    deleteOwnComment: "Sil",
    deletingComment: "Silinir...",
    deleteCommentTitle: "Rəyi sil",
    deleteCommentCancel: "Ləğv et",
    deleteCommentAction: "Bəli, sil",
    deleteCommentConfirm: "Bu rəyi silmək istədiyinizə əminsiniz?",
    deleteCommentSuccess: "Rəy silindi.",
    deleteCommentFailed: "Rəyi silmək mümkün olmadı.",
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
    noRatingsYet: "No ratings yet",
    firstReviewPrompt: "Be the first to rate this perfume",
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
    deleteOwnComment: "Delete",
    deletingComment: "Deleting...",
    deleteCommentTitle: "Delete review",
    deleteCommentCancel: "Cancel",
    deleteCommentAction: "Yes, delete",
    deleteCommentConfirm: "Are you sure you want to delete this review?",
    deleteCommentSuccess: "Comment deleted.",
    deleteCommentFailed: "Could not delete this comment.",
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
    noRatingsYet: "Пока нет оценок",
    firstReviewPrompt: "Станьте первым, кто оценит этот аромат",
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
    deleteOwnComment: "Удалить",
    deletingComment: "Удаление...",
    deleteCommentTitle: "Удалить отзыв",
    deleteCommentCancel: "Отмена",
    deleteCommentAction: "Да, удалить",
    deleteCommentConfirm: "Вы уверены, что хотите удалить этот отзыв?",
    deleteCommentSuccess: "Комментарий удален.",
    deleteCommentFailed: "Не удалось удалить комментарий.",
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

const getUsernameFromMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const meta = metadata as Record<string, unknown>;
  const candidates = [meta.username, meta.full_name, meta.name]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return candidates[0] ?? "";
};

const getAvatarFromMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const meta = metadata as Record<string, unknown>;
  const avatar = meta.avatar_url;
  return typeof avatar === "string" ? avatar.trim() : "";
};

const normalizeCommentRows = (rows: unknown[]): CommentRow[] => {
  return rows
    .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    .map((row) => {
      const usernameValue = typeof row.username === "string" ? row.username.trim() : "";
      const emailValue = typeof row.user_email === "string" ? row.user_email : null;
      const avatarValue = typeof row.avatar_url === "string" ? row.avatar_url.trim() : "";

      return {
        id: String(row.id ?? ""),
        user_id: String(row.user_id ?? ""),
        username: usernameValue || getUsernameFromEmail(emailValue) || "user",
        avatar_url: avatarValue || null,
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
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("error");
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState("");
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState("");
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const effectiveRating = hoverRating ?? rating;

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
    if (!pendingDeleteCommentId) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPendingDeleteCommentId("");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [pendingDeleteCommentId]);

  useEffect(() => {
    if (!isSortMenuOpen) {
      return;
    }

    const handleOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!sortMenuRef.current || !(target instanceof Node)) {
        return;
      }
      if (!sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const loadComments = async () => {
      setIsLoading(true);

      const withUsernameSelect = "id,user_id,username,avatar_url,user_email,perfume_slug,rating,comment,created_at";
      const fallbackSelect = "id,user_id,user_email,perfume_slug,rating,comment,created_at";

      const primaryQuery = await supabase
        .from("comments")
        .select(withUsernameSelect)
        .eq("perfume_slug", perfumeSlug)
        .order("created_at", { ascending: false });

      let rows: unknown[] = (primaryQuery.data as unknown[] | null) ?? [];

      if (
        primaryQuery.error?.message.toLowerCase().includes("username") ||
        primaryQuery.error?.message.toLowerCase().includes("avatar_url")
      ) {
        const fallbackQuery = await supabase
          .from("comments")
          .select(fallbackSelect)
          .eq("perfume_slug", perfumeSlug)
          .order("created_at", { ascending: false });
        rows = (fallbackQuery.data as unknown[] | null) ?? [];
      }

      if (!isMounted) return;

      setComments(normalizeCommentRows(rows));
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

  const currentSessionUsername = useMemo(() => {
    const metadataName = getUsernameFromMetadata(session?.user?.user_metadata);
    if (metadataName) {
      return metadataName;
    }

    return getUsernameFromEmail(session?.user?.email);
  }, [session?.user?.email, session?.user?.user_metadata]);

  const currentSessionAvatarUrl = useMemo(() => {
    return getAvatarFromMetadata(session?.user?.user_metadata);
  }, [session?.user?.user_metadata]);

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

    const metadataUsername = getUsernameFromMetadata(session.user.user_metadata);
    const metadataAvatar = getAvatarFromMetadata(session.user.user_metadata);
    const commentUsername = metadataUsername || getUsernameFromEmail(session.user.email);

    if (!commentUsername) {
      setMessage(copy.usernameMissing);
      setIsSubmitting(false);
      return;
    }

    let { error } = await supabase.from("comments").insert({
      user_id: session.user.id,
      username: commentUsername,
      avatar_url: metadataAvatar || null,
      user_email: session.user.email ?? "",
      perfume_slug: perfumeSlug,
      rating,
      comment: normalizedComment,
    });

    if (error?.message.toLowerCase().includes("avatar_url")) {
      const withoutAvatarInsert = await supabase.from("comments").insert({
        user_id: session.user.id,
        username: commentUsername,
        user_email: session.user.email ?? "",
        perfume_slug: perfumeSlug,
        rating,
        comment: normalizedComment,
      });
      error = withoutAvatarInsert.error;
    }

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

    const withUsernameSelect = "id,user_id,username,avatar_url,user_email,perfume_slug,rating,comment,created_at";
    const fallbackSelect = "id,user_id,user_email,perfume_slug,rating,comment,created_at";
    const primaryRefreshQuery = await supabase
      .from("comments")
      .select(withUsernameSelect)
      .eq("perfume_slug", perfumeSlug)
      .order("created_at", { ascending: false });

    let refreshedRows: unknown[] = (primaryRefreshQuery.data as unknown[] | null) ?? [];

    if (
      primaryRefreshQuery.error?.message.toLowerCase().includes("username") ||
      primaryRefreshQuery.error?.message.toLowerCase().includes("avatar_url")
    ) {
      const fallbackRefreshQuery = await supabase
        .from("comments")
        .select(fallbackSelect)
        .eq("perfume_slug", perfumeSlug)
        .order("created_at", { ascending: false });
      refreshedRows = (fallbackRefreshQuery.data as unknown[] | null) ?? [];
    }

    setComments(normalizeCommentRows(refreshedRows));
    setCommentText("");
    setRating(5);
    setLastSubmittedAt(Date.now());
    setMessageTone("success");
    setMessage(copy.submitSuccess);
    setIsSubmitting(false);
  };

  const requestDeleteComment = (commentId: string) => {
    if (!commentId) {
      return;
    }
    setPendingDeleteCommentId(commentId);
  };

  const confirmDeleteComment = async () => {
    const commentId = pendingDeleteCommentId;
    if (!supabase || !session?.user?.id) {
      setMessageTone("error");
      setMessage(copy.loginRequired);
      router.push(loginHref);
      setPendingDeleteCommentId("");
      return;
    }

    setDeletingCommentId(commentId);
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", session.user.id)
      .eq("perfume_slug", perfumeSlug);

    if (error) {
      setMessageTone("error");
      setMessage(copy.deleteCommentFailed);
      setPendingDeleteCommentId("");
      setDeletingCommentId("");
      return;
    }

    setComments((prev) => prev.filter((item) => item.id !== commentId));
    setMessageTone("success");
    setMessage(copy.deleteCommentSuccess);
    setPendingDeleteCommentId("");
    setDeletingCommentId("");
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

        <div ref={sortMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsSortMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs tracking-[0.08em] text-zinc-500 uppercase shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
            aria-label="Sort reviews"
            aria-expanded={isSortMenuOpen}
          >
            <span>{copy.rating}</span>
            <span className="text-zinc-700 normal-case">{sortOrder === "desc" ? copy.newest : copy.oldest}</span>
            <CaretDown
              size={12}
              weight="bold"
              className={`text-zinc-500 transition-transform duration-200 ${isSortMenuOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isSortMenuOpen ? (
            <div className="absolute top-[calc(100%+0.5rem)] right-0 z-20 min-w-[170px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(20,20,20,0.16)]">
              <button
                type="button"
                onClick={() => {
                  setSortOrder("desc");
                  setIsSortMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-200 ${
                  sortOrder === "desc"
                    ? "bg-zinc-900 text-white"
                    : "font-medium text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {copy.newest}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOrder("asc");
                  setIsSortMenuOpen(false);
                }}
                className={`mt-1 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-200 ${
                  sortOrder === "asc"
                    ? "bg-zinc-900 text-white"
                    : "font-medium text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {copy.oldest}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <div className="rounded-[1.5rem] bg-white px-6 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:px-8 md:py-7">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-[0.72rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                {copy.average}
              </p>
              <div className="mt-2 flex items-end gap-3">
                <p className="text-5xl leading-none tracking-[-0.03em] text-zinc-900">{average ?? "0.0"}</p>
                <p className="mb-1 text-sm text-zinc-500">
                  {comments.length} {copy.reviews}
                </p>
              </div>
              {!average ? (
                <p className="mt-2 text-xs tracking-[0.08em] text-zinc-400 uppercase">{copy.noRatingsYet}</p>
              ) : null}
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
                    className={!average ? "text-zinc-300" : undefined}
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
                    const active = value <= effectiveRating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating(null)}
                        onFocus={() => setHoverRating(value)}
                        onBlur={() => setHoverRating(null)}
                        className="group grid h-10 w-10 place-items-center rounded-full text-zinc-300 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.06] hover:text-rose-400 active:scale-95"
                        aria-label={formatMessage(copy.chooseHearts, { count: value })}
                        aria-pressed={rating === value}
                      >
                        <Heart
                          size={24}
                          weight={active ? "fill" : "regular"}
                          className={[
                            "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                            active
                              ? "scale-[1.02] text-rose-500 drop-shadow-[0_3px_10px_rgba(244,63,94,0.35)]"
                              : "text-zinc-300 group-hover:text-rose-300",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {formatMessage(copy.heartsValue, { count: effectiveRating })}
                </p>
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

          {!isLoading
            ? sortedComments.map((item) => {
                const isOwnComment = !!session?.user?.id && item.user_id === session.user.id;
                const displayUsername = isOwnComment
                  ? currentSessionUsername || item.username || copy.unknownUser
                  : item.username || copy.unknownUser;
                const displayAvatarUrl = isOwnComment
                  ? currentSessionAvatarUrl || item.avatar_url || ""
                  : item.avatar_url || "";

                return (
                <article
                  key={item.id}
                  className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {displayAvatarUrl ? (
                        <img
                          src={displayAvatarUrl}
                          alt={displayUsername}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
                          {displayUsername.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="flex items-center gap-2.5">
                        <p className="text-sm font-medium text-zinc-800">{displayUsername}</p>
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
                    <div className="flex items-center gap-2">
                      {isOwnComment ? (
                        <button
                          type="button"
                          onClick={() => {
                            requestDeleteComment(item.id);
                          }}
                          disabled={deletingCommentId === item.id}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash size={12} />
                          {deletingCommentId === item.id ? copy.deletingComment : copy.deleteOwnComment}
                        </button>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        {new Intl.DateTimeFormat(localeFormat[locale], {
                          dateStyle: "medium",
                        }).format(new Date(item.created_at))}
                      </p>
                    </div>
                  </div>

                  <div className="my-4 h-px bg-[rgba(0,0,0,0.05)]" />
                  <p className="text-sm leading-7 text-zinc-700">{item.comment}</p>
                </article>
                );
              })
            : null}
        </div>
      </div>
      {typeof document !== "undefined" && pendingDeleteCommentId
        ? createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-zinc-900/35 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
          onClick={() => setPendingDeleteCommentId("")}
        >
          <div
            className="w-full rounded-t-3xl border border-zinc-200 bg-white p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_28px_64px_rgba(18,18,18,0.24)] animate-[accountPopIn_320ms_cubic-bezier(0.22,1,0.36,1)] sm:max-w-md sm:rounded-3xl sm:pb-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900">{copy.deleteCommentTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.deleteCommentConfirm}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDeleteCommentId("")}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-50 sm:min-h-10 sm:w-auto"
              >
                {copy.deleteCommentCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDeleteComment();
                }}
                disabled={deletingCommentId === pendingDeleteCommentId}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
              >
                {deletingCommentId === pendingDeleteCommentId ? copy.deletingComment : copy.deleteCommentAction}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </section>
  );
}
