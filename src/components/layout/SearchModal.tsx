"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  LayoutDashboard,
  CalendarDays,
  Inbox,
  BarChart3,
  Settings,
  Sparkles,
  Map,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const TYPE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  page: { icon: <LayoutDashboard size={14} />, color: "var(--color-blue)" },
  project: { icon: <HardHat size={14} />, color: "var(--color-blue)" },
  contact: { icon: <Users size={14} />, color: "var(--color-amber)" },
  invoice: { icon: <DollarSign size={14} />, color: "var(--color-green)" },
  rfi: { icon: <FileText size={14} />, color: "var(--color-blue)" },
  change_order: { icon: <FileText size={14} />, color: "var(--color-amber)" },
  submittal: { icon: <FileText size={14} />, color: "var(--color-blue)" },
  document: { icon: <FolderOpen size={14} />, color: "var(--muted)" },
  property: { icon: <Building2 size={14} />, color: "var(--color-amber)" },
  equipment: { icon: <Wrench size={14} />, color: "var(--muted)" },
  contract: { icon: <FileText size={14} />, color: "var(--color-green)" },
  opportunity: { icon: <Handshake size={14} />, color: "var(--color-amber)" },
  bid: { icon: <Handshake size={14} />, color: "var(--color-blue)" },
  incident: { icon: <ShieldCheck size={14} />, color: "var(--color-red)" },
  ticket: { icon: <Ticket size={14} />, color: "var(--color-amber)" },
};

