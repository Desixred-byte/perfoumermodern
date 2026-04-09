"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import type { Locale } from "@/lib/i18n";
import type { Perfume } from "@/types/catalog";

type QuizAnswers = {
  gender: string;
  vibe: string;
  occasion: string;
  intensity: string;
  profile: string;
  budget: string;
  season: string;
  longevity: string;
};

type TextAnswers = {
  favoriteNotes: string;
  avoidNotes: string;
};

type Option = {
  value: string;
  label: string;
  hint: string;
};

type ChoiceQuestion = {
  kind: "choice";
  key: keyof QuizAnswers;
  title: string;
  description: string;
  options: Option[];
};

type OptionalTextQuestion = {
  kind: "text";
  key: keyof TextAnswers;
  title: string;
  description: string;
  label: string;
  placeholder: string;
};

type Question = ChoiceQuestion | OptionalTextQuestion;

type QuizDictionary = {
  eyebrow: string;
  title: string;
  description: string;
  stepsLabel: string;
  progressLabel: string;
  next: string;
  previous: string;
  restart: string;
  seeCatalog: string;
  resultTitle: string;
  resultDescription: string;
  generating: string;
  noMatchTitle: string;
  noMatchDescription: string;
  aiQuestionsLabel: string;
  fallbackNotice: string;
  sameResultNotice: string;
  failed: string;
  apiMissing: string;
  questions: Question[];
};

