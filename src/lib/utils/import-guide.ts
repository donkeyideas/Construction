/**
 * Import Guide: Defines the recommended import order for first-time setup.
 * Numbers are shown as badges on nav items until all critical entities are imported.
 */

export interface ImportStep {
  step: number;
  entity: string;
  navLabel: string;
  navHref: string;
}

export const IMPORT_GUIDE_STEPS: ImportStep[] = [
  { step: 1, entity: "chart_of_accounts", navLabel: "Chart of Accounts", navHref: "/financial/accounts" },
  { step: 2, entity: "bank_accounts", navLabel: "Banking", navHref: "/financial/banking" },
  { step: 3, entity: "projects", navLabel: "Overview", navHref: "/projects/overview" },
  { step: 4, entity: "contacts", navLabel: "Directory", navHref: "/people" },
  { step: 5, entity: "equipment", navLabel: "Equipment", navHref: "/equipment" },
  { step: 6, entity: "invoices", navLabel: "Invoices", navHref: "/financial/invoices" },
  { step: 7, entity: "time_entries", navLabel: "Time & Attendance", navHref: "/people/time" },
];

export interface ImportProgress {
  [entity: string]: {
    count: number;
    lastImported?: string;
  };
}

/**
 * Returns a map of nav href -> step number for entities that still need importing.
 * Only shows badges when import_progress has been explicitly set (i.e. user started
 * the import wizard). Returns empty map when progress is null/undefined/empty,
 * since that means the company either predates the import feature or hasn't
 * opted into guided import.
 */
export function getImportBadges(
  importProgress: ImportProgress | null | undefined
): Map<string, number> {
  const badges = new Map<string, number>();

  // No progress tracking at all — don't show any badges
  if (!importProgress || Object.keys(importProgress).length === 0) {
    return badges;
  }

  for (const step of IMPORT_GUIDE_STEPS) {
    const progress = importProgress[step.entity];
    if (!progress || progress.count === 0) {
      badges.set(step.navHref, step.step);
    }
  }

  return badges;
}

/**
 * Returns true when import badges should NOT be shown.
 * This is true when:
 * - import_progress is null/undefined/empty (company not using guided import)
 * - All critical entities have been imported (count > 0)
 */
export function isImportComplete(
  importProgress: ImportProgress | null | undefined
): boolean {
  if (!importProgress || Object.keys(importProgress).length === 0) return true;

  return IMPORT_GUIDE_STEPS.every((step) => {
    const progress = importProgress[step.entity];
    return progress && progress.count > 0;
  });
}
