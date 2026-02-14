"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  HardHat,
  Users,
  FileText,
  FolderOpen,
  Building2,
  Wrench,
  ShieldCheck,
  Ticket,
  Handshake,
  DollarSign,
  ArrowRight,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  project: { label: "Project", icon: <HardHat size={14} />, color: "var(--color-blue)" },
  contact: { label: "Contact", icon: <Users size={14} />, color: "var(--color-amber)" },
  invoice: { label: "Invoice", icon: <DollarSign size={14} />, color: "var(--color-green)" },
  rfi: { label: "RFI", icon: <FileText size={14} />, color: "var(--color-blue)" },
  change_order: { label: "Change Order", icon: <FileText size={14} />, color: "var(--color-amber)" },
  submittal: { label: "Submittal", icon: <FileText size={14} />, color: "var(--color-blue)" },
  document: { label: "Document", icon: <FolderOpen size={14} />, color: "var(--muted)" },
  property: { label: "Property", icon: <Building2 size={14} />, color: "var(--color-amber)" },
  equipment: { label: "Equipment", icon: <Wrench size={14} />, color: "var(--muted)" },
  contract: { label: "Contract", icon: <FileText size={14} />, color: "var(--color-green)" },
  opportunity: { label: "Opportunity", icon: <Handshake size={14} />, color: "var(--color-amber)" },
  bid: { label: "Bid", icon: <Handshake size={14} />, color: "var(--color-blue)" },
  incident: { label: "Incident", icon: <ShieldCheck size={14} />, color: "var(--color-red)" },
  ticket: { label: "Ticket", icon: <Ticket size={14} />, color: "var(--color-amber)" },
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search with debounce
  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(val: string) {
    setQuery(val);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 250);
  }

  function navigate(result: SearchResult) {
    onClose();
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!open) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  let flatIndex = 0;

  return (
    <div className="search-overlay" onClick={handleBackdrop}>
      <div className="search-modal">
        {/* Search Input */}
        <div className="search-modal-input-row">
          <Search size={18} className="search-modal-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search projects, invoices, contacts, documents..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="search-modal-results">
          {loading && query.length >= 2 && (
            <div className="search-modal-status">Searching...</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="search-modal-status">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 2 && (
            <div className="search-modal-status">
              Type at least 2 characters to search
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const meta = TYPE_META[type] || { label: type, icon: <FileText size={14} />, color: "var(--muted)" };
            return (
              <div key={type} className="search-group">
                <div className="search-group-label">
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                  {meta.label}s
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={item.id}
                      className={`search-result-item${idx === activeIndex ? " active" : ""}`}
                      onClick={() => navigate(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <div className="search-result-info">
                        <span className="search-result-title">{item.title}</span>
                        {item.subtitle && (
                          <span className="search-result-subtitle">{item.subtitle}</span>
                        )}
                      </div>
                      <ArrowRight size={14} className="search-result-arrow" />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="search-modal-footer">
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