const QUIZ_DICTIONARY: Record<Locale, QuizDictionary> = {
  az: {
    eyebrow: "Qoxunu Tap",
    title: "Sənin üçün uyğun ətiri ağıllı suallarla tapaq",
    description: "Seçim + qısa mətn sualları ilə AI daha dəqiq nəticə çıxaracaq.",
    stepsLabel: "Addım",
    progressLabel: "İrəliləyiş",
    next: "Növbəti",
    previous: "Geri",
    restart: "Yenidən başla",
    seeCatalog: "Kataloqa bax",
    resultTitle: "AI ilə seçilən top 3 qoxu",
    resultDescription: "Nəticə həm cavablara, həm də yazdığın əlavə qeydlərə əsasən yaradılıb.",
    generating: "AI nəticəni hazırlayır...",
    noMatchTitle: "Uyğun nəticə tapılmadı",
    noMatchDescription: "Filtrlər çox dar ola bilər. Testi yenidən başlayıb daha geniş seçimlər et.",
    aiQuestionsLabel: "AI-nin əlavə sualları",
    fallbackNotice: "AI hazırda əlçatan deyil, standart ağıllı nəticə göstərilir.",
    sameResultNotice: "AI nəticəsi mövcud seçimlərlə eyni qaldı.",
    failed: "AI tövsiyəsi alınmadı. Yenidən cəhd edin.",
    apiMissing: "AI konfiqurasiyası tapılmadı. QOXUNU_OPENAI_API_KEY əlavə edin.",
    questions: [
      {
        kind: "choice",
        key: "gender",
        title: "Əsasən hansı kateqoriya axtarırsan?",
        description: "Bu seçim uyğun qoxuları daha dəqiq qruplaşdırmağa kömək edir.",
        options: [
          { value: "all", label: "Fərq etmir", hint: "Qadın, kişi və uniseks birlikdə" },
          { value: "unisex", label: "Uniseks", hint: "Orta balanslı və universal" },
          { value: "qadın", label: "Qadın", hint: "Daha zərif və yumşaq profil" },
          { value: "kişi", label: "Kişi", hint: "Daha dərin və xarakterli profil" },
        ],
      },
      {
        kind: "choice",
        key: "vibe",
        title: "Qoxunun ümumi ab-havası necə olsun?",
        description: "Ən çox hiss etmək istədiyin moodu seç.",
        options: [
          { value: "fresh", label: "Təzə və təmiz", hint: "Sitrus, yaşıl, yüngül" },
          { value: "warm", label: "İsti və yumşaq", hint: "Vanil, amber, rahat" },
          { value: "floral", label: "Çiçəkli və zərif", hint: "Gül, yasəmən, pudralı" },
          { value: "bold", label: "Cəsur və iddialı", hint: "Oud, dəri, ədviyyat" },
        ],
      },
      {
        kind: "choice",
        key: "occasion",
        title: "Ətiri əsasən harada istifadə edəcəksən?",
        description: "İstifadə mühiti qoxunun tonunu dəyişir.",
        options: [
          { value: "daily", label: "Gündəlik", hint: "Universallıq önəmlidir" },
          { value: "office", label: "Ofis", hint: "Yumşaq və səliqəli profil" },
          { value: "date", label: "Görüş", hint: "Yaxın məsafədə xoş təsir" },
          { value: "evening", label: "Axşam", hint: "Daha dolğun və dərin" },
        ],
      },
      {
        kind: "choice",
        key: "intensity",
        title: "Qoxu nə qədər hiss olunsun?",
        description: "Qalıcılıq və yayılım üçün rahatlıq səviyyəni seç.",
        options: [
          { value: "soft", label: "Yüngül", hint: "Sakit, yaxın məsafə" },
          { value: "balanced", label: "Balanslı", hint: "Gündəlik üçün ideal" },
          { value: "strong", label: "Güclü", hint: "Daha ifadəli və qalıcı" },
        ],
      },
      {
        kind: "choice",
        key: "season",
        title: "Əsas mövsüm hansıdır?",
        description: "Mövsüm seçimi AI nəticəsini daha düzgün edir.",
        options: [
          { value: "all", label: "Bütün mövsüm", hint: "Universallıq" },
          { value: "summer", label: "Yay", hint: "Yüngül və təravətli" },
          { value: "winter", label: "Qış", hint: "Daha isti və dolğun" },
          { value: "spring", label: "Yaz/Payız", hint: "Balanslı keçid qoxuları" },
        ],
      },
      {
        kind: "choice",
        key: "profile",
        title: "Hansına daha yaxınsan?",
        description: "Əsas nota ailəsi top nəticəni birbaşa təsir edir.",
        options: [
          { value: "citrus", label: "Sitrus", hint: "Bergamot, limon, neroli" },
          { value: "floral", label: "Çiçəkli", hint: "Gül, yasəmən, iris" },
          { value: "woody", label: "Odunsu", hint: "Səndəl, sidr, vetiver" },
          { value: "amber", label: "Amber/Şirin", hint: "Vanil, tonka, balsamik" },
          { value: "oud", label: "Oud/Dumanlı", hint: "Dəri, tüstü, qaranlıq ton" },
        ],
      },
      {
        kind: "choice",
        key: "longevity",
        title: "Qalıcılıq gözləntin necədir?",
        description: "AI bunu prioritetləşdirmədə istifadə edir.",
        options: [
          { value: "moderate", label: "Orta", hint: "4-6 saat yetərlidir" },
          { value: "long", label: "Uzun", hint: "8+ saat istəyirəm" },
          { value: "beast", label: "Maksimum", hint: "Güclü iz buraxsın" },
        ],
      },
      {
        kind: "choice",
        key: "season",
        title: "Əsas mövsüm hansıdır?",
        description: "Mövsüm seçimi AI nəticəsini daha düzgün edir.",
        options: [
          { value: "all", label: "Bütün mövsüm", hint: "Universallıq" },
          { value: "summer", label: "Yay", hint: "Yüngül və təravətli" },
          { value: "winter", label: "Qış", hint: "Daha isti və dolğun" },
          { value: "spring", label: "Yaz/Payız", hint: "Balanslı keçid qoxuları" },
        ],
      },
      {
        kind: "choice",
        key: "longevity",
        title: "Qalıcılıq gözləntin necədir?",
        description: "AI bunu prioritetləşdirmədə istifadə edir.",
        options: [
          { value: "moderate", label: "Orta", hint: "4-6 saat yetərlidir" },
          { value: "long", label: "Uzun", hint: "8+ saat istəyirəm" },
          { value: "beast", label: "Maksimum", hint: "Güclü iz buraxsın" },
        ],
      },
      {
        kind: "choice",
        key: "budget",
        title: "Başlanğıc büdcə aralığın nədir?",
        description: "Nəticələri büdcənə uyğun prioritetləşdiririk.",
        options: [
          { value: "all", label: "Fərq etmir", hint: "Bütün qiymət aralığı" },
          { value: "under80", label: "80 AZN-dən aşağı", hint: "Sərfəli seçimlər" },
          { value: "80to140", label: "80-140 AZN", hint: "Balanslı orta seqment" },
          { value: "140plus", label: "140+ AZN", hint: "Premium və niş seçimlər" },
        ],
      },
      {
        kind: "text",
        key: "favoriteNotes",
        title: "İstəyə bağlı: sevdiyin notlar varmı?",
        description: "Məsələn: bergamot, vanil, oud, tüstülü və s.",
        label: "Sevdiyim notlar",
        placeholder: "Məsələn: bergamot, yaşıl çay, yüngül musk",
      },
      {
        kind: "text",
        key: "avoidNotes",
        title: "İstəyə bağlı: istəmədiyin notlar varmı?",
        description: "AI bu məlumatla uyğun olmayan variantları geri plana atacaq.",
        label: "Qaçındığım notlar",
        placeholder: "Məsələn: çox şirin vanil, ağır oud, tüstü",
      },
    ],
  },
  en: {
    eyebrow: "Find Your Scent",
    title: "Find your match with smarter questions",
    description: "Answer option-based questions and optional text prompts for AI-personalized picks.",
    stepsLabel: "Step",
    progressLabel: "Progress",
    next: "Next",
    previous: "Back",
    restart: "Start again",
    seeCatalog: "Open catalog",
    resultTitle: "Top 3 picks generated with AI",
    resultDescription: "This result is generated from both your selected options and optional text preferences.",
    generating: "AI is generating your result...",
    noMatchTitle: "No strong match found",
    noMatchDescription: "Your filters may be too strict. Restart and select broader options.",
    aiQuestionsLabel: "AI follow-up questions",
    fallbackNotice: "AI is currently unavailable, showing default smart results.",
    sameResultNotice: "AI returned the same top picks for this profile.",
    failed: "Could not get AI recommendations. Please try again.",
    apiMissing: "AI is not configured. Add QOXUNU_OPENAI_API_KEY.",
    questions: [],
  },
  ru: {
    eyebrow: "Подбор аромата",
    title: "Подберем аромат с умными вопросами",
    description: "Ответьте на вопросы с вариантами и добавьте текстовые пожелания по желанию.",
    stepsLabel: "Шаг",
    progressLabel: "Прогресс",
    next: "Далее",
    previous: "Назад",
    restart: "Начать заново",
    seeCatalog: "Открыть каталог",
    resultTitle: "Топ-3 варианта от AI",
    resultDescription: "Результат создан по вашим выборам и дополнительным текстовым пожеланиям.",
    generating: "AI готовит результат...",
    noMatchTitle: "Точное совпадение не найдено",
    noMatchDescription: "Фильтры могли получиться слишком узкими. Попробуйте более широкие параметры.",
    aiQuestionsLabel: "Дополнительные вопросы от AI",
    fallbackNotice: "AI сейчас недоступен, показаны стандартные умные результаты.",
    sameResultNotice: "AI вернул те же топ-результаты для этого профиля.",
    failed: "Не удалось получить рекомендации AI. Попробуйте снова.",
    apiMissing: "AI не настроен. Добавьте QOXUNU_OPENAI_API_KEY.",
    questions: [],
  },
};

