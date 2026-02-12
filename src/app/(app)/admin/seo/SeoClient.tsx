"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  MapPin,
  Building2,
  HardHat,
} from "lucide-react";
import type { SeoOverview, SeoIssue, GeoPresence } from "@/lib/queries/seo";

interface SeoClientProps {
  seoOverview: SeoOverview;
  seoIssues: SeoIssue[];
  geoPresence: GeoPresence;
}

function formatCurrency(amount: number) {
  if (amount === 0) return "$0";
  if (Math.abs(amount) >= 1_000_000) {
    const val = amount / 1_000_000;
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    const val = amount / 1_000;
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SeoScoreRing({ score }: { score: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const colorClass =
    clamped >= 70 ? "good" : clamped >= 40 ? "ok" : "bad";

  return (
    <div className="seo-score">
      <svg viewBox="0 0 80 80">
        <circle className="seo-score-track" cx="40" cy="40" r={radius} />
        <circle
          className={`seo-score-fill ${colorClass}`}
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="seo-score-value">{clamped}</span>
    </div>
  );
}

export default function SeoClient({
  seoOverview,
  seoIssues,
  geoPresence,
}: SeoClientProps) {
  const [activeTab, setActiveTab] = useState<"seo" | "geo">("seo");

  return (
    <>
      {/* Tabs */}
      <div className="seo-tabs">
        <button
          className={`seo-tab ${activeTab === "seo" ? "active" : ""}`}
          onClick={() => setActiveTab("seo")}
        >
          SEO Audit
        </button>
        <button
          className={`seo-tab ${activeTab === "geo" ? "active" : ""}`}
          onClick={() => setActiveTab("geo")}
        >
          Geographic Presence
        </button>
      </div>

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="seo-tab-panel">
          {/* KPI Cards */}
          <div className="content-stats">
            <div
              className="content-stat-card"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <SeoScoreRing score={seoOverview.seoScore} />
              <div>
                <span className="content-stat-label">SEO Score</span>
                <span
                  className="content-stat-value"
                  style={{ fontSize: "1rem" }}
                >
                  {seoOverview.seoScore >= 70
                    ? "Good"
                    : seoOverview.seoScore >= 40
                      ? "Needs Work"
                      : "Poor"}
                </span>
              </div>
            </div>
            <div className="content-stat-card">
              <span className="content-stat-label">Pages Audited</span>
              <span className="content-stat-value blue">
                {seoOverview.totalPages}
              </span>
            </div>
            <div className="content-stat-card">
              <span className="content-stat-label">Missing Meta Titles</span>
              <span
                className={`content-stat-value ${seoOverview.missingMetaTitle > 0 ? "red" : "green"}`}
              >
                {seoOverview.missingMetaTitle}
              </span>
            </div>
            <div className="content-stat-card">
              <span className="content-stat-label">
                Missing Meta Descriptions
              </span>
              <span
                className={`content-stat-value ${seoOverview.missingMetaDescription > 0 ? "red" : "green"}`}
              >
                {seoOverview.missingMetaDescription}
              </span>
            </div>
          </div>

          {/* SEO Issues Table */}
          {seoIssues.length > 0 ? (
            <div className="content-table-wrap">
              <table className="seo-issues-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Issue</th>
                    <th>Severity</th>
                    <th>Recommendation</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {seoIssues.map((issue, index) => (
                    <tr key={`${issue.pageId}-${issue.issueType}-${index}`}>
                      <td style={{ fontWeight: 500 }}>{issue.pageTitle}</td>
                      <td>{issue.issueType}</td>
                      <td>
                        <span
                          className={`status-badge ${issue.severity}`}
                        >
                          {issue.severity === "critical"
                            ? "Critical"
                            : "Warning"}
                        </span>
                      </td>
                      <td
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--muted)",
                          maxWidth: "300px",
                        }}
                      >
                        {issue.recommendation}
                      </td>
                      <td>
                        <Link
                          href={`/admin/content/${issue.pageSlug}`}
                          className="seo-issue-link"
                        >
                          Fix
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="content-empty" style={{ padding: "40px 24px" }}>
              <div className="content-empty-icon">
                <FileText size={32} />
              </div>
              <h3>
                {seoOverview.totalPages === 0
                  ? "No Pages to Audit"
                  : "All Clear"}
              </h3>
              <p>
                {seoOverview.totalPages === 0
                  ? "Create some CMS pages to start your SEO audit."
                  : "No SEO issues found. All pages have proper meta data."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* GEO Tab */}
      {activeTab === "geo" && (
        <div className="seo-tab-panel">
          {/* GEO Summary Cards */}
          <div className="geo-stats">
            <div className="geo-stat-card">
              <span className="geo-stat-label">Cities Active</span>
              <span className="geo-stat-value">
                {geoPresence.totalCities}
              </span>
            </div>
            <div className="geo-stat-card">
              <span className="geo-stat-label">States Active</span>
              <span className="geo-stat-value">
                {geoPresence.totalStates}
              </span>
            </div>
            <div className="geo-stat-card">
              <span className="geo-stat-label">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <HardHat size={14} />
                  Total Projects
                </span>
              </span>
              <span className="geo-stat-value">
                {geoPresence.totalProjects}
              </span>
            </div>
            <div className="geo-stat-card">
              <span className="geo-stat-label">
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Building2 size={14} />
                  Total Properties
                </span>
              </span>
              <span className="geo-stat-value">
                {geoPresence.totalProperties}
              </span>
            </div>
          </div>

          {/* Locations Table */}
          {geoPresence.locations.length > 0 ? (
            <div className="geo-table-wrap">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>City</th>
                    <th>State</th>
                    <th>Projects</th>
                    <th>Properties</th>
                    <th style={{ textAlign: "right" }}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {geoPresence.locations.map((loc) => (
                    <tr key={`${loc.city}-${loc.state}`}>
                      <td className="location-cell">
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <MapPin
                            size={14}
                            style={{ color: "var(--color-amber)", flexShrink: 0 }}
                          />
                          {loc.city}
                        </span>
                      </td>
                      <td>{loc.state}</td>
                      <td>{loc.projectCount}</td>
                      <td>{loc.propertyCount}</td>
                      <td
                        className="amount-cell"
                        style={{ textAlign: "right" }}
                      >
                        {formatCurrency(loc.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="content-empty" style={{ padding: "40px 24px" }}>
              <div className="content-empty-icon">
                <MapPin size={32} />
              </div>
              <h3>No Geographic Data</h3>
              <p>
                Add city and state information to your projects and properties to
                see your geographic presence.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
