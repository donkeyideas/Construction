import Link from "next/link";
import { GanttChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatPercent } from "@/lib/utils/format";
import { formatLocalDate } from "@/lib/utils/date";
import GanttActions from "./GanttActions";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Gantt Schedule - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{ project?: string }>;
}

interface Phase {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
}

interface Task {
  id: string;
  phase_id: string | null;
  name: string;
  status: string;
  priority: string | null;
  start_date: string | null;
  end_date: string | null;
  completion_pct: number | null;
  is_milestone: boolean;
  is_critical_path: boolean;
  sort_order: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

/**
 * Calculate timeline boundaries and month headers from phases and tasks.
 */
function getTimelineBounds(phases: Phase[], tasks: Task[]) {
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  function consider(d: string | null) {
    if (!d) return;
    const dt = new Date(d);
    if (!minDate || dt < minDate) minDate = dt;
    if (!maxDate || dt > maxDate) maxDate = dt;
  }

  for (const p of phases) {
    consider(p.start_date);
    consider(p.end_date);
  }
  for (const t of tasks) {
    consider(t.start_date);
    consider(t.end_date);
  }

  if (!minDate || !maxDate) {
    const now = new Date();
    minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    maxDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);
  }

  // Expand to full months
  const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

  // Generate month headers
  const months: { label: string; start: Date; end: Date }[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    months.push({
      label: formatLocalDate(monthStart, { month: "short", year: "2-digit" }),
      start: monthStart,
      end: monthEnd,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  return { start, end, months, totalDays };
}

function dayOffset(date: Date, timelineStart: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
}

const PHASE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

export default async function GanttPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  const t = await getTranslations("projects");

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><GanttChart size={48} /></div>
        <div className="fin-empty-title">{t("ganttNoCompany")}</div>
        <div className="fin-empty-desc">{t("ganttNoCompanyDesc")}</div>
      </div>
    );
  }

  // Fetch active projects for selector
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, code, status")
    .eq("company_id", userCompany.companyId)
    .in("status", ["active", "in_progress", "planning", "pre_construction", "on_hold"])
    .order("name");

  const projectList = (projects ?? []) as Project[];
  const selectedProjectId = params.project || (projectList.length > 0 ? projectList[0].id : null);

  // Fetch phases and tasks for selected project
  let phases: Phase[] = [];
  let tasks: Task[] = [];

  if (selectedProjectId) {
    const [phasesRes, tasksRes] = await Promise.all([
      supabase
        .from("project_phases")
        .select("id, name, color, sort_order, start_date, end_date")
        .eq("company_id", userCompany.companyId)
        .eq("project_id", selectedProjectId)
        .order("sort_order"),
      supabase
        .from("project_tasks")
        .select("id, phase_id, name, status, priority, start_date, end_date, completion_pct, is_milestone, is_critical_path, sort_order")
        .eq("company_id", userCompany.companyId)
        .eq("project_id", selectedProjectId)
        .order("sort_order"),
    ]);
    phases = (phasesRes.data ?? []) as Phase[];
    tasks = (tasksRes.data ?? []) as Task[];
  }

  const hasData = phases.length > 0 || tasks.length > 0;

  // Build grouped structure: phases with their tasks, plus unphased tasks
  const phaseMap = new Map<string, Phase>();
  for (const p of phases) phaseMap.set(p.id, p);

  const tasksByPhase = new Map<string, Task[]>();
  const unphasedTasks: Task[] = [];
  for (const t of tasks) {
    if (t.phase_id && phaseMap.has(t.phase_id)) {
      const arr = tasksByPhase.get(t.phase_id) ?? [];
      arr.push(t);
      tasksByPhase.set(t.phase_id, arr);
    } else {
      unphasedTasks.push(t);
    }
  }

