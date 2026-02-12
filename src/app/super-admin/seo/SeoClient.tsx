"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  current_position: number | null;
  previous_position: number | null;
  difficulty: number | null;
  intent: string | null;
  target_url: string | null;
  tracked_since: string | null;
}

interface Props {
  keywords: Keyword[];
}

function getPositionTrend(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  if (current < previous) return "up";
  if (current > previous) return "down";
  return "neutral";
}

function getIntentBadgeClass(intent: string | null): string {
  switch (intent) {
    case "transactional":
      return "sa-badge-green";
    case "commercial":
      return "sa-badge-amber";
    case "informational":
      return "sa-badge-blue";
    default:
      return "";
  }
}

export default function SeoClient({ keywords }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [searchVolume, setSearchVolume] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [intent, setIntent] = useState("informational");
  const [targetUrl, setTargetUrl] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/super-admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          search_volume: searchVolume ? parseInt(searchVolume) : null,
          difficulty: difficulty ? parseInt(difficulty) : null,
          intent,
          target_url: targetUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add keyword.");
        return;
      }

      setKeyword("");
      setSearchVolume("");
      setDifficulty("");
      setIntent("informational");
      setTargetUrl("");
      setShowAdd(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const tracked = keywords.length;
  const avgPosition =
    keywords.filter((k) => k.current_position).length > 0
      ? (
          keywords.reduce((sum, k) => sum + (k.current_position || 0), 0) /
          keywords.filter((k) => k.current_position).length
        ).toFixed(1)
      : "-";

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>SEO & GEO</h2>
          <p className="admin-header-sub">
            Track keyword rankings and organic search performance
          </p>
        </div>
        <div className="admin-header-actions">
          <button className="sa-action-btn primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Keyword
          </button>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: "400px" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Globe size={18} />
          </div>
          <div className="admin-stat-label">Tracked Keywords</div>
          <div className="admin-stat-value">{tracked}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <Globe size={18} />
          </div>
          <div className="admin-stat-label">Avg Position</div>
          <div className="admin-stat-value">{avgPosition}</div>
        </div>
      </div>

      {error && <div className="invite-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Volume</th>
              <th>Position</th>
              <th>Trend</th>
              <th>Difficulty</th>
              <th>Intent</th>
              <th>Target URL</th>
            </tr>
          </thead>
          <tbody>
            {keywords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No keywords tracked yet. Add your first keyword to start monitoring.
                </td>
              </tr>
            ) : (
              keywords.map((k) => {
                const trend = getPositionTrend(k.current_position, k.previous_position);
                return (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 500 }}>{k.keyword}</td>
                    <td>{k.search_volume?.toLocaleString() ?? "-"}</td>
                    <td style={{ fontWeight: 600 }}>{k.current_position ?? "-"}</td>
                    <td>
                      {trend === "up" && (
                        <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <TrendingUp size={14} /> +{(k.previous_position ?? 0) - (k.current_position ?? 0)}
                        </span>
                      )}
                      {trend === "down" && (
                        <span style={{ color: "var(--color-red)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <TrendingDown size={14} /> -{(k.current_position ?? 0) - (k.previous_position ?? 0)}
                        </span>
                      )}
                      {trend === "neutral" && (
                        <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Minus size={14} /> 0
                        </span>
                      )}
                      {trend === null && <span style={{ color: "var(--muted)" }}>-</span>}
                    </td>
                    <td>
                      {k.difficulty != null ? (
                        <span style={{
                          color: k.difficulty > 70 ? "var(--color-red)" : k.difficulty > 40 ? "var(--color-amber)" : "var(--color-green)",
                          fontWeight: 600,
                        }}>
                          {k.difficulty}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      {k.intent ? (
                        <span className={`sa-badge ${getIntentBadgeClass(k.intent)}`} style={{ textTransform: "capitalize" }}>
                          {k.intent}
                        </span>
                      ) : "-"}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {k.target_url || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <>
          <div className="invite-modal-overlay" onClick={() => setShowAdd(false)} />
          <div className="invite-modal">
            <button className="invite-modal-close" onClick={() => setShowAdd(false)}>
              <X size={18} />
            </button>
            <div className="invite-modal-title">Add Keyword</div>
            <div className="invite-modal-desc">
              Track a new keyword for SEO monitoring.
            </div>
            <form onSubmit={handleAdd}>
              <div className="invite-form-group">
                <label className="invite-form-label">Keyword</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="e.g., construction project management software"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="invite-form-group">
                  <label className="invite-form-label">Search Volume</label>
                  <input
                    type="number"
                    className="invite-form-input"
                    placeholder="e.g., 1200"
                    value={searchVolume}
                    onChange={(e) => setSearchVolume(e.target.value)}
                  />
                </div>
                <div className="invite-form-group">
                  <label className="invite-form-label">Difficulty (0-100)</label>
                  <input
                    type="number"
                    className="invite-form-input"
                    placeholder="e.g., 45"
                    min="0"
                    max="100"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  />
                </div>
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">Intent</label>
                <select
                  className="invite-form-select"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                >
                  <option value="informational">Informational</option>
                  <option value="commercial">Commercial</option>
                  <option value="transactional">Transactional</option>
                  <option value="navigational">Navigational</option>
                </select>
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">Target URL</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="e.g., /features"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>
              <div className="invite-modal-footer">
                <button type="button" className="sa-action-btn" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="sa-action-btn primary" disabled={saving}>
                  {saving ? "Adding..." : "Add Keyword"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
