"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type AuthSuccessClientProps = {
  locale: Locale;
  nextPath: string;
  email: string;
  pending: boolean;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  titlePending: string;
  bodyPending: string;
  titleVerified: string;
  bodyVerified: string;
  continue: string;
  checkAgain: string;
  toLogin: string;
  loading: string;
  configMissing: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    titlePending: "Email təsdiqi gözlənilir",
    bodyPending: "Inbox-u aç və təsdiq linkinə klik et. Sonra aşağıdakı düymə ilə yenidən yoxla.",
    titleVerified: "Email təsdiqləndi",
    bodyVerified: "Hesabın aktivdir. İndi davam edib wishlist və rəylərdən istifadə edə bilərsən.",
    continue: "Davam et",
    checkAgain: "Yenidən yoxla",
    toLogin: "Giriş səhifəsinə qayıt",
    loading: "Yoxlanılır...",
    configMissing:
      "Supabase konfiqurasiyası yoxdur. .env faylında NEXT_PUBLIC_SUPABASE_URL və NEXT_PUBLIC_SUPABASE_ANON_KEY əlavə edin.",
  },
  en: {
    titlePending: "Email verification pending",
    bodyPending: "Open your inbox and click the verification link. Then use the button below to check again.",
    titleVerified: "Email verified",
    bodyVerified: "Your account is active. You can now continue to wishlist and reviews.",
    continue: "Continue",
    checkAgain: "Check again",
    toLogin: "Back to login",
    loading: "Checking...",
    configMissing:
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
  },
  ru: {
    titlePending: "Ожидается подтверждение email",
    bodyPending: "Откройте почту и нажмите ссылку подтверждения. Затем снова проверьте ниже.",
    titleVerified: "Email подтвержден",
    bodyVerified: "Аккаунт активен. Теперь можно перейти к wishlist и отзывам.",
    continue: "Продолжить",
    checkAgain: "Проверить снова",
    toLogin: "Назад ко входу",
    loading: "Проверка...",
    configMissing:
      "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.",
  },
};

const normalizeNextPath = (input: string) => (input.startsWith("/") ? input : "/wishlist");

export function AuthSuccessClient({
  locale,
  nextPath,
  email,
  pending,
  supabase: supabaseConfig,
}: AuthSuccessClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(() => Boolean(supabase));
  const [message, setMessage] = useState("");

  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const checkSession = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setIsChecking(true);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setMessage(error.message);
      setIsChecking(false);
      return;
    }

    setSession(data.session ?? null);
    setIsChecking(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkSession();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkSession]);

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  const isVerified = Boolean(session?.user);

  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.95)_0%,rgba(245,244,242,0.92)_100%)] p-6 shadow-[0_28px_90px_rgba(24,24,24,0.08)] ring-1 ring-zinc-200/70 md:p-9">
      <div className="rounded-[1.5rem] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f1f1ef_70%)] p-6 ring-1 ring-zinc-200/70 md:p-8">
        <h1 className="text-[2.2rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 md:text-[3rem]">
          {isVerified ? copy.titleVerified : copy.titlePending}
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-600 md:text-base">
          {isVerified ? copy.bodyVerified : copy.bodyPending}
        </p>

        {email ? <p className="mt-3 text-sm text-zinc-500">{email}</p> : null}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {isVerified ? (
            <button
              type="button"
              onClick={() => {
                router.push(safeNextPath);
                router.refresh();
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
            >
              {copy.continue}
            </button>
          ) : (
            <button
              type="button"
              onClick={checkSession}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
            >
              {isChecking ? copy.loading : copy.checkAgain}
            </button>
          )}

          <Link
            href={`/auth?next=${encodeURIComponent(safeNextPath)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700"
          >
            {copy.toLogin}
          </Link>
        </div>

        {!isVerified && pending ? (
          <p className="mt-5 text-xs text-zinc-500">{copy.loading}</p>
        ) : null}

        {message ? <p className="mt-3 text-sm text-zinc-600">{message}</p> : null}
      </div>
    </div>
  );
}
