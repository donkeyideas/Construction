"use client";

import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectOption {
  id: string;
  name: string;
}

interface DashboardFilterProps {
  projects: ProjectOption[];
  selectedProjectId?: string;
}

export default function DashboardFilter({
  projects,
  selectedProjectId,
}: DashboardFilterProps) {
  const router = useRouter();
  const t = useTranslations("dashboard");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val) {
      router.push(`/dashboard?project=${val}`);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="dash-filter">
      <Filter size={14} />
      <select
        className="dash-filter-select"
        value={selectedProjectId || ""}
        onChange={handleChange}
      >
        <option value="">{t("allProjects")}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
