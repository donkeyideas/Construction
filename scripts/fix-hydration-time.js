#!/usr/bin/env node
/**
 * Fix toLocaleTimeString calls — same hydration issue as toLocaleDateString.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const files = execSync(
  'grep -rl "toLocaleTimeString" src/ --include="*.tsx" --include="*.ts"',
  { encoding: "utf-8" }
).trim().split("\n").filter(Boolean);

console.log(`Found ${files.length} files with toLocaleTimeString`);

let totalReplacements = 0;
let filesModified = 0;

for (const file of files) {
  const absPath = path.resolve(file);
  let content = fs.readFileSync(absPath, "utf-8");
  const original = content;
  let replacements = 0;

  // new Date(EXPR).toLocaleTimeString(...)
  content = content.replace(
    /new Date\(([^)]*)\)\.toLocaleTimeString\([^)]*\)/g,
    (match, expr) => {
      replacements++;
      if (!expr || expr.trim() === "") return `formatTimeSafe(new Date().toISOString())`;
      return `formatTimeSafe(${expr})`;
    }
  );

  // VARIABLE.toLocaleTimeString(...)
  content = content.replace(
    /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\.toLocaleTimeString\([^)]*\)/g,
    (match, varName) => {
      replacements++;
      return `formatTimeSafe(${varName}.toISOString?.() ?? String(${varName}))`;
    }
  );

  if (replacements > 0 && content !== original) {
    const usedFns = ["formatTimeSafe"];
    if (content.includes("toDateStr(")) usedFns.push("toDateStr");

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

    fs.writeFileSync(absPath, content, "utf-8");
    filesModified++;
    totalReplacements += replacements;
    console.log(`  ${file}: ${replacements} replacements`);
  }
}

console.log(`\nDone! Modified ${filesModified} files, ${totalReplacements} total replacements.`);
