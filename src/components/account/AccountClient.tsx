"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleNotch,
  CheckCircle,
  DotsThreeOutlineVertical,
  EnvelopeSimple,
  Info,
  PencilSimple,
  SignOut,
  UserCircle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type AccountClientProps = {
  locale: Locale;
  supabase: SupabasePublicConfig | null;
};

type NoticeTone = "success" | "error" | "info";
type ActionPhase = "idle" | "loading" | "success" | "error";
const ACCOUNT_NOTICE_KEY = "account.notice";

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
  logoutConfirmTitle: string;
  logoutConfirmBody: string;
  logoutCancel: string;
  logoutConfirm: string;
  settings: string;
  cancelEdit: string;
  editUsername: string;
  editEmail: string;
  noChanges: string;
  invalidUsername: string;
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
    subtitle: "Bu bölmədə profil məlumatlarınızı yeniləyə və email ünvanınızı təsdiqləyə bilərsiniz.",
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
    logoutConfirmTitle: "Çıxışı təsdiqlə",
    logoutConfirmBody: "Hesabdan çıxmaq istədiyinizə əminsiniz?",
    logoutCancel: "Ləğv et",
    logoutConfirm: "Bəli, çıxış et",
    settings: "Ayarlar",
    cancelEdit: "Redaktəni ləğv et",
    editUsername: "İstifadəçi adını redaktə et",
    editEmail: "Email redaktə et",
    noChanges: "Yadda saxlanacaq dəyişiklik yoxdur.",
    invalidUsername: "İstifadəçi adı ən azı 3 simvol olmalıdır.",
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
    logoutConfirmTitle: "Confirm sign out",
    logoutConfirmBody: "Are you sure you want to sign out of your account?",
    logoutCancel: "Cancel",
    logoutConfirm: "Yes, sign out",
    settings: "Settings",
    cancelEdit: "Cancel editing",
    editUsername: "Edit username",
    editEmail: "Edit email",
    noChanges: "There are no changes to save.",
    invalidUsername: "Username must be at least 3 characters.",
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
    logoutConfirmTitle: "Подтвердите выход",
    logoutConfirmBody: "Вы уверены, что хотите выйти из аккаунта?",
    logoutCancel: "Отмена",
    logoutConfirm: "Да, выйти",
    settings: "Настройки",
    cancelEdit: "Отменить редактирование",
    editUsername: "Редактировать имя пользователя",
    editEmail: "Редактировать email",
    noChanges: "Нет изменений для сохранения.",
    invalidUsername: "Имя пользователя должно быть не короче 3 символов.",
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
  const [initialUsername, setInitialUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [profileAction, setProfileAction] = useState<{ phase: ActionPhase; text: string }>({
    phase: "idle",
    text: "",
  });
  const [emailAction, setEmailAction] = useState<{ phase: ActionPhase; text: string }>({
    phase: "idle",
    text: "",
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isEmailMenuOpen, setIsEmailMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [editMode, setEditMode] = useState<"username" | "email" | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const profileResetTimerRef = useRef<number | null>(null);
  const emailResetTimerRef = useRef<number | null>(null);
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
      setInitialUsername(metadataUsername || fallbackUsername);
      setIsReady(true);
    });
  }, [supabase]);

  const loginHref = "/login?next=%2Faccount";
  const normalizedUsername = username.trim();
  const normalizedInitialUsername = initialUsername.trim();
  const normalizedCurrentEmail = email.trim().toLowerCase();
  const normalizedNewEmail = newEmail.trim().toLowerCase();
  const isUsernameChanged =
    normalizedUsername.length >= 3 && normalizedUsername !== normalizedInitialUsername;
  const isNewEmailChanged = !!normalizedNewEmail && normalizedNewEmail !== normalizedCurrentEmail;

  const showNotice = (text: string, tone: NoticeTone, persistAfterRefresh = false) => {
    if (persistAfterRefresh && typeof window !== "undefined") {
      window.sessionStorage.setItem(
        ACCOUNT_NOTICE_KEY,
        JSON.stringify({ text, tone, createdAt: Date.now() }),
      );
    }
    setNotice({ text, tone });
  };

  const scheduleProfileActionReset = (delayMs = 2800) => {
    if (profileResetTimerRef.current) {
      window.clearTimeout(profileResetTimerRef.current);
    }
    profileResetTimerRef.current = window.setTimeout(() => {
      setProfileAction({ phase: "idle", text: "" });
    }, delayMs);
  };

  const scheduleEmailActionReset = (delayMs = 2800) => {
    if (emailResetTimerRef.current) {
      window.clearTimeout(emailResetTimerRef.current);
    }
    emailResetTimerRef.current = window.setTimeout(() => {
      setEmailAction({ phase: "idle", text: "" });
    }, delayMs);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.sessionStorage.getItem(ACCOUNT_NOTICE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        text?: string;
        tone?: NoticeTone;
        createdAt?: number;
      };

      const isFresh = typeof parsed.createdAt === "number" && Date.now() - parsed.createdAt < 12000;
      if (parsed.text && parsed.tone && isFresh) {
        setNotice({ text: parsed.text, tone: parsed.tone });
      }
    } catch {
      // Ignore malformed session data.
    } finally {
      window.sessionStorage.removeItem(ACCOUNT_NOTICE_KEY);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
      if (emailResetTimerRef.current) {
        window.clearTimeout(emailResetTimerRef.current);
      }
    };
  }, []);

  const saveProfile = async () => {
    if (!supabase) return;

    if (!isUsernameChanged) {
      showNotice(copy.noChanges, "info");
      return;
    }

    if (normalizedUsername.length < 3) {
      showNotice(copy.invalidUsername, "error");
      return;
    }

    setIsBusy(true);
    setNotice(null);
    setProfileAction({ phase: "loading", text: copy.loading });

    const { data: sessionData } = await supabase.auth.getSession();
    const existingMetadata = sessionData.session?.user?.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: { ...existingMetadata, username: normalizedUsername },
    });

    if (error) {
      showNotice(error.message || copy.genericError, "error");
      setProfileAction({ phase: "error", text: error.message || copy.genericError });
      scheduleProfileActionReset(3600);
      setIsBusy(false);
      return;
    }

    showNotice(copy.profileSaved, "success");
    setProfileAction({ phase: "success", text: copy.profileSaved });
    scheduleProfileActionReset(3200);
    setInitialUsername(normalizedUsername);
    setIsBusy(false);
  };

  const sendEmailCode = async () => {
    if (!supabase) return;

    if (!normalizedNewEmail || normalizedNewEmail === normalizedCurrentEmail) {
      showNotice(copy.sameEmailError, "error");
      return;
    }

    setIsBusy(true);
    setNotice(null);
    setEmailAction({ phase: "loading", text: copy.loading });

    const { error } = await supabase.auth.updateUser({ email: normalizedNewEmail });
    if (error) {
      showNotice(error.message || copy.genericError, "error");
      setEmailAction({ phase: "error", text: error.message || copy.genericError });
      scheduleEmailActionReset(3600);
      setIsBusy(false);
      return;
    }

    setCodeSent(true);
    showNotice(copy.emailCodeSent, "success");
    setEmailAction({ phase: "success", text: copy.emailCodeSent });
    scheduleEmailActionReset(3200);
    setIsBusy(false);
  };

  const verifyEmailCode = async () => {
    if (!supabase) return;
    const normalizedNewEmail = newEmail.trim().toLowerCase();
    if (!normalizedNewEmail) return;

    setIsBusy(true);
    setNotice(null);

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedNewEmail,
      token: code.trim(),
      type: "email_change",
    });

    if (error) {
      showNotice(error.message || copy.genericError, "error");
      setEmailAction({ phase: "error", text: error.message || copy.genericError });
      scheduleEmailActionReset(3600);
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
      showNotice(copy.emailVerified, "success", true);
      setEmailAction({ phase: "success", text: copy.emailVerified });
      scheduleEmailActionReset(3200);
      setIsBusy(false);
      router.refresh();
      return;
    }

    showNotice(copy.emailPendingSecondVerification, "info", true);
    setEmailAction({ phase: "success", text: copy.emailPendingSecondVerification });
    scheduleEmailActionReset(3600);
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
    showNotice(copy.signedOut, "info", true);
    router.push("/login?next=%2Faccount");
    router.refresh();
  };

  const activateEditMode = (mode: "username" | "email") => {
    setEditMode(mode);
    setIsProfileMenuOpen(false);
    setIsEmailMenuOpen(false);

    if (mode === "username") {
      setCodeSent(false);
      setCode("");
      setNewEmail("");
      setEmailAction({ phase: "idle", text: "" });
      if (emailResetTimerRef.current) {
        window.clearTimeout(emailResetTimerRef.current);
      }
    }

    if (mode === "email") {
      setProfileAction({ phase: "idle", text: "" });
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
    }
  };

  const cancelEditMode = (mode: "username" | "email") => {
    if (mode === "username") {
      setUsername(initialUsername);
      setProfileAction({ phase: "idle", text: "" });
      if (profileResetTimerRef.current) {
        window.clearTimeout(profileResetTimerRef.current);
      }
    }

    if (mode === "email") {
      setNewEmail("");
      setCode("");
      setCodeSent(false);
      setEmailAction({ phase: "idle", text: "" });
      if (emailResetTimerRef.current) {
        window.clearTimeout(emailResetTimerRef.current);
      }
    }

    setIsProfileMenuOpen(false);
    setIsEmailMenuOpen(false);
    setEditMode(null);
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
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700">
            <UserCircle size={14} weight="duotone" />
            {copy.profile}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700">
            <EnvelopeSimple size={14} weight="duotone" />
            {copy.emailSection}
          </span>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-zinc-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8f8f7_100%)] p-7 shadow-[0_12px_32px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.profile}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-300/90 bg-white px-3 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">Account</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (editMode === "username") {
                    cancelEditMode("username");
                    return;
                  }
                  setIsProfileMenuOpen((prev) => !prev);
                  setIsEmailMenuOpen(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors duration-200 hover:bg-zinc-50"
                aria-label={editMode === "username" ? copy.cancelEdit : copy.settings}
                aria-expanded={editMode === "username" ? true : isProfileMenuOpen}
              >
                <span className="relative block h-4 w-4">
                  <DotsThreeOutlineVertical
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "username" ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
                    }`}
                  />
                  <X
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "username" ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"
                    }`}
                  />
                </span>
              </button>
              {isProfileMenuOpen && editMode !== "username" ? (
                <div className="absolute top-10 right-0 z-20 min-w-[220px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(20,20,20,0.16)]">
                  <button
                    type="button"
                    onClick={() => activateEditMode("username")}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-100"
                  >
                    <PencilSimple size={15} />
                    {copy.editUsername}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{copy.username}</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            minLength={3}
            maxLength={24}
            readOnly={editMode !== "username"}
            className={`w-full rounded-xl bg-white px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-300/80 transition-all duration-300 focus:-translate-y-[1px] focus:shadow-[0_10px_20px_rgba(24,24,24,0.08)] focus:ring-zinc-900/30 ${
              editMode !== "username" ? "cursor-not-allowed bg-zinc-50 text-zinc-500" : ""
            }`}
          />
        </label>
        {editMode === "username" ? (
          <div
            className={`mt-1 origin-top overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isUsernameChanged || profileAction.phase !== "idle"
                ? "max-h-24 translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0"
            }`}
            aria-hidden={!(isUsernameChanged || profileAction.phase !== "idle")}
          >
            <button
              type="button"
              onClick={saveProfile}
              disabled={isBusy || (!isUsernameChanged && profileAction.phase !== "success" && profileAction.phase !== "error")}
              className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold shadow-[0_10px_24px_rgba(24,24,24,0.2)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                profileAction.phase === "success"
                  ? "border-emerald-200 bg-emerald-500 text-white"
                  : profileAction.phase === "error"
                    ? "border-rose-200 bg-rose-500 text-white"
                    : "border-zinc-900 bg-zinc-900 text-white hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_14px_30px_rgba(24,24,24,0.24)]"
              } disabled:pointer-events-none`}
            >
              {profileAction.phase === "loading" ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : profileAction.phase === "success" ? (
                <CheckCircle size={16} weight="fill" />
              ) : profileAction.phase === "error" ? (
                <X size={16} weight="bold" />
              ) : null}
              {profileAction.phase === "idle" ? copy.saveProfile : profileAction.text}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.8rem] border border-zinc-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8f8f7_100%)] p-7 shadow-[0_12px_32px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.12em] text-zinc-500 uppercase">{copy.emailSection}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-300/90 bg-white px-3 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">Email</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (editMode === "email") {
                    cancelEditMode("email");
                    return;
                  }
                  setIsEmailMenuOpen((prev) => !prev);
                  setIsProfileMenuOpen(false);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors duration-200 hover:bg-zinc-50"
                aria-label={editMode === "email" ? copy.cancelEdit : copy.settings}
                aria-expanded={editMode === "email" ? true : isEmailMenuOpen}
              >
                <span className="relative block h-4 w-4">
                  <DotsThreeOutlineVertical
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "email" ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
                    }`}
                  />
                  <X
                    size={16}
                    weight="bold"
                    className={`absolute inset-0 transition-all duration-300 ${
                      editMode === "email" ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"
                    }`}
                  />
                </span>
              </button>
              {isEmailMenuOpen && editMode !== "email" ? (
                <div className="absolute top-10 right-0 z-20 min-w-[200px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(20,20,20,0.16)]">
                  <button
                    type="button"
                    onClick={() => activateEditMode("email")}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-100"
                  >
                    <EnvelopeSimple size={15} />
                    {copy.editEmail}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          {copy.currentEmail}: <span className="font-medium text-zinc-900">{email}</span>
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">{copy.newEmail}</span>
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            readOnly={editMode !== "email"}
            className={`w-full rounded-xl bg-white px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-300/80 transition-all duration-300 focus:-translate-y-[1px] focus:shadow-[0_10px_20px_rgba(24,24,24,0.08)] focus:ring-zinc-900/30 ${
              editMode !== "email" ? "cursor-not-allowed bg-zinc-50 text-zinc-500" : ""
            }`}
          />
        </label>

        {editMode === "email" ? (
          <div
            className={`mt-1 origin-top overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isNewEmailChanged || emailAction.phase !== "idle"
                ? "max-h-24 translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0"
            }`}
            aria-hidden={!(isNewEmailChanged || emailAction.phase !== "idle")}
          >
            <button
              type="button"
              onClick={sendEmailCode}
              disabled={isBusy || (!isNewEmailChanged && emailAction.phase !== "success" && emailAction.phase !== "error")}
              className={`mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold shadow-[0_10px_24px_rgba(24,24,24,0.2)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                emailAction.phase === "success"
                  ? "border-emerald-200 bg-emerald-500 text-white"
                  : emailAction.phase === "error"
                    ? "border-rose-200 bg-rose-500 text-white"
                    : "border-zinc-900 bg-zinc-900 text-white hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_14px_30px_rgba(24,24,24,0.24)]"
              } disabled:pointer-events-none`}
            >
              {emailAction.phase === "loading" ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : emailAction.phase === "success" ? (
                <CheckCircle size={16} weight="fill" />
              ) : emailAction.phase === "error" ? (
                <X size={16} weight="bold" />
              ) : null}
              {emailAction.phase === "idle" ? copy.sendCode : emailAction.text}
            </button>
          </div>
        ) : null}

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
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="account-signout-btn group relative inline-flex min-h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full border border-zinc-800/10 bg-[radial-gradient(circle_at_20%_0%,#faf8f8_0%,#f4f2f2_58%,#ece9e8_100%)] px-7 text-sm font-semibold text-zinc-800 shadow-[0_10px_24px_rgba(20,18,18,0.12)] ring-1 ring-white/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(20,18,18,0.18)]"
        >
          <SignOut size={16} className="account-signout-icon text-zinc-700 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
          {copy.signOut}
        </button>
      </section>

      {notice ? (
        <div className="pointer-events-none fixed right-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-0 z-[120] flex px-4 sm:right-6 sm:bottom-6 sm:left-auto sm:block sm:px-0">
          <div
            className={`pointer-events-auto w-full rounded-2xl border px-4 py-3 shadow-[0_20px_40px_rgba(15,15,15,0.2)] backdrop-blur-sm transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-w-md ${
              notice.tone === "success"
                ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-900"
                : notice.tone === "error"
                  ? "border-rose-200/80 bg-rose-50/95 text-rose-900"
                  : "border-zinc-300/80 bg-zinc-100/95 text-zinc-900"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5">
                {notice.tone === "success" ? (
                  <CheckCircle size={20} weight="fill" />
                ) : notice.tone === "error" ? (
                  <WarningCircle size={20} weight="fill" />
                ) : (
                  <Info size={20} weight="fill" />
                )}
              </span>
              <p className="flex-1 text-sm font-medium leading-6">{notice.text}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-zinc-700 transition-colors duration-200 hover:bg-white"
                aria-label="Close message"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLogoutConfirmOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-zinc-900/35 px-0 backdrop-blur-[2px] sm:items-center sm:px-4">
          <div className="w-full rounded-t-3xl border border-zinc-200 bg-white p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_28px_64px_rgba(18,18,18,0.24)] animate-[accountPopIn_320ms_cubic-bezier(0.22,1,0.36,1)] sm:max-w-md sm:rounded-3xl sm:pb-6">
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900">{copy.logoutConfirmTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{copy.logoutConfirmBody}</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors duration-200 hover:bg-zinc-50 sm:min-h-10 sm:w-auto"
              >
                {copy.logoutCancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsLogoutConfirmOpen(false);
                  await signOut();
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-zinc-800 sm:min-h-10 sm:w-auto"
              >
                {copy.logoutConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