QUIZ_DICTIONARY.en.questions = QUIZ_DICTIONARY.az.questions.map((question) => {
  if (question.kind === "choice") {
    return { ...question };
  }
  return { ...question };
});
QUIZ_DICTIONARY.ru.questions = QUIZ_DICTIONARY.az.questions.map((question) => {
  if (question.kind === "choice") {
    return { ...question };
  }
  return { ...question };
});

const KEYWORDS = {
  vibe: {
    fresh: ["citrus", "bergamot", "lemon", "grapefruit", "marine", "aquatic", "green", "tea", "neroli"],
    warm: ["vanilla", "amber", "tonka", "benzoin", "cinnamon", "caramel", "resin"],
    floral: ["rose", "jasmine", "peony", "iris", "violet", "orange-blossom", "lily", "floral"],
    bold: ["oud", "leather", "tobacco", "smoke", "spice", "incense", "musk", "patchouli"],
  },
  occasion: {
    daily: ["citrus", "green", "musk", "floral", "tea"],
    office: ["bergamot", "citrus", "neroli", "green", "lavender", "tea"],
    date: ["rose", "vanilla", "amber", "musk", "jasmine", "tonka"],
    evening: ["oud", "amber", "leather", "tobacco", "patchouli", "spice"],
  },
  intensity: {
    soft: ["citrus", "green", "tea", "floral", "neroli"],
    balanced: ["musk", "floral", "woody", "amber"],
    strong: ["oud", "leather", "tobacco", "amber", "patchouli", "incense"],
  },
  profile: {
    citrus: ["citrus", "bergamot", "lemon", "mandarin", "grapefruit", "neroli"],
    floral: ["floral", "rose", "jasmine", "iris", "violet", "peony", "ylang"],
    woody: ["woody", "sandalwood", "cedar", "vetiver", "patchouli"],
    amber: ["amber", "vanilla", "tonka", "benzoin", "resin", "sweet"],
    oud: ["oud", "smoke", "leather", "incense", "tobacco"],
  },
  season: {
    summer: ["citrus", "marine", "aquatic", "green", "neroli"],
    winter: ["amber", "vanilla", "oud", "tobacco", "incense"],
    spring: ["floral", "green", "citrus", "woody"],
    all: ["floral", "woody", "citrus", "amber"],
  },
  longevity: {
    moderate: ["citrus", "green", "tea", "light"],
    long: ["amber", "woody", "musk", "resin"],
    beast: ["oud", "leather", "tobacco", "incense", "patchouli"],
  },
} as const;

