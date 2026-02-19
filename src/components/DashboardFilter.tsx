"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectOption {
  id: string;
  name: string;
}

interface DashboardFilterProps {
  projects: ProjectOption[];
  selectedProjectId?: string;
  startDate?: string;
  endDate?: string;
}

function buildUrl(projectId?: string, start?: string, end?: string): string {
  const params = new URLSearchParams();
  if (projectId) params.set("project", projectId);
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export default function DashboardFilter({
  projects,
  selectedProjectId,
  startDate,
  endDate,
}: DashboardFilterProps) {
  const t = useTranslations("dashboard");
  const [start, setStart] = useState(startDate || "");
  const [end, setEnd] = useState(endDate || "");

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    window.location.href = buildUrl(val || undefined, start || undefined, end || undefined);
  }

  function handleApplyDates() {
    window.location.href = buildUrl(selectedProjectId, start || undefined, end || undefined);
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
      {projects.length > 1 && (
        <div className="dash-filter">
          <Filter size={14} />
          <select
            className="dash-filter-select"
            value={selectedProjectId || ""}
            onChange={handleProjectChange}
          >
            <option value="">{t("allProjects")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="fs-date-field">
        <label>{t("from")}</label>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="fs-date-field">
        <label>{t("to")}</label>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={handleApplyDates}>
        {t("apply")}
      </button>
    </div>
  );
}
