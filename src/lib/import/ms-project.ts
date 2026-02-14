/**
 * MS Project XML Parser
 *
 * Parses Microsoft Project XML export format and converts to Buildwrk task structure.
 */

export interface ParsedTask {
  uid: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  percent_complete: number;
  is_milestone: boolean;
  parent_uid: string | null;
  predecessors: string[];
  notes: string | null;
  wbs: string | null;
}

export interface ParsedProject {
  name: string;
  start_date: string | null;
  end_date: string | null;
  tasks: ParsedTask[];
}

/**
 * Parse MS Project XML string into tasks
 */
export function parseMSProjectXml(xmlString: string): ParsedProject {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const project: ParsedProject = {
    name: getTextContent(doc, "Project > Name") || "Imported Project",
    start_date: getTextContent(doc, "Project > StartDate")?.split("T")[0] || null,
    end_date: getTextContent(doc, "Project > FinishDate")?.split("T")[0] || null,
    tasks: [],
  };

  const taskElements = doc.querySelectorAll("Project > Tasks > Task");

  taskElements.forEach((taskEl) => {
    const uid = getTextContent(taskEl, "UID") || "";
    const name = getTextContent(taskEl, "Name") || "";

    // Skip the project summary task (UID=0)
    if (uid === "0" || !name) return;

    const start = getTextContent(taskEl, "Start")?.split("T")[0] || null;
    const finish = getTextContent(taskEl, "Finish")?.split("T")[0] || null;

    // Parse duration (MS Project uses PT format: PT40H0M0S = 5 days)
    const durationStr = getTextContent(taskEl, "Duration") || "";
    const durationDays = parseMSDuration(durationStr);

    const percentComplete = parseInt(getTextContent(taskEl, "PercentComplete") || "0", 10);
    const milestone = getTextContent(taskEl, "Milestone") === "1";
    const outlineLevel = parseInt(getTextContent(taskEl, "OutlineLevel") || "1", 10);
    const wbs = getTextContent(taskEl, "WBS") || null;
    const notes = getTextContent(taskEl, "Notes") || null;

    // Parse predecessors
    const predecessors: string[] = [];
    const predLinks = taskEl.querySelectorAll("PredecessorLink");
    predLinks.forEach((link) => {
      const predUid = getTextContent(link, "PredecessorUID");
      if (predUid) predecessors.push(predUid);
    });

    // Determine parent (based on outline structure)
    let parentUid: string | null = null;
    if (outlineLevel > 1) {
      // Find previous task with lower outline level
      for (let i = project.tasks.length - 1; i >= 0; i--) {
        // Simple heuristic: previous tasks with lower WBS level
        if (project.tasks[i].wbs && wbs && wbs.startsWith(project.tasks[i].wbs!)) {
          parentUid = project.tasks[i].uid;
          break;
        }
      }
    }

    project.tasks.push({
      uid,
      name,
      start_date: start,
      end_date: finish,
      duration_days: durationDays,
      percent_complete: percentComplete,
      is_milestone: milestone,
      parent_uid: parentUid,
      predecessors,
      notes,
      wbs,
    });
  });

  return project;
}

/**
 * Parse MS Project PT duration format (e.g., PT40H0M0S = 5 days at 8hrs/day)
 */
function parseMSDuration(duration: string): number | null {
  if (!duration) return null;
  const match = duration.match(/PT(\d+)H/);
  if (match) {
    return Math.ceil(parseInt(match[1], 10) / 8);
  }
  const dayMatch = duration.match(/P(\d+)D/);
  if (dayMatch) {
    return parseInt(dayMatch[1], 10);
  }
  return null;
}

function getTextContent(parent: Document | Element, selector: string): string | null {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || null;
}

/**
 * Convert parsed tasks to Buildwrk project_tasks format
 */
export function convertToProjectTasks(
  parsed: ParsedProject,
  projectId: string,
  companyId: string
): { phases: Record<string, unknown>[]; tasks: Record<string, unknown>[] } {
  const phases: Record<string, unknown>[] = [];
  const tasks: Record<string, unknown>[] = [];

  // Tasks with children become phases, leaf tasks become tasks
  const childrenMap = new Set<string>();
  parsed.tasks.forEach((t) => {
    if (t.parent_uid) childrenMap.add(t.parent_uid);
  });

  let phaseOrder = 0;
  let taskOrder = 0;

  const uidToPhaseId: Record<string, string> = {};

  for (const task of parsed.tasks) {
    if (childrenMap.has(task.uid)) {
      // This is a phase (has children)
      const phaseId = `phase_${task.uid}`;
      uidToPhaseId[task.uid] = phaseId;
      phases.push({
        temp_id: phaseId,
        project_id: projectId,
        company_id: companyId,
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        status: task.percent_complete >= 100 ? "completed" : task.percent_complete > 0 ? "in_progress" : "not_started",
        sort_order: phaseOrder++,
      });
    } else {
      // Leaf task
      tasks.push({
        project_id: projectId,
        company_id: companyId,
        phase_temp_id: task.parent_uid ? uidToPhaseId[task.parent_uid] : null,
        name: task.name,
        start_date: task.start_date,
        end_date: task.end_date,
        duration_days: task.duration_days,
        percent_complete: task.percent_complete,
        is_milestone: task.is_milestone,
        notes: task.notes,
        sort_order: taskOrder++,
        status: task.percent_complete >= 100 ? "completed" : task.percent_complete > 0 ? "in_progress" : "not_started",
      });
    }
  }

  return { phases, tasks };
}
