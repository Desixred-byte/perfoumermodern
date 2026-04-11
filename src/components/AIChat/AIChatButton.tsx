"use client";

import { useCallback, useEffect, useState } from "react";
import { AIChatModal } from "./AIChatModal";
import type { Locale } from "@/lib/i18n";

type AIChatButtonProps = {
  locale: Locale;
};

const copyByLocale: Record<Locale, string> = {
  az: "Kömək lazımdır?",
  en: "Need help?",
  ru: "Нужна помощь?",
};

export function AIChatButton({ locale }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const copy = copyByLocale[locale];

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (!mounted) return null;

  return (
    <AIChatModal
      isOpen={isOpen}
      onOpen={handleOpen}
      onClose={handleClose}
      locale={locale}
      womanVideoUrl="/womanvideo.mp4"
      contactVideoUrl="/contactvideo.mp4"
      triggerLabel={copy}
    />
  );
}
