"use client";

import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
}

export function ProjectSelect({
  projects,
  selectedProjectId,
}: {
  projects: Project[];
  selectedProjectId: string;
}) {
  const router = useRouter();

  return (
    <select
      className="fin-filter-select"
      defaultValue={selectedProjectId}
      onChange={(e) => {
        router.push(`/financial/job-costing?projectId=${e.target.value}`);
      }}
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
