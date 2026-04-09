"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabasePublicConfig } from "@/lib/supabase/client";

type LoginReason = "account_exists" | "invalid_credentials" | "email_unverified" | "weak_password";

type LoginClientProps = {
  locale: Locale;
  nextPath: string;
  supabase: SupabasePublicConfig | null;
  initialMode: "login" | "signup";
  initialEmail: string;
  initialReason?: LoginReason;
};

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  feature1: string;
  feature2: string;
  feature3: string;
  username: string;
  usernameHint: string;
  email: string;
  password: string;
  loginTab: string;
  signupTab: string;
  submitLogin: string;
  submitSignup: string;
  switchToSignup: string;
  switchToLogin: string;
  hint: string;
  backHome: string;
  loading: string;
  configMissing: string;
  accountExists: string;
  invalidCredentials: string;
  emailUnverified: string;
  weakPassword: string;
  invalidUsername: string;
  genericError: string;
};

const copyByLocale: Record<Locale, Copy> = {
  az: {
    badge: "Perfoumer Klub",
    title: "Perfoumer hesabına xoş gəlmisən",
    subtitle: "Sevdiyin ətirləri yadda saxla, şəxsi seçimlərini rahat idarə et və təcrübəni paylaş.",
    feature1: "Seçilmiş ətirlərin üçün şəxsi siyahı",
    feature2: "Səmimi rəylər və zövqünə uyğun qiymətləndirmə",
    feature3: "Sürətli və təhlükəsiz email qeydiyyatı",
    username: "İstifadəçi adı",
    usernameHint: "3-24 simvol, hərf/rəqəm və . _ - işarələri",
    email: "Email",
    password: "Şifrə",
    loginTab: "Giriş",
    signupTab: "Qeydiyyat",
    submitLogin: "Daxil ol",
    submitSignup: "Hesab yarat",
    switchToSignup: "Hesabın yoxdur? Qeydiyyat et",
    switchToLogin: "Hesabın var? Giriş et",
    hint: "Qeydiyyatdan sonra email təsdiqi tələb oluna bilər.",
    backHome: "Ana səhifə",
    loading: "Yüklənir...",
    configMissing: "Supabase konfiqurasiyası tapılmadı.",
    accountExists: "Bu email üçün hesab artıq mövcuddur. Giriş et.",
    invalidCredentials: "Email və ya şifrə yanlışdır.",
    emailUnverified: "Email təsdiqlənməyib. Inbox-u yoxla və təsdiqlə.",
    weakPassword: "Şifrə daha güclü olmalıdır (ən azı 6 simvol).",
    invalidUsername: "İstifadəçi adı düzgün deyil. 3-24 simvol istifadə et.",
    genericError: "Problem yarandı. Yenidən cəhd et.",
  },
  en: {
    badge: "Perfoumer Club",
    title: "Welcome to your Perfoumer account",
    subtitle: "Save the perfumes you love, manage your personal picks, and share your experience.",
    feature1: "Personal list for your selected perfumes",
    feature2: "Honest reviews and ratings tailored to your taste",
    feature3: "Fast and secure email registration",
    username: "Username",
    usernameHint: "3-24 chars, letters/numbers and . _ -",
    email: "Email",
    password: "Password",
    loginTab: "Login",
    signupTab: "Sign up",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    switchToSignup: "No account yet? Sign up",
    switchToLogin: "Already have an account? Sign in",
    hint: "Email verification may be required after sign up.",
    backHome: "Back home",
    loading: "Loading...",
    configMissing: "Supabase configuration is missing.",
    accountExists: "An account already exists for this email. Please sign in.",
    invalidCredentials: "Incorrect email or password.",
    emailUnverified: "Your email is not verified yet. Please check your inbox.",
    weakPassword: "Password is too weak. Use at least 6 characters.",
    invalidUsername: "Invalid username. Use 3-24 allowed characters.",
    genericError: "Something went wrong. Please try again.",
  },
  ru: {
    badge: "Perfoumer Club",
    title: "Добро пожаловать в аккаунт Perfoumer",
    subtitle: "Сохраняйте любимые ароматы, управляйте личной подборкой и делитесь впечатлениями.",
    feature1: "Личный список выбранных ароматов",
    feature2: "Честные отзывы и оценки под ваш вкус",
    feature3: "Быстрая и безопасная регистрация по email",
    username: "Имя пользователя",
    usernameHint: "3-24 символа, буквы/цифры и . _ -",
    email: "Email",
    password: "Пароль",
    loginTab: "Вход",
    signupTab: "Регистрация",
    submitLogin: "Войти",
    submitSignup: "Создать аккаунт",
    switchToSignup: "Нет аккаунта? Регистрация",
    switchToLogin: "Уже есть аккаунт? Войти",
    hint: "После регистрации может потребоваться подтверждение email.",
    backHome: "На главную",
    loading: "Загрузка...",
    configMissing: "Отсутствует конфигурация Supabase.",
    accountExists: "Аккаунт с этим email уже существует. Выполните вход.",
    invalidCredentials: "Неверный email или пароль.",
    emailUnverified: "Email не подтвержден. Проверьте входящие письма.",
    weakPassword: "Слишком простой пароль. Минимум 6 символов.",
    invalidUsername: "Некорректное имя пользователя. Используйте 3-24 символа.",
    genericError: "Произошла ошибка. Попробуйте снова.",
  },
};