const INITIAL_ANSWERS: QuizAnswers = {
  gender: "",
  vibe: "",
  occasion: "",
  intensity: "",
  profile: "",
  budget: "",
  season: "",
  longevity: "",
};

const INITIAL_TEXT_ANSWERS: TextAnswers = {
  favoriteNotes: "",
  avoidNotes: "",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function collectPerfumeTokens(perfume: Perfume) {
  return [
    ...perfume.noteSlugs.top,
    ...perfume.noteSlugs.heart,
    ...perfume.noteSlugs.base,
    normalize(perfume.name),
    normalize(perfume.brand),
  ].map(normalize);
}

function countMatches(tokens: string[], keywords: readonly string[]) {
  let score = 0;
  for (const keyword of keywords) {
    if (tokens.some((token) => token.includes(keyword))) {
      score += 1;
    }
  }
  return score;
}

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return perfume.sizes.reduce((min, item) => (item.price < min ? item.price : min), perfume.sizes[0].price);
}

function scorePerfume(perfume: Perfume, answers: QuizAnswers) {
  const tokens = collectPerfumeTokens(perfume);
  let score = 0;

  const gender = normalize(perfume.gender);
  if (answers.gender && answers.gender !== "all") {
    if (gender.includes(answers.gender)) score += 6;
    else if (gender.includes("unisex")) score += 3;
    else score -= 2;
  }

  if (answers.vibe && answers.vibe in KEYWORDS.vibe) score += countMatches(tokens, KEYWORDS.vibe[answers.vibe as keyof typeof KEYWORDS.vibe]) * 2.2;
  if (answers.occasion && answers.occasion in KEYWORDS.occasion) score += countMatches(tokens, KEYWORDS.occasion[answers.occasion as keyof typeof KEYWORDS.occasion]) * 1.8;
  if (answers.intensity && answers.intensity in KEYWORDS.intensity) score += countMatches(tokens, KEYWORDS.intensity[answers.intensity as keyof typeof KEYWORDS.intensity]) * 1.5;
  if (answers.profile && answers.profile in KEYWORDS.profile) score += countMatches(tokens, KEYWORDS.profile[answers.profile as keyof typeof KEYWORDS.profile]) * 2.8;
  if (answers.season && answers.season in KEYWORDS.season) score += countMatches(tokens, KEYWORDS.season[answers.season as keyof typeof KEYWORDS.season]) * 1.2;
  if (answers.longevity && answers.longevity in KEYWORDS.longevity) score += countMatches(tokens, KEYWORDS.longevity[answers.longevity as keyof typeof KEYWORDS.longevity]) * 1.2;

  const price = getStartingPrice(perfume);
  if (answers.budget === "under80") score += price <= 80 ? 3 : -1;
  else if (answers.budget === "80to140") score += price >= 80 && price <= 140 ? 3 : -1;
  else if (answers.budget === "140plus") score += price >= 140 ? 3 : -1;

  if (perfume.inStock) score += 1.2;

  return score;
}

