import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isValidLocale, type Locale } from "./locales";

export default getRequestConfig(async () => {
  let locale: Locale = DEFAULT_LOCALE;

  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("locale")?.value;
    if (isValidLocale(raw)) {
      locale = raw;
    }
  } catch {
    // cookies() unavailable during static generation — use default
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