  const timeline = hasData ? getTimelineBounds(phases, tasks) : null;
  const LABEL_WIDTH = 240;

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("ganttTitle")}</h2>
          <p className="fin-header-sub">{t("ganttSubtitle")}</p>
        </div>
      </div>

      {/* Project Selector Tabs */}
      {projectList.length > 0 && (
        <div className="fin-filters" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
            {t("ganttProject")}
          </label>
          {projectList.map((p) => (
            <Link
              key={p.id}
              href={`/projects/gantt?project=${p.id}`}
              className={`ui-btn ui-btn-sm ${
                selectedProjectId === p.id ? "ui-btn-primary" : "ui-btn-outline"
              }`}
            >
              {p.code}
            </Link>
          ))}
        </div>
      )}

      {/* Add Phase / Add Task */}
      {selectedProjectId && (
        <GanttActions
          projectId={selectedProjectId}
          phases={phases.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}

      {/* Gantt Chart */}
      {hasData && timeline ? (
        <div className="fin-chart-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: LABEL_WIDTH + timeline.months.length * 120 }}>
              {/* Month Header Row */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "2px solid var(--border)",
                  background: "var(--bg-card)",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: LABEL_WIDTH,
                    minWidth: LABEL_WIDTH,
                    padding: "10px 14px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    borderRight: "1px solid var(--border)",
                  }}
                >
                  {t("ganttTask")}
                </div>
                <div style={{ flex: 1, display: "flex" }}>
                  {timeline.months.map((m, i) => {
                    const monthDays = Math.ceil(
                      (m.end.getTime() - m.start.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const widthPct = (monthDays / timeline.totalDays) * 100;
                    return (
                      <div
                        key={i}
                        style={{
                          width: `${widthPct}%`,
                          textAlign: "center",
                          padding: "10px 4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--muted)",
                          borderRight: "1px solid var(--border)",
                          boxSizing: "border-box",
                        }}
                      >
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Phase Groups and Tasks */}
              {phases.map((phase, phaseIdx) => {
                const phaseTasks = tasksByPhase.get(phase.id) ?? [];
                const color = phase.color || PHASE_COLORS[phaseIdx % PHASE_COLORS.length];

                // Phase bar position
                const phaseStart = phase.start_date ? dayOffset(new Date(phase.start_date), timeline.start) : 0;
                const phaseEnd = phase.end_date
                  ? dayOffset(new Date(phase.end_date), timeline.start)
                  : timeline.totalDays;
                const phaseLeftPct = (phaseStart / timeline.totalDays) * 100;
                const phaseWidthPct = Math.max(0.5, ((phaseEnd - phaseStart) / timeline.totalDays) * 100);

                return (
                  <div key={phase.id}>
                    {/* Phase Row */}
                    <div
                      style={{
                        display: "flex",
                        borderBottom: "1px solid var(--border)",
                        background: `${color}08`,
                      }}
                    >
                      <div
                        style={{
                          width: LABEL_WIDTH,
                          minWidth: LABEL_WIDTH,
                          padding: "8px 14px",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          borderRight: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        {phase.name}
                      </div>
                      <div style={{ flex: 1, position: "relative", minHeight: 32, display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: `${phaseLeftPct}%`,
                            width: `${phaseWidthPct}%`,
                            height: 8,
                            borderRadius: 4,
                            background: color,
                            opacity: 0.2,
                          }}
                        />
                      </div>
                    </div>

                    {/* Task Rows within Phase */}
                    {phaseTasks.map((task) => (
                      <GanttTaskRow
                        key={task.id}
                        task={task}
                        color={color}
                        timeline={timeline}
                        labelWidth={LABEL_WIDTH}
                        indent
                      />
                    ))}
                  </div>
                );
              })}

              {/* Unphased Tasks */}
              {unphasedTasks.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--bg-card)",
                    }}
                  >
                    <div
                      style={{
                        width: LABEL_WIDTH,
                        minWidth: LABEL_WIDTH,
                        padding: "8px 14px",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        borderRight: "1px solid var(--border)",
                        color: "var(--muted)",
                      }}
                    >
                      {t("ganttUnassigned")}
                    </div>
                    <div style={{ flex: 1 }} />
                  </div>
                  {unphasedTasks.map((task) => (
                    <GanttTaskRow
                      key={task.id}
                      task={task}
                      color="#94a3b8"
                      timeline={timeline}
                      labelWidth={LABEL_WIDTH}
                      indent
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 20,
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              fontSize: "0.78rem",
              color: "var(--muted)",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 24,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--color-blue)",
                  opacity: 0.5,
                  display: "inline-block",
                }}
              />
              {t("ganttTaskDuration")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 24,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--color-blue)",
                  display: "inline-block",
                }}
              />
              {t("ganttCompletion")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "1rem", lineHeight: 1, color: "var(--color-amber)" }}>
                &#9670;
              </span>
              {t("ganttMilestone")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontWeight: 700, color: "var(--color-red)" }}>
                &#9646;
              </span>
              {t("ganttCriticalPath")}
            </span>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <GanttChart size={48} />
            </div>
            <div className="fin-empty-title">
              {projectList.length === 0 ? t("ganttNoProjects") : t("ganttNoSchedule")}
            </div>
            <div className="fin-empty-desc">
              {projectList.length === 0
                ? t("ganttNoProjectsDesc")
                : t("ganttNoScheduleDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders a single task row in the Gantt chart.
 */
function GanttTaskRow({
  task,
  color,
  timeline,
  labelWidth,
  indent,
}: {
  task: Task;
  color: string;
  timeline: { start: Date; end: Date; totalDays: number };
  labelWidth: number;
  indent?: boolean;
}) {
  const isMilestone = task.is_milestone;
  const isCritical = task.is_critical_path;
  const completion = task.completion_pct ?? 0;

  // Bar positioning
  const taskStart = task.start_date ? dayOffset(new Date(task.start_date), timeline.start) : 0;
  const taskEnd = task.end_date
    ? dayOffset(new Date(task.end_date), timeline.start)
    : taskStart + 1;
  const leftPct = (taskStart / timeline.totalDays) * 100;
  const widthPct = Math.max(0.3, ((taskEnd - taskStart) / timeline.totalDays) * 100);

  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Task label */}
      <div
        style={{
          width: labelWidth,
          minWidth: labelWidth,
          padding: `6px 14px 6px ${indent ? 32 : 14}px`,
          fontSize: "0.82rem",
          borderRight: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: isCritical ? 700 : 400,
          color: isCritical ? "var(--color-red)" : "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {isMilestone && (
          <span style={{ color: "var(--color-amber)", fontSize: "0.9rem" }}>&#9670;</span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{task.name}</span>
        {completion > 0 && (
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>
            {formatPercent(completion)}
          </span>
        )}
      </div>

      {/* Timeline bar area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 30,
          display: "flex",
          alignItems: "center",
        }}
      >
        {isMilestone ? (
          /* Milestone diamond */
          <div
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              transform: "translateX(-50%)",
              fontSize: "1.1rem",
              color: color,
              lineHeight: 1,
            }}
          >
            &#9670;
          </div>
        ) : (
          /* Duration bar with completion fill */
          <>
            {/* Background bar (total duration) */}
            <div
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                height: 10,
                borderRadius: 5,
                background: color,
                opacity: 0.3,
              }}
            />
            {/* Completion fill */}
            {completion > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  width: `${widthPct * (completion / 100)}%`,
                  height: 10,
                  borderRadius: 5,
                  background: color,
                  opacity: 0.85,
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