const normalizeNextPath = (input: string) => (input.startsWith("/") ? input : "/wishlist");
const usernamePattern = /^[\p{L}\p{N}][\p{L}\p{N}._-]{2,23}$/u;

const resolveReasonMessage = (reason: LoginReason | undefined, copy: Copy) => {
  if (reason === "account_exists") return copy.accountExists;
  if (reason === "invalid_credentials") return copy.invalidCredentials;
  if (reason === "email_unverified") return copy.emailUnverified;
  if (reason === "weak_password") return copy.weakPassword;
  return "";
};

export function LoginClient({
  locale,
  nextPath,
  supabase: supabaseConfig,
  initialMode,
  initialEmail,
  initialReason,
}: LoginClientProps) {
  const copy = copyByLocale[locale];
  const router = useRouter();
  const supabase = getSupabaseBrowserClient(supabaseConfig ?? undefined);

  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() => resolveReasonMessage(initialReason, copy));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const normalized = error.message.toLowerCase();

        if (normalized.includes("invalid login credentials")) {
          setMessage(copy.invalidCredentials);
        } else if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) {
          setMessage(copy.emailUnverified);
          router.push(
            `/login/success?pending=1&flow=signup&next=${encodeURIComponent(safeNextPath)}&email=${encodeURIComponent(email)}`,
          );
          router.refresh();
          return;
        } else {
          setMessage(error.message || copy.genericError);
        }

        setIsSubmitting(false);
        return;
      }

      router.push(safeNextPath);
      router.refresh();
      return;
    }

    const successRedirect = `${window.location.origin}/login/success?flow=signup&next=${encodeURIComponent(safeNextPath)}&email=${encodeURIComponent(email)}`;
    const normalizedUsername = username.trim();
    if (!usernamePattern.test(normalizedUsername)) {
      setMessage(copy.invalidUsername);
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: successRedirect, data: { username: normalizedUsername } },
    });

    if (error) {
      const normalized = error.message.toLowerCase();

      if (normalized.includes("user already registered") || normalized.includes("already registered")) {
        setMode("login");
        setMessage(copy.accountExists);
      } else if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("short"))) {
        setMessage(copy.weakPassword);
      } else {
        setMessage(error.message || copy.genericError);
      }

      setIsSubmitting(false);
      return;
    }

    // Supabase can return no error for existing users while giving a user with no identities.
    const identityCount = data.user?.identities?.length ?? 0;
    if (data.user && identityCount === 0) {
      setMode("login");
      setMessage(copy.accountExists);
      setIsSubmitting(false);
      return;
    }

    // If project has email confirmation disabled and user is immediately signed in, continue directly.
    const emailConfirmedAt =
      (data.user?.email_confirmed_at as string | null | undefined) ??
      ((data.user as { confirmed_at?: string | null } | null)?.confirmed_at ?? null);
    if (data.session && emailConfirmedAt) {
      router.push(safeNextPath);
      router.refresh();
      return;
    }

    router.push(
      `/login/success?pending=1&flow=signup&next=${encodeURIComponent(safeNextPath)}&email=${encodeURIComponent(email)}`,
    );
    router.refresh();
  };

  if (!isSupabaseConfigured(supabaseConfig ?? undefined)) {
    return <p className="text-sm text-zinc-700">{copy.configMissing}</p>;
  }

  return (
    <div className="grid w-full gap-5 rounded-[2rem] border border-white/60 bg-[linear-gradient(140deg,rgba(255,255,255,0.95)_0%,rgba(245,244,242,0.92)_100%)] p-5 shadow-[0_28px_90px_rgba(24,24,24,0.08)] ring-1 ring-zinc-200/70 md:grid-cols-[1.08fr_0.92fr] md:p-8">
      <section className="rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f1f1ef_70%)] p-6 ring-1 ring-zinc-200/70 md:p-8">
        <p className="inline-flex rounded-full bg-white px-3 py-1 text-[0.7rem] font-semibold tracking-[0.2em] text-zinc-500 uppercase ring-1 ring-zinc-200">
          {copy.badge}
        </p>
        <h1 className="mt-4 text-[2.2rem] leading-[0.95] tracking-[-0.03em] text-zinc-900 md:text-[3.4rem]">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600 md:text-base">{copy.subtitle}</p>

        <div className="mt-8 grid gap-3">
          {[copy.feature1, copy.feature2, copy.feature3].map((item) => (
            <div key={item} className="rounded-xl bg-white px-4 py-3 text-sm text-zinc-700 ring-1 ring-zinc-200/80">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.8rem] bg-white p-6 shadow-sm ring-1 ring-zinc-200/80 md:p-8">
        <div className="relative mb-5 grid grid-cols-2 rounded-full bg-zinc-100 p-1">
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-zinc-900 shadow-[0_10px_20px_rgba(24,24,24,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              mode === "signup" ? "translate-x-full" : "translate-x-0",
            ].join(" ")}
          />
          <button
            type="button"
            onClick={() => setMode("login")}
            className={[
              "relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
              mode === "login" ? "text-white" : "text-zinc-600",
            ].join(" ")}
          >
            {copy.loginTab}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={[
              "relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
              mode === "signup" ? "text-white" : "text-zinc-600",
            ].join(" ")}
          >
            {copy.signupTab}
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div
            className={[
              "overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              mode === "signup"
                ? "max-h-40 translate-y-0 opacity-100"
                : "pointer-events-none max-h-0 -translate-y-2 opacity-0",
            ].join(" ")}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-600">{copy.username}</span>
              <input
                type="text"
                required={mode === "signup"}
                minLength={3}
                maxLength={24}
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
              />
              <span className="mt-1 block text-xs text-zinc-400">{copy.usernameHint}</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-600">{copy.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-600">{copy.password}</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:bg-white"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? copy.loading : mode === "login" ? copy.submitLogin : copy.submitSignup}
          </button>

          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "login" ? "signup" : "login"))}
            className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-800 hover:underline"
          >
            {mode === "login" ? copy.switchToSignup : copy.switchToLogin}
          </button>

          <p className="text-xs text-zinc-400">{copy.hint}</p>
          {message ? <p className="rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200">{message}</p> : null}
        </form>

        <div className="mt-5 pt-4">
          <Link href="/" className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline">
            {copy.backHome}
          </Link>
        </div>
      </section>
    </div>
  );
}
