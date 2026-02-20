"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";

type Theme = "light" | "dark";
type UIVariant = "classic" | "corporate";

interface ThemeContextValue {
  theme: Theme;
  variant: UIVariant;
  toggleTheme: () => void;
  setVariant: (v: UIVariant) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  variant: "classic",
  toggleTheme: () => {},
  setVariant: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [variant, setVariantState] = useState<UIVariant>("classic");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Theme
    const storedTheme = localStorage.getItem("buildwrk-theme") as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }

    // Variant
    const storedVariant = localStorage.getItem("buildwrk-variant") as UIVariant | null;
    if (storedVariant === "classic" || storedVariant === "corporate") {
      setVariantState(storedVariant);
      document.documentElement.setAttribute("data-variant", storedVariant);
    } else {
      document.documentElement.setAttribute("data-variant", "classic");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("buildwrk-theme", next);
  }, [theme]);

  const setVariant = useCallback((v: UIVariant) => {
    setVariantState(v);
    document.documentElement.setAttribute("data-variant", v);
    localStorage.setItem("buildwrk-variant", v);

    // Persist to database in background
    fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ui_variant: v }),
    }).catch(() => {});
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, variant, toggleTheme, setVariant }}>
      {children}
    </ThemeContext.Provider>
  );
}
