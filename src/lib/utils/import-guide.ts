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
 */
export function getImportBadges(
  importProgress: ImportProgress | null | undefined
): Map<string, number> {
  const badges = new Map<string, number>();

  if (!importProgress) {
    // No progress at all - show all badges
    for (const step of IMPORT_GUIDE_STEPS) {
      badges.set(step.navHref, step.step);
    }
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
 * Returns true when all critical entities have been imported (count > 0).
 */
export function isImportComplete(
  importProgress: ImportProgress | null | undefined
): boolean {
  if (!importProgress) return false;

  return IMPORT_GUIDE_STEPS.every((step) => {
    const progress = importProgress[step.entity];
    return progress && progress.count > 0;
  });
}