export function ScentQuizClient({ perfumes, locale }: { perfumes: Perfume[]; locale: Locale }) {
  const dictionary = QUIZ_DICTIONARY[locale];
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [textAnswers, setTextAnswers] = useState<TextAnswers>(INITIAL_TEXT_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [questionCardHeight, setQuestionCardHeight] = useState<number | null>(null);
  const [aiMatches, setAiMatches] = useState<Perfume[] | null>(null);
  const [aiFollowUps, setAiFollowUps] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [hasGeneratedAi, setHasGeneratedAi] = useState(false);

  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const questionCardInnerRef = useRef<HTMLDivElement | null>(null);
  const lastGeneratedRef = useRef("");

  const totalSteps = dictionary.questions.length;
  const isComplete = stepIndex >= totalSteps;
  const currentStepIndex = Math.min(stepIndex, Math.max(totalSteps - 1, 0));
  const currentQuestion = dictionary.questions[currentStepIndex];

  const topMatches = useMemo(() => {
    if (!isComplete) return [] as Perfume[];

    return [...perfumes]
      .map((perfume) => ({ perfume, score: scorePerfume(perfume, answers) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.perfume);
  }, [answers, isComplete, perfumes]);

  const perfumesBySlug = useMemo(() => new Map(perfumes.map((item) => [item.slug, item])), [perfumes]);
  const shownMatches = aiMatches && aiMatches.length ? aiMatches : topMatches;

  const progress = Math.round((Math.min(stepIndex, totalSteps) / totalSteps) * 100);
  const currentAnswer = currentQuestion.kind === "choice" ? answers[currentQuestion.key] : textAnswers[currentQuestion.key];

  const onSelect = (value: string) => {
    if (currentQuestion.kind !== "choice") return;

    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
  };

  const onNext = () => {
    if (currentQuestion.kind === "choice" && !currentAnswer) return;
    setStepIndex((prev) => Math.min(prev + 1, totalSteps));
  };

  const onPrevious = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const onRestart = () => {
    setAnswers(INITIAL_ANSWERS);
    setTextAnswers(INITIAL_TEXT_ANSWERS);
    setStepIndex(0);
    setAiMatches(null);
    setAiFollowUps([]);
    setAiError("");
    setAiNotice("");
    setHasGeneratedAi(false);
    lastGeneratedRef.current = "";
  };

  const requestAiRecommendations = async () => {
    setIsAiLoading(true);
    setAiError("");
    setAiNotice("");

    try {
      const response = await fetch("/api/qoxunu/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          answers,
          freeText: [
            textAnswers.favoriteNotes.trim() ? `favorites: ${textAnswers.favoriteNotes.trim()}` : "",
            textAnswers.avoidNotes.trim() ? `avoid: ${textAnswers.avoidNotes.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          fallbackSlugs: topMatches.map((item) => item.slug),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        slugs?: string[];
        followUpQuestions?: string[];
        error?: string;
        usedFallback?: boolean;
      };

      if (!response.ok) {
        const normalizedError = (payload.error || "").toLowerCase();
        setAiError(normalizedError.includes("openai_api_key") ? dictionary.apiMissing : payload.error || dictionary.failed);
        setIsAiLoading(false);
        setHasGeneratedAi(true);
        return;
      }

      const mapped = (payload.slugs ?? [])
        .map((slug) => perfumesBySlug.get(slug))
        .filter((item): item is Perfume => Boolean(item));

      if (payload.usedFallback) {
        setAiNotice(dictionary.fallbackNotice);
      } else {
        const currentTopSlugs = topMatches.map((item) => item.slug).join("|");
        const mappedSlugs = mapped.map((item) => item.slug).join("|");
        if (mappedSlugs && mappedSlugs === currentTopSlugs) {
          setAiNotice(dictionary.sameResultNotice);
        }
      }

      setAiMatches(mapped.length ? mapped : null);
      setAiFollowUps((payload.followUpQuestions ?? []).slice(0, 3));
      setHasGeneratedAi(true);
    } catch {
      setAiError(dictionary.failed);
      setHasGeneratedAi(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  const generationKey = useMemo(
    () => JSON.stringify({ answers, textAnswers, topSlugs: topMatches.map((item) => item.slug) }),
    [answers, textAnswers, topMatches],
  );

  useEffect(() => {
    if (!isComplete || isAiLoading || hasGeneratedAi) return;
    if (generationKey === lastGeneratedRef.current) return;

    lastGeneratedRef.current = generationKey;
    void requestAiRecommendations();
  }, [generationKey, hasGeneratedAi, isAiLoading, isComplete]);

  useLayoutEffect(() => {
    if (isComplete || !questionCardRef.current || !questionCardInnerRef.current) return;

    const currentHeight = questionCardRef.current.getBoundingClientRect().height;
    const nextHeight = questionCardInnerRef.current.getBoundingClientRect().height;

    if (!currentHeight || !nextHeight || Math.abs(currentHeight - nextHeight) < 2) {
      setQuestionCardHeight(null);
      return;
    }

    setQuestionCardHeight(currentHeight);

    const frameId = window.requestAnimationFrame(() => {
      setQuestionCardHeight(nextHeight);
    });

    const timeoutId = window.setTimeout(() => {
      setQuestionCardHeight(null);
    }, 520);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [currentQuestion, isComplete]);

  return (
    <section className="mx-auto w-full max-w-6xl px-2 pb-6 pt-3 sm:px-3 sm:pt-4 lg:px-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">{dictionary.eyebrow}</p>
        <h1 className="mt-2 text-3xl leading-tight text-zinc-900 sm:text-4xl">{dictionary.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-zinc-600 sm:text-base">{dictionary.description}</p>
      </div>

      {!isComplete ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-600">
            {dictionary.stepsLabel} {Math.min(stepIndex + 1, totalSteps)} / {totalSteps}
          </p>
          <p className="text-sm font-medium text-zinc-600">
            {dictionary.progressLabel} {progress}%
          </p>
        </div>
      ) : null}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!isComplete ? (
        <div
          ref={questionCardRef}
          style={questionCardHeight !== null ? { height: `${questionCardHeight}px` } : undefined}
          className="mt-3 overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
          <div ref={questionCardInnerRef} className="py-1 sm:py-2">
            <h2 className="text-[1.85rem] leading-tight text-zinc-900 sm:text-[2rem]">{currentQuestion.title}</h2>
            <p className="mt-1.5 text-[0.95rem] text-zinc-500 sm:text-base">{currentQuestion.description}</p>

            {currentQuestion.kind === "choice" ? (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {currentQuestion.options.map((option, index) => {
                  const active = currentAnswer === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSelect(option.value)}
                      style={{ animationDelay: `${index * 80}ms` }}
                      className={[
                        "quiz-option-reveal rounded-2xl border px-3 py-3 text-left transition-all duration-300 sm:px-4 sm:py-4",
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-[0_16px_34px_rgba(18,18,20,0.2)]"
                          : "border-zinc-300/85 bg-[#f3f3f2] text-zinc-700 md:hover:border-zinc-400 md:hover:bg-zinc-100/50",
                      ].join(" ")}
                    >
                      <p className="text-[0.97rem] font-semibold sm:text-[1rem]">{option.label}</p>
                      <p className={["mt-1 hidden text-xs sm:block sm:text-sm", active ? "text-zinc-300" : "text-zinc-500"].join(" ")}>
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm text-zinc-700">{currentQuestion.label}</span>
                <textarea
                  value={textAnswers[currentQuestion.key]}
                  onChange={(event) =>
                    setTextAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.key]: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder={currentQuestion.placeholder}
                  className="w-full resize-none rounded-2xl bg-[#f7f7f6] px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-200 transition focus:bg-white focus:ring-zinc-300"
                />
              </label>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onPrevious}
                disabled={stepIndex === 0}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 bg-[#f3f3f2] px-4 text-sm font-semibold text-zinc-600 transition md:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-5"
              >
                {dictionary.previous}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={currentQuestion.kind === "choice" && !currentAnswer}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-5 text-sm font-semibold text-white transition md:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-11 sm:px-6"
              >
                {dictionary.next}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="quiz-results-enter mt-5">
          <div className="quiz-results-hero relative overflow-hidden rounded-[1.5rem] px-4 py-5 sm:px-5">
            <span aria-hidden="true" className="quiz-results-spark quiz-results-spark-main" />
            <span aria-hidden="true" className="quiz-results-spark quiz-results-spark-soft" />
            <h2 className="text-3xl leading-tight text-zinc-900 md:text-4xl">{dictionary.resultTitle}</h2>
            <p className="mt-3 max-w-3xl text-zinc-600">{dictionary.resultDescription}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-300/90 bg-[#f6f5f2] px-6 text-sm font-semibold text-zinc-700 transition duration-300 md:hover:-translate-y-0.5 md:hover:bg-white"
              >
                {dictionary.restart}
              </button>
              <Link
                href="/catalog"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#5f4925] bg-[#6e5530] px-6 text-sm font-semibold text-[#fffdf8] shadow-[0_14px_30px_rgba(90,70,35,0.24)] transition duration-300 md:hover:-translate-y-0.5 md:hover:bg-[#5f4925]"
              >
                {dictionary.seeCatalog}
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-4 sm:px-5 sm:py-5">
            {isAiLoading ? <p className="text-sm text-zinc-600">{dictionary.generating}</p> : null}

            {aiFollowUps.length ? (
              <div className="rounded-2xl bg-[#f7f7f6] px-4 py-3 ring-1 ring-zinc-200">
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">{dictionary.aiQuestionsLabel}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-700">
                  {aiFollowUps.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {aiNotice ? <p className="mt-3 text-sm text-amber-700">{aiNotice}</p> : null}
            {aiError ? <p className="mt-3 text-sm text-rose-600">{aiError}</p> : null}
          </div>

          {shownMatches.length ? (
            <div className="quiz-results-grid mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 xl:gap-5">
              {shownMatches.map((perfume, index) => (
                <div key={perfume.id} className="quiz-result-card-wrap" style={{ animationDelay: `${140 + index * 110}ms` }}>
                  <ProductCard perfume={perfume} locale={locale} />
                </div>
              ))}
            </div>
          ) : (
            <div className="quiz-results-empty mt-6 px-2 py-4 text-zinc-500">
              <p className="text-xl font-semibold text-zinc-700">{dictionary.noMatchTitle}</p>
              <p className="mt-2">{dictionary.noMatchDescription}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
