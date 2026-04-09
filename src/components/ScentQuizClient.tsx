"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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
};

type Option = {
  value: string;
  label: string;
  hint: string;
};

type Question = {
  key: keyof QuizAnswers;
  title: string;
  description: string;
  options: Option[];
};

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
  noMatchTitle: string;
  noMatchDescription: string;
  questions: Question[];
};

type AiCopy = {
  title: string;
  description: string;
  promptLabel: string;
  promptPlaceholder: string;
  promptHint: string;
  run: string;
  running: string;
  followUps: string;
  apiMissing: string;
  failed: string;
};

const AI_COPY: Record<Locale, AiCopy> = {
  az: {
    title: "AI ilə daha dəqiq seçim",
    description: "İstəyini sərbəst yaz, AI nəticəni şəxsiləşdirsin.",
    promptLabel: "Əlavə istəyin",
    promptPlaceholder: "Məsələn: Yay üçün təravətli, ağır olmayan, ofisə uyğun və qadınların çox bəyəndiyi bir qoxu istəyirəm.",
    promptHint: "Qeyd: xarakter, mövsüm, sevdiyin notlar və istifadə mühitini yazmaq nəticəni yaxşılaşdırır.",
    run: "AI tövsiyə et",
    running: "AI düşünür...",
    followUps: "AI-nin əlavə sualları",
    apiMissing: "AI konfiqurasiyası tapılmadı. QOXUNU_OPENAI_API_KEY əlavə edin.",
    failed: "AI tövsiyəsi alınmadı. Yenidən cəhd edin.",
  },
  en: {
    title: "AI refined recommendation",
    description: "Add a free-text note and let AI personalize your picks.",
    promptLabel: "Extra preference",
    promptPlaceholder: "Example: I want a fresh summer scent, not heavy, office-safe, and attractive in close encounters.",
    promptHint: "Tip: include mood, season, favorite notes, and context for stronger results.",
    run: "Get AI picks",
    running: "AI is thinking...",
    followUps: "AI follow-up questions",
    apiMissing: "AI is not configured. Add QOXUNU_OPENAI_API_KEY.",
    failed: "Could not get AI recommendations. Please try again.",
  },
  ru: {
    title: "Точный подбор с AI",
    description: "Опишите пожелания свободным текстом, и AI персонализирует выбор.",
    promptLabel: "Дополнительный запрос",
    promptPlaceholder: "Например: Нужен свежий летний аромат, не слишком тяжелый, подходящий для офиса и приятный на близкой дистанции.",
    promptHint: "Совет: добавьте настроение, сезон, любимые ноты и контекст использования.",
    run: "Получить AI-подбор",
    running: "AI анализирует...",
    followUps: "Дополнительные вопросы от AI",
    apiMissing: "AI не настроен. Добавьте QOXUNU_OPENAI_API_KEY.",
    failed: "Не удалось получить рекомендации AI. Попробуйте снова.",
  },
};

