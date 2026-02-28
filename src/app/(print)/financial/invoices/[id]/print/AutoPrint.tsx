"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    // Small delay so the page fully renders before the print dialog opens
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return null;
}
