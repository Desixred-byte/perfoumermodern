"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type AccountClientProps = {
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type Copy = {
  title: string;
  subtitle: string;
  profile: string;
  username: string;
  saveProfile: string;
  emailSection: string;
  currentEmail: string;
  newEmail: string;
  sendCode: string;
  verifyCode: string;
  codeLabel: string;
  codeHint: string;
  codeExpires: string;
  loading: string;
  loginRequiredTitle: string;
  loginRequiredBody: string;
  loginCta: string;
  signedOut: string;
  signOut: string;
  configMissing: string;
  profileSaved: string;
  emailCodeSent: string;
  emailVerified: string;
  emailPendingSecondVerification: string;
  sameEmailError: string;
  genericError: string;
};

const OTP_LENGTH = 8;
const OTP_EXPIRES_SECONDS = 3600;

const copyByLocale: Record<Locale, Copy> = {
  az: {
    title: "Hesabım",
    subtitle: "Profil məlumatlarını yenilə və email ünvanını təsdiqlə.",
    profile: "Profil məlumatları",
    username: "İstifadəçi adı",
    saveProfile: "Profili yadda saxla",
    emailSection: "Email ünvanını dəyiş",
    currentEmail: "Cari email",
    newEmail: "Yeni email",
    sendCode: "Təsdiq kodu göndər",
    verifyCode: "Kodu təsdiqlə",
    codeLabel: "Təsdiq kodu",
    codeHint: "Emailə gələn kodu daxil et.",
    codeExpires: "Kodun etibarlılıq müddəti: 3600 saniyə.",
    loading: "Yüklənir...",
    loginRequiredTitle: "Hesab bölməsi üçün giriş et",
    loginRequiredBody: "Hesab məlumatlarını idarə etmək üçün əvvəlcə daxil ol.",
    loginCta: "Giriş et",
    signedOut: "Hesabdan çıxış edildi.",
    signOut: "Çıxış",
    configMissing: "Supabase konfiqurasiyası yoxdur.",
    profileSaved: "Profil məlumatları yeniləndi.",
    emailCodeSent: "Yeni email üçün təsdiq kodu göndərildi.",
    emailVerified: "Email ünvanı təsdiqləndi və yeniləndi.",
    emailPendingSecondVerification:
      "Kod qəbul edildi, amma email hələ dəyişməyib. Köhnə emailə gələn təsdiqi də tamamla və ya Auth ayarlarında “Secure email change” funksiyasını söndür.",
    sameEmailError: "Yeni email cari email ilə eyni ola bilməz.",
    genericError: "Xəta baş verdi. Yenidən cəhd edin.",
  },
  en: {
    title: "My Account",
    subtitle: "Update profile details and verify your email changes.",
    profile: "Profile Details",
    username: "Username",
    saveProfile: "Save profile",
    emailSection: "Change Email",
    currentEmail: "Current email",
    newEmail: "New email",
    sendCode: "Send verification code",
    verifyCode: "Verify code",
    codeLabel: "Verification code",
    codeHint: "Type the code sent to your email.",
    codeExpires: "Code expiration: 3600 seconds.",
    loading: "Loading...",
    loginRequiredTitle: "Sign in to manage your account",
    loginRequiredBody: "You need to sign in first to edit profile details.",
    loginCta: "Login",
    signedOut: "Signed out.",
    signOut: "Sign out",
    configMissing: "Supabase configuration is missing.",
    profileSaved: "Profile details updated.",
    emailCodeSent: "A verification code was sent to your new email.",
    emailVerified: "Email address verified and updated.",
    emailPendingSecondVerification:
      "Code accepted, but email is still unchanged. Confirm from the old email too, or disable “Secure email change” in Auth settings.",
    sameEmailError: "New email cannot be the same as your current email.",
    genericError: "Something went wrong. Please try again.",
  },
  ru: {
    title: "Мой аккаунт",
    subtitle: "Обновите профиль и подтвердите смену email.",
    profile: "Данные профиля",
    username: "Имя пользователя",
    saveProfile: "Сохранить профиль",
    emailSection: "Сменить email",
    currentEmail: "Текущий email",
    newEmail: "Новый email",
    sendCode: "Отправить код",
    verifyCode: "Подтвердить код",
    codeLabel: "Код подтверждения",
    codeHint: "Введите код из письма.",
    codeExpires: "Срок действия кода: 3600 секунд.",
    loading: "Загрузка...",
    loginRequiredTitle: "Войдите для управления аккаунтом",
    loginRequiredBody: "Чтобы редактировать данные аккаунта, сначала войдите.",
    loginCta: "Войти",
    signedOut: "Вы вышли из аккаунта.",
    signOut: "Выйти",
    configMissing: "Конфигурация Supabase отсутствует.",
    profileSaved: "Данные профиля обновлены.",
    emailCodeSent: "Код подтверждения отправлен на новый email.",
    emailVerified: "Email подтвержден и обновлен.",
    emailPendingSecondVerification:
      "Код принят, но email пока не изменился. Подтвердите также через старый email или отключите “Secure email change” в настройках Auth.",
    sameEmailError: "Новый email не может совпадать с текущим.",
    genericError: "Произошла ошибка. Попробуйте снова.",
  },
};