const QUIZ_DICTIONARY: Record<Locale, QuizDictionary> = {
  az: {
    eyebrow: "Qoxunu Tap",
    title: "Sənin üçün uyğun ətiri 6 qısa sualla tapaq",
    description:
      "Aşağıdakı sualları bir-bir cavabla. Sistem cavablarına əsasən ən uyğun 3 qoxunu təqdim edəcək.",
    stepsLabel: "Addım",
    progressLabel: "İrəliləyiş",
    next: "Növbəti",
    previous: "Geri",
    restart: "Yenidən başla",
    seeCatalog: "Kataloqa bax",
    resultTitle: "Sənin üçün seçilən top 3 qoxu",
    resultDescription:
      "Bu nəticə cavablarına görə hesablanır. İstəsən testi yenidən keçib fərqli seçimlərlə müqayisə edə bilərsən.",
    noMatchTitle: "Uyğun nəticə tapılmadı",
    noMatchDescription:
      "Filtrlər çox dar ola bilər. Testi yenidən başlayıb daha geniş seçimlər et.",
    questions: [
      {
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
    ],
  },
  en: {
    eyebrow: "Find Your Scent",
    title: "Discover your match with 6 quick questions",
    description:
      "Answer the quiz step by step. We will rank and return the top 3 scent matches for your profile.",
    stepsLabel: "Step",
    progressLabel: "Progress",
    next: "Next",
    previous: "Back",
    restart: "Start again",
    seeCatalog: "Open catalog",
    resultTitle: "Your top 3 scent matches",
    resultDescription:
      "Results are calculated from your answers. You can restart and compare different profiles anytime.",
    noMatchTitle: "No strong match found",
    noMatchDescription:
      "Your filters may be too strict. Restart and select broader options for better matching.",
    questions: [
      {
        key: "gender",
        title: "What category are you mainly shopping for?",
        description: "This helps us group options with better relevance.",
        options: [
          { value: "all", label: "No preference", hint: "Women, men, and unisex" },
          { value: "unisex", label: "Unisex", hint: "Balanced universal profiles" },
          { value: "female", label: "Women", hint: "Softer and elegant profile" },
          { value: "male", label: "Men", hint: "Deeper and stronger profile" },
        ],
      },
      {
        key: "vibe",
        title: "What vibe should your scent have?",
        description: "Pick the mood you want to wear most often.",
        options: [
          { value: "fresh", label: "Fresh & clean", hint: "Citrus, green, airy" },
          { value: "warm", label: "Warm & cozy", hint: "Vanilla, amber, comfort" },
          { value: "floral", label: "Floral & elegant", hint: "Rose, jasmine, soft" },
          { value: "bold", label: "Bold & statement", hint: "Oud, leather, spice" },
        ],
      },
      {
        key: "occasion",
        title: "Where will you use it most?",
        description: "Usage context changes what feels right.",
        options: [
          { value: "daily", label: "Daily wear", hint: "Versatile all-round picks" },
          { value: "office", label: "Office", hint: "Clean and non-overpowering" },
          { value: "date", label: "Date", hint: "Close-range attractive vibe" },
          { value: "evening", label: "Evening", hint: "Richer deeper presence" },
        ],
      },
      {
        key: "intensity",
        title: "How strong should it feel?",
        description: "Choose your comfort level for projection and presence.",
        options: [
          { value: "soft", label: "Soft", hint: "Subtle and close" },
          { value: "balanced", label: "Balanced", hint: "Safe daily middle ground" },
          { value: "strong", label: "Strong", hint: "Expressive and long-lasting" },
        ],
      },
      {
        key: "profile",
        title: "Which scent family do you prefer?",
        description: "This has the strongest impact on your top ranking.",
        options: [
          { value: "citrus", label: "Citrus", hint: "Bergamot, lemon, neroli" },
          { value: "floral", label: "Floral", hint: "Rose, jasmine, iris" },
          { value: "woody", label: "Woody", hint: "Sandalwood, cedar, vetiver" },
          { value: "amber", label: "Amber/Sweet", hint: "Vanilla, tonka, resin" },
          { value: "oud", label: "Oud/Smoky", hint: "Leather, smoke, dark woods" },
        ],
      },
      {
        key: "budget",
        title: "Your preferred starting budget?",
        description: "We prioritize matches within your budget range.",
        options: [
          { value: "all", label: "No preference", hint: "Any price range" },
          { value: "under80", label: "Below 80 AZN", hint: "Value-driven picks" },
          { value: "80to140", label: "80-140 AZN", hint: "Balanced mid tier" },
          { value: "140plus", label: "140+ AZN", hint: "Premium and niche" },
        ],
      },
    ],
  },
  ru: {
    eyebrow: "Подбор аромата",
    title: "Найдите свой аромат за 6 коротких шагов",
    description:
      "Ответьте на вопросы по очереди, и система подберет для вас 3 наиболее подходящих аромата.",
    stepsLabel: "Шаг",
    progressLabel: "Прогресс",
    next: "Далее",
    previous: "Назад",
    restart: "Начать заново",
    seeCatalog: "Открыть каталог",
    resultTitle: "Ваши топ-3 аромата",
    resultDescription:
      "Результат рассчитывается по вашим ответам. При желании можно пройти тест заново и сравнить варианты.",
    noMatchTitle: "Точное совпадение не найдено",
    noMatchDescription:
      "Фильтры могли получиться слишком узкими. Попробуйте более широкие параметры.",
    questions: [
      {
        key: "gender",
        title: "Для какой категории вы ищете аромат?",
        description: "Это помогает точнее сузить подходящие варианты.",
        options: [
          { value: "all", label: "Без разницы", hint: "Женские, мужские и унисекс" },
          { value: "unisex", label: "Унисекс", hint: "Сбалансированный универсальный стиль" },
          { value: "female", label: "Женские", hint: "Более мягкий и элегантный профиль" },
          { value: "male", label: "Мужские", hint: "Более глубокий и выразительный профиль" },
        ],
      },
      {
        key: "vibe",
        title: "Какое настроение должен передавать аромат?",
        description: "Выберите атмосферу, которая вам ближе всего.",
        options: [
          { value: "fresh", label: "Свежий", hint: "Цитрус, зелень, легкость" },
          { value: "warm", label: "Теплый", hint: "Ваниль, амбра, мягкость" },
          { value: "floral", label: "Цветочный", hint: "Роза, жасмин, нежность" },
          { value: "bold", label: "Смелый", hint: "Уд, кожа, специи" },
        ],
      },
      {
        key: "occasion",
        title: "Где вы будете носить его чаще всего?",
        description: "Контекст использования сильно влияет на выбор.",
        options: [
          { value: "daily", label: "На каждый день", hint: "Универсальные варианты" },
          { value: "office", label: "В офис", hint: "Аккуратный и ненавязчивый" },
          { value: "date", label: "На встречи", hint: "Приятный шлейф на близкой дистанции" },
          { value: "evening", label: "На вечер", hint: "Более насыщенный характер" },
        ],
      },
      {
        key: "intensity",
        title: "Насколько выраженным должен быть аромат?",
        description: "Выберите комфортную интенсивность и шлейф.",
        options: [
          { value: "soft", label: "Легкий", hint: "Тихий и деликатный" },
          { value: "balanced", label: "Сбалансированный", hint: "Оптимально для повседневности" },
          { value: "strong", label: "Яркий", hint: "Выразительный и стойкий" },
        ],
      },
      {
        key: "profile",
        title: "Какая нотная семья вам ближе?",
        description: "Этот выбор сильнее всего влияет на итоговый рейтинг.",
        options: [
          { value: "citrus", label: "Цитрус", hint: "Бергамот, лимон, нероли" },
          { value: "floral", label: "Цветочный", hint: "Роза, жасмин, ирис" },
          { value: "woody", label: "Древесный", hint: "Сандал, кедр, ветивер" },
          { value: "amber", label: "Амбровый/Сладкий", hint: "Ваниль, тонка, смолы" },
          { value: "oud", label: "Уд/Дымный", hint: "Кожа, дым, темные оттенки" },
        ],
      },
      {
        key: "budget",
        title: "Какой стартовый бюджет предпочтителен?",
        description: "Мы отдаем приоритет вариантам в вашем ценовом диапазоне.",
        options: [
          { value: "all", label: "Без ограничения", hint: "Любой диапазон" },
          { value: "under80", label: "До 80 AZN", hint: "Более доступные варианты" },
          { value: "80to140", label: "80-140 AZN", hint: "Сбалансированный средний сегмент" },
          { value: "140plus", label: "140+ AZN", hint: "Премиум и ниша" },
        ],
      },
    ],
  },
};

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
} as const;