// Nav key + section key for each page (translated at render time)
const NAV_PAGE_DEFS: { navKey: string; href: string; sectionKey: string; keywords: string[] }[] = [
  { navKey: "Dashboard", href: "/dashboard", sectionKey: "Home", keywords: ["home", "overview"] },
  { navKey: "Calendar", href: "/calendar", sectionKey: "Home", keywords: ["schedule", "events", "dates"] },
  { navKey: "Inbox", href: "/inbox", sectionKey: "Home", keywords: ["messages", "notifications", "mail"] },
  { navKey: "Tickets", href: "/tickets", sectionKey: "Home", keywords: ["support", "issues", "help"] },
  { navKey: "Active Projects", href: "/projects", sectionKey: "Projects", keywords: ["jobs", "work"] },
  { navKey: "Gantt Schedule", href: "/projects/gantt", sectionKey: "Projects", keywords: ["timeline", "chart", "gantt"] },
  { navKey: "Daily Logs", href: "/projects/daily-logs", sectionKey: "Projects", keywords: ["journal", "log", "diary"] },
  { navKey: "RFIs", href: "/projects/rfis", sectionKey: "Projects", keywords: ["request for information"] },
  { navKey: "Submittals", href: "/projects/submittals", sectionKey: "Projects", keywords: ["submittal"] },
  { navKey: "Change Orders", href: "/projects/change-orders", sectionKey: "Projects", keywords: ["co", "changes"] },
  { navKey: "Contracts", href: "/contracts", sectionKey: "Projects", keywords: ["agreements"] },
  { navKey: "Portfolio", href: "/properties", sectionKey: "Properties", keywords: ["portfolio", "buildings", "real estate"] },
  { navKey: "Leases", href: "/properties/leases", sectionKey: "Properties", keywords: ["tenants", "rent"] },
  { navKey: "Maintenance", href: "/properties/maintenance", sectionKey: "Properties", keywords: ["repairs", "work orders"] },
  { navKey: "Safety", href: "/safety", sectionKey: "Safety", keywords: ["osha", "compliance"] },
  { navKey: "Incidents", href: "/safety/incidents", sectionKey: "Safety", keywords: ["accidents", "injury"] },
  { navKey: "Inspections", href: "/safety/inspections", sectionKey: "Safety", keywords: ["audit", "check"] },
  { navKey: "Toolbox Talks", href: "/safety/toolbox-talks", sectionKey: "Safety", keywords: ["training", "safety meeting"] },
  { navKey: "Equipment", href: "/equipment", sectionKey: "Equipment", keywords: ["machinery", "tools"] },
  { navKey: "Inventory", href: "/equipment/inventory", sectionKey: "Equipment", keywords: ["assets", "tools", "list"] },
  { navKey: "Assignments", href: "/equipment/assignments", sectionKey: "Equipment", keywords: ["allocate"] },
  { navKey: "Maintenance", href: "/equipment/maintenance", sectionKey: "Equipment", keywords: ["service", "repair"] },
  { navKey: "Overview", href: "/financial", sectionKey: "Financial", keywords: ["money", "finance", "accounting"] },
  { navKey: "Invoices", href: "/financial/invoices", sectionKey: "Financial", keywords: ["bills", "billing", "payment"] },
  { navKey: "Accounts Receivable", href: "/financial/ar", sectionKey: "Financial", keywords: ["ar", "collections", "receivables"] },
  { navKey: "Accounts Payable", href: "/financial/ap", sectionKey: "Financial", keywords: ["ap", "bills", "payables"] },
  { navKey: "General Ledger", href: "/financial/general-ledger", sectionKey: "Financial", keywords: ["gl", "ledger", "journal"] },
  { navKey: "Chart of Accounts", href: "/financial/accounts", sectionKey: "Financial", keywords: ["coa", "accounts", "chart"] },
  { navKey: "Income Statement", href: "/financial/income-statement", sectionKey: "Financial", keywords: ["profit", "loss", "p&l", "revenue"] },
  { navKey: "Balance Sheet", href: "/financial/balance-sheet", sectionKey: "Financial", keywords: ["assets", "liabilities", "equity"] },
  { navKey: "Cash Flow", href: "/financial/cash-flow", sectionKey: "Financial", keywords: ["cash", "flow", "liquidity"] },
  { navKey: "Banking", href: "/financial/banking", sectionKey: "Financial", keywords: ["bank", "transactions", "reconcile"] },
  { navKey: "Budget vs Actual", href: "/financial/budget", sectionKey: "Financial", keywords: ["budget", "variance", "spending"] },
  { navKey: "Job Costing", href: "/financial/job-costing", sectionKey: "Financial", keywords: ["costs", "labor", "materials"] },
  { navKey: "KPI Dashboard", href: "/financial/kpi", sectionKey: "Financial", keywords: ["metrics", "performance", "indicators"] },
  { navKey: "Financial Audit", href: "/financial/audit", sectionKey: "Financial", keywords: ["audit", "compliance", "validation", "checks"] },
  { navKey: "Library", href: "/documents", sectionKey: "Documents", keywords: ["files", "uploads"] },
  { navKey: "Plan Room", href: "/documents/plan-room", sectionKey: "Documents", keywords: ["blueprints", "drawings", "plans"] },
  { navKey: "Directory", href: "/people", sectionKey: "People", keywords: ["contacts", "team", "employees", "staff"] },
  { navKey: "Time & Attendance", href: "/people/time", sectionKey: "People", keywords: ["timesheets", "hours", "clock"] },
  { navKey: "Payroll", href: "/people/labor", sectionKey: "People", keywords: ["labor", "time", "hours", "wages", "rates", "clock"] },
  { navKey: "Certifications", href: "/people/certifications", sectionKey: "People", keywords: ["licenses", "credentials"] },
  { navKey: "Vendors", href: "/people/vendors", sectionKey: "People", keywords: ["suppliers", "subcontractors", "subs"] },
  { navKey: "Pipeline", href: "/crm", sectionKey: "CRM & Bids", keywords: ["leads", "sales", "opportunities", "clients"] },
  { navKey: "Bid Management", href: "/crm/bids", sectionKey: "CRM & Bids", keywords: ["proposals", "tenders"] },
  { navKey: "Estimating", href: "/estimating", sectionKey: "CRM & Bids", keywords: ["estimate", "quote", "pricing"] },
  { navKey: "AI Assistant", href: "/ai-assistant", sectionKey: "AI Assistant", keywords: ["chat", "ai", "help"] },
  { navKey: "Automation", href: "/automation", sectionKey: "AI Assistant", keywords: ["workflows", "rules", "auto"] },
  { navKey: "Reports Center", href: "/reports", sectionKey: "Reports", keywords: ["analytics", "data", "export"] },
  { navKey: "Authoritative Reports", href: "/reports/authoritative", sectionKey: "Reports", keywords: ["official", "compliance"] },
  { navKey: "System Map", href: "/system-map", sectionKey: "Home", keywords: ["sitemap", "navigation", "overview"] },
  { navKey: "Users & Roles", href: "/admin/users", sectionKey: "Administration", keywords: ["team", "permissions", "admin"] },
  { navKey: "Company Settings", href: "/admin/settings", sectionKey: "Administration", keywords: ["configuration", "preferences", "admin"] },
  { navKey: "AI Providers", href: "/admin/ai-providers", sectionKey: "Administration", keywords: ["openai", "anthropic", "llm", "admin"] },
  { navKey: "Integrations", href: "/admin/integrations", sectionKey: "Administration", keywords: ["connect", "api", "sync", "admin"] },
  { navKey: "Security", href: "/admin/security", sectionKey: "Administration", keywords: ["password", "2fa", "auth", "admin"] },
];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const t = useTranslations("topbar");
  const nav = useTranslations("nav");
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build translated NAV_PAGES
  const NAV_PAGES = useMemo(() => NAV_PAGE_DEFS.map((p) => ({
    title: nav(p.navKey),
    href: p.href,
    section: nav(p.sectionKey),
    keywords: p.keywords,
  })), [nav]);

  // Build translated TYPE_META
  const TYPE_META = useMemo((): Record<string, { label: string; icon: React.ReactNode; color: string }> => {
    const types = ["page", "project", "contact", "invoice", "rfi", "change_order", "submittal", "document", "property", "equipment", "contract", "opportunity", "bid", "incident", "ticket"] as const;
    const result: Record<string, { label: string; icon: React.ReactNode; color: string }> = {};
    for (const type of types) {
      const meta = TYPE_ICONS[type] || { icon: <FileText size={14} />, color: "var(--muted)" };
      result[type] = { label: t(`type_${type}`), ...meta };
    }
    return result;
  }, [t]);

  // Instant client-side page search
  const pageResults = useMemo((): SearchResult[] => {
    if (query.length < 2) return [];
    const lower = query.toLowerCase();
    return NAV_PAGES.filter((p) =>
      p.title.toLowerCase().includes(lower) ||
      p.keywords.some((k) => k.includes(lower))
    )
      .slice(0, 8)
      .map((p) => ({
        id: `page-${p.href}`,
        type: "page",
        title: p.title,
        subtitle: p.section,
        href: p.href,
      }));
  }, [query, NAV_PAGES]);

  // Combined results: pages first, then DB results
  const results = useMemo(
    () => [...pageResults, ...dbResults],
    [pageResults, dbResults]
  );

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setDbResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Search with debounce
  const doSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setDbResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setDbResults(data.results || []);
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
            placeholder={t("searchPlaceholder")}
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
          {loading && query.length >= 2 && pageResults.length === 0 && (
            <div className="search-modal-status">{t("searching")}</div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="search-modal-status">
              {t("noResults", { query })}
            </div>
          )}

          {query.length < 2 && (
            <div className="search-modal-status">
              {t("typeToSearch")}
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const meta = TYPE_META[type] || { label: type, icon: <FileText size={14} />, color: "var(--muted)" };
            return (
              <div key={type} className="search-group">
                <div className="search-group-label">
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                  {meta.label}{type !== "page" ? "s" : "s"}
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
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> {t("navigate")}</span>
          <span><kbd>Enter</kbd> {t("open")}</span>
          <span><kbd>Esc</kbd> {t("close")}</span>
        </div>
      </div>
    </div>
  );
}
