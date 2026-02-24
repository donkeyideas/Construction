"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  page: { label: "Page", icon: <LayoutDashboard size={14} />, color: "var(--color-blue)" },
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

// All navigable pages for instant client-side search
const NAV_PAGES: { title: string; href: string; section: string; keywords: string[] }[] = [
  { title: "Dashboard", href: "/dashboard", section: "Home", keywords: ["home", "overview"] },
  { title: "Calendar", href: "/calendar", section: "Home", keywords: ["schedule", "events", "dates"] },
  { title: "Inbox", href: "/inbox", section: "Home", keywords: ["messages", "notifications", "mail"] },
  { title: "Tickets", href: "/tickets", section: "Home", keywords: ["support", "issues", "help"] },
  { title: "Active Projects", href: "/projects", section: "Projects", keywords: ["jobs", "work"] },
  { title: "Gantt Schedule", href: "/projects/gantt", section: "Projects", keywords: ["timeline", "chart", "gantt"] },
  { title: "Daily Logs", href: "/projects/daily-logs", section: "Projects", keywords: ["journal", "log", "diary"] },
  { title: "RFIs", href: "/projects/rfis", section: "Projects", keywords: ["request for information"] },
  { title: "Submittals", href: "/projects/submittals", section: "Projects", keywords: ["submittal"] },
  { title: "Change Orders", href: "/projects/change-orders", section: "Projects", keywords: ["co", "changes"] },
  { title: "Contracts", href: "/contracts", section: "Projects", keywords: ["agreements"] },
  { title: "Properties", href: "/properties", section: "Properties", keywords: ["portfolio", "buildings", "real estate"] },
  { title: "Leases", href: "/properties/leases", section: "Properties", keywords: ["tenants", "rent"] },
  { title: "Property Maintenance", href: "/properties/maintenance", section: "Properties", keywords: ["repairs", "work orders"] },
  { title: "Safety Dashboard", href: "/safety", section: "Safety", keywords: ["osha", "compliance"] },
  { title: "Incidents", href: "/safety/incidents", section: "Safety", keywords: ["accidents", "injury"] },
  { title: "Inspections", href: "/safety/inspections", section: "Safety", keywords: ["audit", "check"] },
  { title: "Toolbox Talks", href: "/safety/toolbox-talks", section: "Safety", keywords: ["training", "safety meeting"] },
  { title: "Equipment Dashboard", href: "/equipment", section: "Equipment", keywords: ["machinery", "tools"] },
  { title: "Equipment Inventory", href: "/equipment/inventory", section: "Equipment", keywords: ["assets", "tools", "list"] },
  { title: "Equipment Assignments", href: "/equipment/assignments", section: "Equipment", keywords: ["allocate"] },
  { title: "Equipment Maintenance", href: "/equipment/maintenance", section: "Equipment", keywords: ["service", "repair"] },
  { title: "Financial Overview", href: "/financial", section: "Financial", keywords: ["money", "finance", "accounting"] },
  { title: "Invoices", href: "/financial/invoices", section: "Financial", keywords: ["bills", "billing", "payment"] },
  { title: "Accounts Receivable", href: "/financial/ar", section: "Financial", keywords: ["ar", "collections", "receivables"] },
  { title: "Accounts Payable", href: "/financial/ap", section: "Financial", keywords: ["ap", "bills", "payables"] },
  { title: "General Ledger", href: "/financial/general-ledger", section: "Financial", keywords: ["gl", "ledger", "journal"] },
  { title: "Chart of Accounts", href: "/financial/accounts", section: "Financial", keywords: ["coa", "accounts", "chart"] },
  { title: "Income Statement", href: "/financial/income-statement", section: "Financial", keywords: ["profit", "loss", "p&l", "revenue"] },
  { title: "Balance Sheet", href: "/financial/balance-sheet", section: "Financial", keywords: ["assets", "liabilities", "equity"] },
  { title: "Cash Flow", href: "/financial/cash-flow", section: "Financial", keywords: ["cash", "flow", "liquidity"] },
  { title: "Banking", href: "/financial/banking", section: "Financial", keywords: ["bank", "transactions", "reconcile"] },
  { title: "Budget vs Actual", href: "/financial/budget", section: "Financial", keywords: ["budget", "variance", "spending"] },
  { title: "Job Costing", href: "/financial/job-costing", section: "Financial", keywords: ["costs", "labor", "materials"] },
  { title: "KPI Dashboard", href: "/financial/kpi", section: "Financial", keywords: ["metrics", "performance", "indicators"] },
  { title: "Financial Audit", href: "/financial/audit", section: "Financial", keywords: ["audit", "compliance", "validation", "checks"] },
  { title: "Document Library", href: "/documents", section: "Documents", keywords: ["files", "uploads"] },
  { title: "Plan Room", href: "/documents/plan-room", section: "Documents", keywords: ["blueprints", "drawings", "plans"] },
  { title: "People Directory", href: "/people", section: "People", keywords: ["contacts", "team", "employees", "staff"] },
  { title: "Time & Attendance", href: "/people/time", section: "People", keywords: ["timesheets", "hours", "clock"] },
  { title: "Labor & Time", href: "/people/labor", section: "People", keywords: ["labor", "time", "hours", "wages", "rates", "clock"] },
  { title: "Certifications", href: "/people/certifications", section: "People", keywords: ["licenses", "credentials"] },
  { title: "Vendors", href: "/people/vendors", section: "People", keywords: ["suppliers", "subcontractors", "subs"] },
  { title: "CRM Pipeline", href: "/crm", section: "CRM & Bids", keywords: ["leads", "sales", "opportunities", "clients"] },
  { title: "Bid Management", href: "/crm/bids", section: "CRM & Bids", keywords: ["proposals", "tenders"] },
  { title: "Estimating", href: "/estimating", section: "CRM & Bids", keywords: ["estimate", "quote", "pricing"] },
  { title: "AI Assistant", href: "/ai-assistant", section: "AI Assistant", keywords: ["chat", "ai", "help"] },
  { title: "Automation", href: "/automation", section: "AI Assistant", keywords: ["workflows", "rules", "auto"] },
  { title: "Reports Center", href: "/reports", section: "Reports", keywords: ["analytics", "data", "export"] },
  { title: "Authoritative Reports", href: "/reports/authoritative", section: "Reports", keywords: ["official", "compliance"] },
  { title: "System Map", href: "/system-map", section: "Home", keywords: ["sitemap", "navigation", "overview"] },
  { title: "Users & Roles", href: "/admin/users", section: "Administration", keywords: ["team", "permissions", "admin"] },
  { title: "Company Settings", href: "/admin/settings", section: "Administration", keywords: ["configuration", "preferences", "admin"] },
  { title: "AI Providers", href: "/admin/ai-providers", section: "Administration", keywords: ["openai", "anthropic", "llm", "admin"] },
  { title: "Integrations", href: "/admin/integrations", section: "Administration", keywords: ["connect", "api", "sync", "admin"] },
  { title: "Security", href: "/admin/security", section: "Administration", keywords: ["password", "2fa", "auth", "admin"] },
];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [query]);

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
            placeholder="Search pages, projects, invoices, contacts..."
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
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