export function AccountClient({ locale, supabase: supabaseConfig }: AccountClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [isReady, setIsReady] = useState(() => !supabase);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otpDigits = useMemo(
    () => Array.from({ length: OTP_LENGTH }, (_, index) => code[index] ?? ""),
    [code],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session?.user) {
        setIsReady(true);
        return;
      }

      const metadataUsername =
        typeof session.user.user_metadata?.username === "string"
          ? session.user.user_metadata.username
          : "";
      const fallbackUsername = (session.user.email ?? "").split("@")[0] ?? "";

      setUserId(session.user.id);
      setEmail(session.user.email ?? "");
      setUsername(metadataUsername || fallbackUsername);
      setIsReady(true);
    });
  }, [supabase]);

  const loginHref = "/login?next=%2Faccount";

  const saveProfile = async () => {
    if (!supabase) return;

    const normalized = username.trim();
    if (normalized.length < 3) {
      setMessage(copy.genericError);
      return;
    }

    setIsBusy(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const existingMetadata = sessionData.session?.user?.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: { ...existingMetadata, username: normalized },
    });

    if (error) {
      setMessage(error.message || copy.genericError);
      setIsBusy(false);
      return;
    }

    setMessage(copy.profileSaved);
    setIsBusy(false);
    router.refresh();
  };

  const sendEmailCode = async () => {
    if (!supabase) return;
    const normalizedNewEmail = newEmail.trim().toLowerCase();
    const normalizedCurrentEmail = email.trim().toLowerCase();

    if (!normalizedNewEmail || normalizedNewEmail === normalizedCurrentEmail) {
      setMessage(copy.sameEmailError);
      return;
    }

    setIsBusy(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ email: normalizedNewEmail });
    if (error) {
      setMessage(error.message || copy.genericError);
      setIsBusy(false);
      return;
    }

    setCodeSent(true);
    setMessage(copy.emailCodeSent);
    setIsBusy(false);
  };

  const verifyEmailCode = async () => {
    if (!supabase) return;
    const normalizedNewEmail = newEmail.trim().toLowerCase();
    if (!normalizedNewEmail) return;

    setIsBusy(true);
    setMessage("");

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedNewEmail,
      token: code.trim(),
      type: "email_change",
    });

    if (error) {
      setMessage(error.message || copy.genericError);
      setIsBusy(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const latestEmail = userData.user?.email?.trim().toLowerCase() ?? "";

    if (latestEmail && latestEmail === normalizedNewEmail) {
      setEmail(latestEmail);
      setCode("");
      setNewEmail("");
      setCodeSent(false);
      setMessage(copy.emailVerified);
      setIsBusy(false);
      router.refresh();
      return;
    }

    setMessage(copy.emailPendingSecondVerification);
    setCode("");
    setIsBusy(false);
    router.refresh();
  };

  const updateOtpAt = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const current = code.padEnd(OTP_LENGTH, " ").split("");
      current[index] = "";
      setCode(current.join("").trimEnd());
      return;
    }

    const nextChars = code.padEnd(OTP_LENGTH, " ").split("");
    if (clean.length > 1) {
      const pasted = clean.slice(0, OTP_LENGTH).split("");
      for (let i = 0; i < OTP_LENGTH; i += 1) {
        nextChars[i] = pasted[i] ?? "";
      }
      setCode(nextChars.join("").trimEnd());
      const nextFocusIndex = Math.min(clean.length, OTP_LENGTH - 1);
      otpRefs.current[nextFocusIndex]?.focus();
      return;
    }

    nextChars[index] = clean;
    setCode(nextChars.join("").trimEnd());
    if (index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (index: number) => {
    const current = code.padEnd(OTP_LENGTH, " ").split("");
    if (current[index]) {
      current[index] = "";
      setCode(current.join("").trimEnd());
      return;
    }
    if (index > 0) {
      otpRefs.current[index - 1]?.focus();
      current[index - 1] = "";
      setCode(current.join("").trimEnd());
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage(copy.signedOut);
    router.push("/login?next=%2Faccount");
    router.refresh();
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-600">{copy.configMissing}</p>;
  }

  if (!isReady) {
    return <p className="text-sm text-zinc-500">{copy.loading}</p>;
  }

  if (!userId) {
    return (
      <div className="max-w-xl rounded-[1.8rem] bg-white p-7 shadow-[0_10px_32px_rgba(0,0,0,0.04)]">
        <h1 className="text-3xl tracking-[-0.02em] text-zinc-900">{copy.loginRequiredTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{copy.loginRequiredBody}</p>
        <Link
          href={loginHref}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white"
        >
          {copy.loginCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] bg-white p-7 shadow-[0_10px_32px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.07)]">
        <h1 className="text-4xl tracking-[-0.03em] text-zinc-900">{copy.title}</h1>
        <p className="mt-2 text-zinc-500">{copy.subtitle}</p>
      </section>

      <section className="rounded-[1.8rem] bg-white p-7 shadow-[0_10px_32px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.07)]">
        <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.profile}</p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-zinc-600">{copy.username}</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={24}
            className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-200 transition-all duration-300 focus:bg-white focus:ring-zinc-300"
          />
        </label>
        <button
          type="button"
          onClick={saveProfile}
          disabled={isBusy}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 disabled:opacity-60"
        >
          {copy.saveProfile}
        </button>
      </section>

      <section className="rounded-[1.8rem] bg-white p-7 shadow-[0_10px_32px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.07)]">
        <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.emailSection}</p>
        <p className="mt-3 text-sm text-zinc-600">
          {copy.currentEmail}: <span className="font-medium text-zinc-900">{email}</span>
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm text-zinc-600">{copy.newEmail}</span>
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-200 transition-all duration-300 focus:bg-white focus:ring-zinc-300"
          />
        </label>

        <button
          type="button"
          onClick={sendEmailCode}
          disabled={isBusy || !newEmail.trim()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 disabled:opacity-60"
        >
          {copy.sendCode}
        </button>

        {codeSent ? (
          <div className="mt-5 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-600">{copy.codeLabel}</span>
              <div className="flex flex-wrap gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={`account-otp-${index}`}
                    ref={(node) => {
                      otpRefs.current[index] = node;
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => updateOtpAt(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace") {
                        event.preventDefault();
                        handleOtpBackspace(index);
                      } else if (event.key === "ArrowLeft" && index > 0) {
                        event.preventDefault();
                        otpRefs.current[index - 1]?.focus();
                      } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
                        event.preventDefault();
                        otpRefs.current[index + 1]?.focus();
                      }
                    }}
                    onPaste={(event) => {
                      event.preventDefault();
                      const pasted = event.clipboardData.getData("text");
                      updateOtpAt(index, pasted);
                    }}
                    className="h-12 w-11 rounded-xl bg-white text-center text-lg font-semibold text-zinc-800 outline-none ring-1 ring-zinc-200 transition-all duration-300 focus:-translate-y-[1px] focus:ring-zinc-400"
                  />
                ))}
              </div>
            </label>
            <p className="mt-2 text-xs text-zinc-500">{copy.codeHint}</p>
            <p className="mt-1 text-xs text-zinc-500">{copy.codeExpires.replace("3600", String(OTP_EXPIRES_SECONDS))}</p>
            <button
              type="button"
              onClick={verifyEmailCode}
              disabled={isBusy || code.trim().length !== OTP_LENGTH}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-[0_8px_20px_rgba(24,24,24,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-zinc-800 disabled:opacity-60"
            >
              {copy.verifyCode}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.8rem] bg-white p-7 shadow-[0_10px_32px_rgba(0,0,0,0.04)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.07)]">
        <button
          type="button"
          onClick={signOut}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-zinc-50 hover:-translate-y-[1px]"
        >
          {copy.signOut}
        </button>
      </section>

      {message ? (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-zinc-600 shadow-[0_10px_22px_rgba(0,0,0,0.04)] transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
