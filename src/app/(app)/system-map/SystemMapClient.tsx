"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Search,
  ExternalLink,
  Map,
  LayoutDashboard,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronsUpDown,
} from "lucide-react";
import type {
  SystemDashboard,
  SystemPage,
  PageStatus,
} from "@/lib/config/system-map";
import {
  getAllPages,
  getPageCountByStatus,
  getTotalPageCount,
} from "@/lib/config/system-map";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type StatusFilter = "all" | PageStatus;

interface SystemMapClientProps {
  dashboards: SystemDashboard[];
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function SystemMapClient({ dashboards }: SystemMapClientProps) {
  const [expandedDashboards, setExpandedDashboards] = useState<Set<string>>(
    () => new Set(dashboards.map((d) => d.id))
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const totalPages = getTotalPageCount(dashboards);
  const activeCount = getPageCountByStatus(dashboards, "active");
  const comingSoonCount = getPageCountByStatus(dashboards, "coming_soon");
  const inactiveCount = getPageCountByStatus(dashboards, "inactive");

  // Filtered dashboards
  const filteredDashboards = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return dashboards
      .map((dashboard) => {
        const filteredSections = dashboard.sections
          .map((section) => {
            const filteredPages = section.pages.filter((page) => {
              const matchesStatus =
                statusFilter === "all" || page.status === statusFilter;
              const matchesSearch =
                !query ||
                page.label.toLowerCase().includes(query) ||
                page.description.toLowerCase().includes(query) ||
                page.href.toLowerCase().includes(query);
              return matchesStatus && matchesSearch;
            });
            return { ...section, pages: filteredPages };
          })
          .filter((section) => section.pages.length > 0);

        return { ...dashboard, sections: filteredSections };
      })
      .filter((dashboard) => dashboard.sections.length > 0);
  }, [dashboards, statusFilter, searchQuery]);

  // Count visible pages
  const visiblePageCount = filteredDashboards.reduce(
    (acc, d) => acc + d.sections.reduce((a, s) => a + s.pages.length, 0),
    0
  );

  // Toggle functions
  function toggleDashboard(id: string) {
    setExpandedDashboards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (expandedDashboards.size === filteredDashboards.length) {
      setExpandedDashboards(new Set());
    } else {
      setExpandedDashboards(new Set(filteredDashboards.map((d) => d.id)));
    }
  }

  const allExpanded = expandedDashboards.size === filteredDashboards.length;

