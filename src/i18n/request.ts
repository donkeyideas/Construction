import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export type Locale = "en" | "es";
export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: Locale[] = ["en", "es"];

export default getRequestConfig(async () => {
  let locale: Locale = DEFAULT_LOCALE;

  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("locale")?.value;
    if (raw === "en" || raw === "es") {
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
