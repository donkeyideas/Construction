export const SUPPORTED_LOCALES = [
  "en", "es", "pt-BR", "fr", "ar", "de", "hi", "zh",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isValidLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export const LOCALE_META: Record<
  Locale,
  { label: string; flag: string; nativeName: string; dir: "ltr" | "rtl" }
> = {
  en:      { label: "English",    flag: "🇺🇸", nativeName: "English",    dir: "ltr" },
  es:      { label: "Español",    flag: "🇪🇸", nativeName: "Español",    dir: "ltr" },
  "pt-BR": { label: "Portuguese", flag: "🇧🇷", nativeName: "Português",  dir: "ltr" },
  fr:      { label: "French",     flag: "🇫🇷", nativeName: "Français",   dir: "ltr" },
  ar:      { label: "Arabic",     flag: "🇸🇦", nativeName: "العربية",    dir: "rtl" },
  de:      { label: "German",     flag: "🇩🇪", nativeName: "Deutsch",    dir: "ltr" },
  hi:      { label: "Hindi",      flag: "🇮🇳", nativeName: "हिन्दी",      dir: "ltr" },
  zh:      { label: "Chinese",    flag: "🇨🇳", nativeName: "中文",        dir: "ltr" },
};
