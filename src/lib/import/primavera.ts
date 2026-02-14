/**
 * Primavera P6 XER File Parser
 *
 * Parses .xer file format (tab-delimited text) used by Oracle Primavera P6.
 * XER format: %T (table header) followed by %F (field names) and %R (rows)
 */

export interface P6Activity {
  activity_id: string;
  activity_name: string;
  start_date: string | null;
  end_date: string | null;
  duration_hours: number | null;
  percent_complete: number;
  status: string;
  wbs_id: string | null;
  calendar_id: string | null;
}

export interface P6WBS {
  wbs_id: string;
  wbs_name: string;
  parent_wbs_id: string | null;
  seq_num: number;
}

export interface P6ParseResult {
  project_name: string;
  activities: P6Activity[];
  wbs: P6WBS[];
}

/**
 * Parse a Primavera P6 XER file string
 */
export function parseXerFile(xerContent: string): P6ParseResult {
  const lines = xerContent.split("\n").map((l) => l.replace(/\r$/, ""));

  const tables: Record<string, { fields: string[]; rows: string[][] }> = {};
  let currentTable = "";
  let currentFields: string[] = [];

  for (const line of lines) {
    if (line.startsWith("%T\t")) {
      currentTable = line.split("\t")[1] || "";
      tables[currentTable] = { fields: [], rows: [] };
    } else if (line.startsWith("%F\t") && currentTable) {
      currentFields = line.split("\t").slice(1);
      tables[currentTable].fields = currentFields;
    } else if (line.startsWith("%R\t") && currentTable) {
      const values = line.split("\t").slice(1);
      tables[currentTable].rows.push(values);
    }
  }

  // Extract project info
  let projectName = "Imported P6 Project";
  if (tables["PROJECT"]) {
    const projFields = tables["PROJECT"].fields;
    const projNameIdx = projFields.indexOf("proj_short_name");
    if (projNameIdx >= 0 && tables["PROJECT"].rows.length > 0) {
      projectName = tables["PROJECT"].rows[0][projNameIdx] || projectName;
    }
  }

  // Extract WBS
  const wbs: P6WBS[] = [];
  if (tables["PROJWBS"]) {
    const wbsFields = tables["PROJWBS"].fields;
    const idIdx = wbsFields.indexOf("wbs_id");
    const nameIdx = wbsFields.indexOf("wbs_name");
    const parentIdx = wbsFields.indexOf("parent_wbs_id");
    const seqIdx = wbsFields.indexOf("seq_num");

    for (const row of tables["PROJWBS"].rows) {
      wbs.push({
        wbs_id: row[idIdx] || "",
        wbs_name: row[nameIdx] || "",
        parent_wbs_id: row[parentIdx] || null,
        seq_num: parseInt(row[seqIdx] || "0", 10),
      });
    }
  }

  // Extract activities
  const activities: P6Activity[] = [];
  if (tables["TASK"]) {
    const taskFields = tables["TASK"].fields;
    const actIdIdx = taskFields.indexOf("task_code");
    const actNameIdx = taskFields.indexOf("task_name");
    const startIdx = taskFields.indexOf("act_start_date") >= 0 ? taskFields.indexOf("act_start_date") : taskFields.indexOf("early_start_date");
    const endIdx = taskFields.indexOf("act_end_date") >= 0 ? taskFields.indexOf("act_end_date") : taskFields.indexOf("early_end_date");
    const durIdx = taskFields.indexOf("target_drtn_hr_cnt");
    const pctIdx = taskFields.indexOf("phys_complete_pct");
    const statusIdx = taskFields.indexOf("status_code");
    const wbsIdIdx = taskFields.indexOf("wbs_id");
    const calIdx = taskFields.indexOf("clndr_id");

    for (const row of tables["TASK"].rows) {
      activities.push({
        activity_id: row[actIdIdx] || "",
        activity_name: row[actNameIdx] || "",
        start_date: parseP6Date(row[startIdx]),
        end_date: parseP6Date(row[endIdx]),
        duration_hours: row[durIdx] ? parseFloat(row[durIdx]) : null,
        percent_complete: row[pctIdx] ? parseFloat(row[pctIdx]) : 0,
        status: row[statusIdx] || "TK_NotStart",
        wbs_id: row[wbsIdIdx] || null,
        calendar_id: row[calIdx] || null,
      });
    }
  }

  return { project_name: projectName, activities, wbs };
}

/**
 * Parse P6 date format (YYYY-MM-DD hh:mm or similar)
 */
function parseP6Date(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  // P6 uses various date formats, try to normalize
  const cleaned = dateStr.trim().split(" ")[0]; // Take just the date part
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

/**
 * Convert P6 activities to Buildwrk task format
 */
export function convertP6ToTasks(
  parsed: P6ParseResult,
  projectId: string,
  companyId: string
): { phases: Record<string, unknown>[]; tasks: Record<string, unknown>[] } {
  const phases: Record<string, unknown>[] = [];
  const tasks: Record<string, unknown>[] = [];

  // WBS entries become phases
  let phaseOrder = 0;
  const wbsIdMap: Record<string, string> = {};

  for (const w of parsed.wbs) {
    const tempId = `wbs_${w.wbs_id}`;
    wbsIdMap[w.wbs_id] = tempId;
    phases.push({
      temp_id: tempId,
      project_id: projectId,
      company_id: companyId,
      name: w.wbs_name,
      sort_order: phaseOrder++,
      status: "not_started",
    });
  }

  // Activities become tasks
  let taskOrder = 0;
  for (const act of parsed.activities) {
    const pctComplete = act.percent_complete;
    const status = act.status === "TK_Complete"
      ? "completed"
      : pctComplete > 0
        ? "in_progress"
        : "not_started";

    tasks.push({
      project_id: projectId,
      company_id: companyId,
      phase_temp_id: act.wbs_id ? wbsIdMap[act.wbs_id] : null,
      name: act.activity_name,
      start_date: act.start_date,
      end_date: act.end_date,
      duration_days: act.duration_hours ? Math.ceil(act.duration_hours / 8) : null,
      percent_complete: pctComplete,
      is_milestone: act.duration_hours === 0,
      sort_order: taskOrder++,
      status,
    });
  }

  return { phases, tasks };
}
