"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export default function ExecutiveAiInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    // Navigate to the AI assistant with the query as a search param
    const params = new URLSearchParams({ q: query.trim() });
    router.push(`/ai-assistant?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mobile-ai-input">
      <input
        type="text"
        placeholder="Ask about projects, finances..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" disabled={!query.trim()}>
        <Send size={16} />
      </button>
    </form>
  );
}