const INITIAL_ANSWERS: QuizAnswers = {
  gender: "",
  vibe: "",
  occasion: "",
  intensity: "",
  profile: "",
  budget: "",
};

function getStartingPrice(perfume: Perfume) {
  if (!perfume.sizes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return perfume.sizes.reduce((min, item) => (item.price < min ? item.price : min), perfume.sizes[0].price);
}

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

function scorePerfume(perfume: Perfume, answers: QuizAnswers) {
  const tokens = collectPerfumeTokens(perfume);
  let score = 0;

  const gender = normalize(perfume.gender);
  if (answers.gender && answers.gender !== "all") {
    if (gender.includes(answers.gender)) {
      score += 6;
    } else if (gender.includes("unisex")) {
      score += 3;
    } else {
      score -= 2;
    }
  }

  if (answers.vibe && answers.vibe in KEYWORDS.vibe) {
    score += countMatches(tokens, KEYWORDS.vibe[answers.vibe as keyof typeof KEYWORDS.vibe]) * 2.2;
  }

  if (answers.occasion && answers.occasion in KEYWORDS.occasion) {
    score += countMatches(tokens, KEYWORDS.occasion[answers.occasion as keyof typeof KEYWORDS.occasion]) * 1.8;
  }

  if (answers.intensity && answers.intensity in KEYWORDS.intensity) {
    score += countMatches(tokens, KEYWORDS.intensity[answers.intensity as keyof typeof KEYWORDS.intensity]) * 1.5;
  }

  if (answers.profile && answers.profile in KEYWORDS.profile) {
    score += countMatches(tokens, KEYWORDS.profile[answers.profile as keyof typeof KEYWORDS.profile]) * 2.8;
  }

  const price = getStartingPrice(perfume);
  if (answers.budget === "under80") {
    score += price <= 80 ? 3 : -1;
  } else if (answers.budget === "80to140") {
    score += price >= 80 && price <= 140 ? 3 : -1;
  } else if (answers.budget === "140plus") {
    score += price >= 140 ? 3 : -1;
  }

  if (perfume.inStock) {
    score += 1.2;
  }

  return score;
}

export function ScentQuizClient({ perfumes, locale }: { perfumes: Perfume[]; locale: Locale }) {
  const dictionary = QUIZ_DICTIONARY[locale];
  const aiCopy = AI_COPY[locale];
  const [answers, setAnswers] = useState<QuizAnswers>(INITIAL_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [questionCardHeight, setQuestionCardHeight] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMatches, setAiMatches] = useState<Perfume[] | null>(null);
  const [aiFollowUps, setAiFollowUps] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const questionCardInnerRef = useRef<HTMLDivElement | null>(null);
  const totalSteps = dictionary.questions.length;

  const isComplete = stepIndex >= totalSteps;
  const currentStepIndex = Math.min(stepIndex, Math.max(totalSteps - 1, 0));
  const currentQuestion = dictionary.questions[currentStepIndex];
  const currentAnswer = answers[currentQuestion.key];

  const topMatches = useMemo(() => {
    if (!isComplete) {
      return [] as Perfume[];
    }

    return [...perfumes]
      .map((perfume) => ({ perfume, score: scorePerfume(perfume, answers) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.perfume);
  }, [answers, isComplete, perfumes]);

  const perfumesBySlug = useMemo(() => new Map(perfumes.map((item) => [item.slug, item])), [perfumes]);

  const shownMatches = aiMatches && aiMatches.length ? aiMatches : topMatches;

  const progress = Math.round(((Math.min(stepIndex, totalSteps)) / totalSteps) * 100);

  const onSelect = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.key]: value,
    }));
  };

  const onNext = () => {
    if (!currentAnswer) {
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, totalSteps));
  };

  const onPrevious = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const onRestart = () => {
    setAnswers(INITIAL_ANSWERS);
    setStepIndex(0);
    setAiPrompt("");
    setAiMatches(null);
    setAiFollowUps([]);
    setAiError("");
  };

  const requestAiRecommendations = async () => {
    setIsAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("/api/qoxunu/recommend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          locale,
          answers,
          freeText: aiPrompt,
          fallbackSlugs: topMatches.map((item) => item.slug),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        slugs?: string[];
        followUpQuestions?: string[];
        error?: string;
      };

      if (!response.ok) {
        const normalizedError = (payload.error || "").toLowerCase();
        setAiError(normalizedError.includes("openai_api_key") ? aiCopy.apiMissing : payload.error || aiCopy.failed);
        setIsAiLoading(false);
        return;
      }

      const mapped = (payload.slugs ?? [])
        .map((slug) => perfumesBySlug.get(slug))
        .filter((item): item is Perfume => Boolean(item));

      setAiMatches(mapped.length ? mapped : null);
      setAiFollowUps((payload.followUpQuestions ?? []).slice(0, 3));
    } catch {
      setAiError(aiCopy.failed);
    } finally {
      setIsAiLoading(false);
    }
  };

  useLayoutEffect(() => {
    if (isComplete || !questionCardRef.current || !questionCardInnerRef.current) {
      return;
    }

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
  }, [currentQuestion.key, isComplete]);

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
                disabled={!currentAnswer}
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
            <p className="text-sm font-semibold tracking-[0.14em] text-zinc-500 uppercase">{aiCopy.title}</p>
            <p className="mt-2 text-sm text-zinc-600">{aiCopy.description}</p>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm text-zinc-700">{aiCopy.promptLabel}</span>
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                rows={4}
                placeholder={aiCopy.promptPlaceholder}
                className="w-full resize-none rounded-2xl bg-[#f7f7f6] px-4 py-3 text-sm text-zinc-800 outline-none ring-1 ring-zinc-200 transition focus:bg-white focus:ring-zinc-300"
              />
            </label>

            <p className="mt-2 text-xs text-zinc-500">{aiCopy.promptHint}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={requestAiRecommendations}
                disabled={isAiLoading}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAiLoading ? aiCopy.running : aiCopy.run}
              </button>
            </div>

            {aiFollowUps.length ? (
              <div className="mt-4 rounded-2xl bg-[#f7f7f6] px-4 py-3 ring-1 ring-zinc-200">
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">{aiCopy.followUps}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-700">
                  {aiFollowUps.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

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
