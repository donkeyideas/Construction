#!/usr/bin/env node
/**
 * Batch-replace toLocaleDateString() calls with deterministic formatters
 * to fix React hydration error #418.
 *
 * Run: node scripts/fix-hydration-dates.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Find all .tsx and .ts files with toLocaleDateString
const files = execSync(
  'grep -rl "toLocaleDateString" src/ --include="*.tsx" --include="*.ts"',
  { encoding: "utf-8" }
).trim().split("\n").filter(Boolean);

console.log(`Found ${files.length} files with toLocaleDateString`);

let totalReplacements = 0;
let filesModified = 0;

for (const file of files) {
  const absPath = path.resolve(file);
  let content = fs.readFileSync(absPath, "utf-8");
  const original = content;

  // Skip format.ts and date.ts themselves
  if (file.includes("lib/utils/format.ts") || file.includes("lib/utils/date.ts")) {
    continue;
  }

  let replacements = 0;

  // ===== MULTILINE PATTERNS (most common in helper functions) =====

  // ML1: new Date(EXPR).toLocaleDateString(LOCALE, {\n  month: "short",\n  day: "numeric",\n  year: "numeric",?\n})
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateSafe(toDateStr(new Date()))`;
      return `formatDateSafe(${expr})`;
    }
  );

  // ML1b: year first order
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*year:\s*["']numeric["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateSafe(toDateStr(new Date()))`;
      return `formatDateSafe(${expr})`;
    }
  );

  // ML2: month: "long", day: "numeric", year: "numeric"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']long["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateLong(toDateStr(new Date()))`;
      return `formatDateLong(${expr})`;
    }
  );

  // ML2b: year first with month: "long"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*year:\s*["']numeric["'],?\s*[\n\s]*month:\s*["']long["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateLong(toDateStr(new Date()))`;
      return `formatDateLong(${expr})`;
    }
  );

  // ML3: weekday: "long", month: "long", day: "numeric", year: "numeric"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']long["'],?\s*[\n\s]*month:\s*["']long["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateFull(toDateStr(new Date()))`;
      return `formatDateFull(${expr})`;
    }
  );

  // ML3b: weekday: "short", month: "short", day: "numeric", year: "numeric"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateSafe(toDateStr(new Date()))`;
      return `formatDateSafe(${expr})`;
    }
  );

  // ML4: month: "short", day: "numeric" (no year)
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateShort(toDateStr(new Date()))`;
      return `formatDateShort(${expr})`;
    }
  );

  // ML5: month: "long", year: "numeric"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']long["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatMonthYear(toDateStr(new Date()))`;
      return `formatMonthYear(${expr})`;
    }
  );

  // ML6: weekday: "short"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatWeekdayShort(toDateStr(new Date()))`;
      return `formatWeekdayShort(${expr})`;
    }
  );

  // ML7: month: "long"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']long["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatMonthLong(toDateStr(new Date()))`;
      return `formatMonthLong(${expr})`;
    }
  );

  // ML8: month: "short", year: "numeric"
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']short["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateShort(toDateStr(new Date()))`;
      return `formatDateShort(${expr})`;
    }
  );

  // ML9: weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  // (datetime with time — replace just the date part, use formatDateSafe + manual time)
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*hour:\s*["']numeric["'],?\s*[\n\s]*minute:\s*["']2-digit["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      return `formatDateSafe(${expr || 'toDateStr(new Date())'})`;
    }
  );

  // ===== VARIABLE PATTERNS (multiline) =====
  // VAR.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" })
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*year:\s*["']numeric["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']long["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateLong(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']long["'],?\s*[\n\s]*month:\s*["']long["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateFull(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateShort(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']long["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatMonthYear(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatWeekdayShort(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']long["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatMonthLong(toDateStr(${varName}))`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*month:\s*["']short["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateShort(toDateStr(${varName}))`;
    }
  );

  // VAR.toLocaleDateString(LOCALE, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: ..., minute: ... })
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*year:\s*["']numeric["'],?\s*[\n\s]*hour:\s*["']numeric["'],?\s*[\n\s]*minute:\s*["']2-digit["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  // ===== SIMPLE FALLBACK PATTERNS =====
  // new Date(EXPR).toLocaleDateString() or .toLocaleDateString("en-US")
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*["'][^"']*["']?\s*\)/g,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateSafe(toDateStr(new Date()))`;
      return `formatDateSafe(${expr})`;
    }
  );

  // VARIABLE.toLocaleDateString() or .toLocaleDateString("en-US")
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*["'][^"']*["']?\s*\)/g,
    (match, varName) => {
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  // new Date(EXPR).toLocaleDateString()
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*\)/g,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateSafe(toDateStr(new Date()))`;
      return `formatDateSafe(${expr})`;
    }
  );

  if (replacements > 0 && content !== original) {
    // Determine which functions are actually used
    const usedFns = [];
    if (content.includes("formatDateSafe(")) usedFns.push("formatDateSafe");
    if (content.includes("formatDateLong(")) usedFns.push("formatDateLong");
    if (content.includes("formatDateShort(")) usedFns.push("formatDateShort");
    if (content.includes("formatDateFull(")) usedFns.push("formatDateFull");
    if (content.includes("formatMonthYear(")) usedFns.push("formatMonthYear");
    if (content.includes("formatWeekdayShort(")) usedFns.push("formatWeekdayShort");
    if (content.includes("formatMonthLong(")) usedFns.push("formatMonthLong");
    if (content.includes("toDateStr(")) usedFns.push("toDateStr");
    if (content.includes("shortMonth(")) usedFns.push("shortMonth");
    if (content.includes("formatCurrency(") || content.includes("formatCompactCurrency(") || content.includes("formatPercent(") || content.includes("formatRelativeTime(")) {
      // These are already imported, keep them
    }

    if (usedFns.length === 0) {
      // No format functions needed, skip import
    } else if (!content.includes('from "@/lib/utils/format"') && !content.includes("from '@/lib/utils/format'")) {
      // Add new import
      const importLine = `import { ${usedFns.join(", ")} } from "@/lib/utils/format";`;
      const importRegex = /^import .+$/gm;
      let lastImportEnd = 0;
      let m;
      while ((m = importRegex.exec(content)) !== null) {
        lastImportEnd = m.index + m[0].length;
      }
      if (lastImportEnd > 0) {
        content = content.slice(0, lastImportEnd) + "\n" + importLine + content.slice(lastImportEnd);
      } else {
        content = importLine + "\n" + content;
      }
    } else {
      // Extend existing import
      content = content.replace(
        /(import\s*\{)([^}]*)(}\s*from\s*["']@\/lib\/utils\/format["'])/,
        (m, open, existing, close) => {
          const existingNames = existing.split(",").map(s => s.trim()).filter(Boolean);
          const combined = [...new Set([...existingNames, ...usedFns])];
          return `${open} ${combined.join(", ")} ${close}`;
        }
      );
    }

    fs.writeFileSync(absPath, content, "utf-8");
    filesModified++;
    totalReplacements += replacements;
    console.log(`  ${file}: ${replacements} replacements`);
  }
}

console.log(`\nDone! Modified ${filesModified} files, ${totalReplacements} total replacements.`);
