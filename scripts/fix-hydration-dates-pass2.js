#!/usr/bin/env node
/**
 * Pass 2: Handle remaining toLocaleDateString patterns
 * - datetime patterns (with hour/minute)
 * - edge cases (spread operator, variable fmtOpts, etc.)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const files = execSync(
  'grep -rl "toLocaleDateString" src/ --include="*.tsx" --include="*.ts"',
  { encoding: "utf-8" }
).trim().split("\n").filter(Boolean);

console.log(`Found ${files.length} files still with toLocaleDateString`);

let totalReplacements = 0;
let filesModified = 0;

for (const file of files) {
  const absPath = path.resolve(file);
  let content = fs.readFileSync(absPath, "utf-8");
  const original = content;

  // Skip format.ts and date.ts
  if (file.includes("lib/utils/format.ts") || file.includes("lib/utils/date.ts")) continue;

  let replacements = 0;

  // DT1: new Date(EXPR).toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric", hour: ..., minute: ... })
  // → formatDateTimeSafe(EXPR)
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\S]*?month:\s*["'](?:short|long)["'][\s\S]*?hour:\s*["'](?:numeric|2-digit)["'][\s\S]*?minute:\s*["']2-digit["'][\s\S]*?\}\s*\)/g,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateTimeSafe(new Date().toISOString())`;
      return `formatDateTimeSafe(${expr})`;
    }
  );

  // DT2: VARIABLE.toLocaleDateString(LOCALE, { ...anything with hour/minute... })
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\S]*?month:\s*["'](?:short|long)["'][\s\S]*?hour:\s*["'](?:numeric|2-digit)["'][\s\S]*?minute:\s*["']2-digit["'][\s\S]*?\}\s*\)/g,
    (match, varName) => {
      replacements++;
      return `formatDateTimeSafe(${varName}.toISOString?.() ?? String(${varName}))`;
    }
  );

  // DT3: new Date(EXPR).toLocaleDateString(LOCALE, { month: "short", day: "numeric", hour: ..., minute: ... })
  // (no year)
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\S]*?month:\s*["']short["'][\s\S]*?hour[\s\S]*?\}\s*\)/g,
    (match, expr) => {
      replacements++;
      return `formatDateTimeSafe(${expr || 'new Date().toISOString()'})`;
    }
  );

  // DT4: VARIABLE.toLocaleDateString(LOCALE, { anything with hour but no month })
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\S]*?hour[\s\S]*?\}\s*\)/g,
    (match, varName) => {
      replacements++;
      return `formatDateTimeSafe(${varName}.toISOString?.() ?? String(${varName}))`;
    }
  );

  // Edge: VARIABLE.toLocaleDateString("en-US", fmtOpts) or similar variable opts
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g,
    (match, varName, optsVar) => {
      // Only replace if optsVar looks like a variable (not a function call)
      if (optsVar.includes("(")) return match;
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  // Edge: VARIABLE.toLocaleDateString("en-US", { ...spread, year: "numeric" })
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\S]*?\.\.\.[\s\S]*?\}\s*\)/g,
    (match, varName) => {
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  // Edge: weekday: "short", month: "short", day: "numeric" (no year)
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, varName) => {
      replacements++;
      return `formatWeekdayDateShort(toDateStr(${varName}))`;
    }
  );

  // Edge: new Date(EXPR).toLocaleDateString(LOCALE, { weekday: "short", month: "short", day: "numeric" })
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\(\s*[^,)]+\s*,\s*\{[\s\n]*weekday:\s*["']short["'],?\s*[\n\s]*month:\s*["']short["'],?\s*[\n\s]*day:\s*["']numeric["'],?\s*[\n\s]*\}\s*\)/gs,
    (match, expr) => {
      replacements++;
      return `formatWeekdayDateShort(${expr || 'toDateStr(new Date())'})`;
    }
  );

  // Catch-all: any remaining .toLocaleDateString(...) calls
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleDateString\([^)]*\)/g,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatDateSafe(toDateStr(new Date()))`;
      return `formatDateSafe(${expr})`;
    }
  );

  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$.]*?)\.toLocaleDateString\([^)]*\)/g,
    (match, varName) => {
      // Don't replace if it's inside format.ts or date.ts
      if (varName === "parseLocalDate(value)") return match;
      replacements++;
      return `formatDateSafe(toDateStr(${varName}))`;
    }
  );

  if (replacements > 0 && content !== original) {
    // Determine needed imports
    const usedFns = [];
    if (content.includes("formatDateSafe(")) usedFns.push("formatDateSafe");
    if (content.includes("formatDateLong(")) usedFns.push("formatDateLong");
    if (content.includes("formatDateShort(")) usedFns.push("formatDateShort");
    if (content.includes("formatDateFull(")) usedFns.push("formatDateFull");
    if (content.includes("formatDateTimeSafe(")) usedFns.push("formatDateTimeSafe");
    if (content.includes("formatMonthYear(")) usedFns.push("formatMonthYear");
    if (content.includes("formatWeekdayShort(")) usedFns.push("formatWeekdayShort");
    if (content.includes("formatWeekdayDateShort(")) usedFns.push("formatWeekdayDateShort");
    if (content.includes("formatMonthLong(")) usedFns.push("formatMonthLong");
    if (content.includes("toDateStr(")) usedFns.push("toDateStr");
    if (content.includes("shortMonth(")) usedFns.push("shortMonth");

    if (usedFns.length > 0) {
      if (!content.includes('from "@/lib/utils/format"') && !content.includes("from '@/lib/utils/format'")) {
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
        content = content.replace(
          /(import\s*\{)([^}]*)(}\s*from\s*["']@\/lib\/utils\/format["'])/,
          (m, open, existing, close) => {
            const existingNames = existing.split(",").map(s => s.trim()).filter(Boolean);
            const combined = [...new Set([...existingNames, ...usedFns])];
            return `${open} ${combined.join(", ")} ${close}`;
          }
        );
      }
    }

    fs.writeFileSync(absPath, content, "utf-8");
    filesModified++;
    totalReplacements += replacements;
    console.log(`  ${file}: ${replacements} replacements`);
  }
}

console.log(`\nDone! Modified ${filesModified} files, ${totalReplacements} total replacements.`);