  return (
    <div className="system-map-page">
      {/* Header */}
      <div className="system-map-header">
        <div className="system-map-header-text">
          <h2>
            <Map size={28} style={{ display: "inline", verticalAlign: "middle", marginRight: 10 }} />
            System Map
          </h2>
          <p>Complete overview of all dashboards and pages in the platform</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="system-map-stats">
        <div className="system-map-stat">
          <div className="system-map-stat-icon">
            <LayoutDashboard size={18} />
          </div>
          <div className="system-map-stat-info">
            <span className="system-map-stat-value">{dashboards.length}</span>
            <span className="system-map-stat-label">Dashboards</span>
          </div>
        </div>
        <div className="system-map-stat">
          <div className="system-map-stat-icon">
            <Layers size={18} />
          </div>
          <div className="system-map-stat-info">
            <span className="system-map-stat-value">{totalPages}</span>
            <span className="system-map-stat-label">Total Pages</span>
          </div>
        </div>
        <div className="system-map-stat">
          <div className="system-map-stat-icon stat-icon-active">
            <CheckCircle2 size={18} />
          </div>
          <div className="system-map-stat-info">
            <span className="system-map-stat-value">{activeCount}</span>
            <span className="system-map-stat-label">Active</span>
          </div>
        </div>
        <div className="system-map-stat">
          <div className="system-map-stat-icon stat-icon-coming-soon">
            <Clock size={18} />
          </div>
          <div className="system-map-stat-info">
            <span className="system-map-stat-value">{comingSoonCount}</span>
            <span className="system-map-stat-label">Coming Soon</span>
          </div>
        </div>
        <div className="system-map-stat">
          <div className="system-map-stat-icon stat-icon-inactive">
            <XCircle size={18} />
          </div>
          <div className="system-map-stat-info">
            <span className="system-map-stat-value">{inactiveCount}</span>
            <span className="system-map-stat-label">Inactive</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="system-map-filters">
        <div className="system-map-filter-buttons">
          {(
            [
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "coming_soon", label: "Coming Soon" },
              { value: "inactive", label: "Inactive" },
            ] as { value: StatusFilter; label: string }[]
          ).map((filter) => (
            <button
              key={filter.value}
              className={`system-map-filter-btn ${statusFilter === filter.value ? "active" : ""}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="system-map-filter-right">
          <div className="system-map-search">
            <Search size={16} className="system-map-search-icon" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="system-map-search-input"
            />
          </div>
          <button className="system-map-toggle-all" onClick={toggleAll}>
            <ChevronsUpDown size={16} />
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        </div>
      </div>

      {/* Results Count */}
      {(searchQuery || statusFilter !== "all") && (
        <div className="system-map-results-count">
          Showing {visiblePageCount} of {totalPages} pages
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="system-map-dashboards">
        {filteredDashboards.length === 0 ? (
          <div className="system-map-empty">
            <Search size={40} />
            <p>No pages match your filters</p>
            <button
              className="system-map-filter-btn"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredDashboards.map((dashboard) => {
            const isExpanded = expandedDashboards.has(dashboard.id);
            const pageCount = dashboard.sections.reduce(
              (acc, s) => acc + s.pages.length,
              0
            );

            return (
              <div
                key={dashboard.id}
                className="system-map-dashboard"
                style={
                  { "--dashboard-color": dashboard.color } as React.CSSProperties
                }
              >
                {/* Dashboard Header */}
                <button
                  className="system-map-dashboard-header"
                  onClick={() => toggleDashboard(dashboard.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="system-map-dashboard-title">
                    <span className="system-map-dashboard-chevron">
                      {isExpanded ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </span>
                    <span
                      className="system-map-dashboard-dot"
                      style={{ background: dashboard.color }}
                    />
                    <div>
                      <span className="system-map-dashboard-name">
                        {dashboard.label}
                      </span>
                      <span className="system-map-dashboard-desc">
                        {dashboard.description}
                      </span>
                    </div>
                  </div>
                  <div className="system-map-dashboard-meta">
                    <span className="system-map-page-count-badge">
                      {pageCount} {pageCount === 1 ? "page" : "pages"}
                    </span>
                    <Link
                      href={dashboard.loginUrl}
                      className="system-map-dashboard-login"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </button>

                {/* Dashboard Body */}
                {isExpanded && (
                  <div className="system-map-dashboard-body">
                    {dashboard.sections.map((section, sIdx) => (
                      <div key={sIdx} className="system-map-section">
                        <div className="system-map-section-label">
                          {section.label}
                        </div>
                        <div className="system-map-page-list">
                          {section.pages.map((page) => (
                            <PageRow key={page.href} page={page} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function PageRow({ page }: { page: SystemPage }) {
  const statusLabel =
    page.status === "active"
      ? "Active"
      : page.status === "coming_soon"
        ? "Coming Soon"
        : "Inactive";

  return (
    <div className="system-map-page-row">
      <span className={`system-map-status-dot status-${page.status}`} title={statusLabel} />
      <div className="system-map-page-info">
        <div className="system-map-page-label-row">
          <Link href={page.href} className="system-map-page-link">
            {page.label}
          </Link>
          <span className="system-map-page-href">{page.href}</span>
        </div>
        <span className="system-map-page-description">{page.description}</span>
        <div className="system-map-page-roles">
          {page.roles.map((role) => (
            <span key={role} className="system-map-role-badge">
              {formatRole(role)}
            </span>
          ))}
        </div>
      </div>
      <Link href={page.href} className="system-map-page-go" title={`Go to ${page.label}`}>
        <ExternalLink size={14} />
      </Link>
    </div>
  );
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
