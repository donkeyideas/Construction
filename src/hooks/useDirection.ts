"use client";

import { useLocale } from "next-intl";
import { LOCALE_META, type Locale } from "@/i18n/locales";

export function useDirection() {
  const locale = useLocale() as Locale;
  const dir = LOCALE_META[locale]?.dir ?? "ltr";
  const isRTL = dir === "rtl";
  return { dir, isRTL, locale };
}
