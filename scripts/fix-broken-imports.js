#!/usr/bin/env node
/**
 * Fix broken imports caused by inserting format import inside multi-line import blocks.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const files = execSync(
  'grep -rl "from \\"@/lib/utils/format\\"" src/ --include="*.tsx" --include="*.ts"',
  { encoding: "utf-8" }
).trim().split("\n").filter(Boolean);

console.log(`Checking ${files.length} files for broken imports...`);
let fixed = 0;

for (const file of files) {
  const absPath = path.resolve(file);
  let content = fs.readFileSync(absPath, "utf-8");
  const original = content;

  // Find format import line(s)
  const formatImportRegex = /^import \{[^}]+\} from "@\/lib\/utils\/format";$/gm;
  const formatImports = content.match(formatImportRegex);
  if (!formatImports) continue;

  for (const formatImport of formatImports) {
    // Check if this import is inside a multi-line import block
    const idx = content.indexOf(formatImport);
    if (idx === -1) continue;

    // Look at what's before this line
    const beforeImport = content.substring(0, idx);
    const lines = beforeImport.split("\n");

    // Walk backwards to see if we're inside an unclosed import { ... } block
    let inMultiLineImport = false;
    let braceDepth = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      // Count closing braces
      braceDepth += (line.match(/\}/g) || []).length;
      // Count opening braces
      braceDepth -= (line.match(/\{/g) || []).length;

      if (braceDepth < 0) {
        // We found an unclosed opening brace
        if (/^import\s/.test(line)) {
          inMultiLineImport = true;
        }
        break;
      }
      if (/^import\s/.test(line) && line.includes("from ")) {
        break; // found a complete import, not inside a block
      }
    }

    if (inMultiLineImport) {
      // Remove the format import from its current position
      content = content.replace(formatImport + "\n", "");

      // Find the very first line (after "use client" etc) and insert before the first import
      const firstImportMatch = content.match(/^import /m);
      if (firstImportMatch) {
        const firstImportIdx = content.indexOf(firstImportMatch[0]);
        content = content.slice(0, firstImportIdx) + formatImport + "\n" + content.slice(firstImportIdx);
      }
      break; // Only process one format import per file
    }
  }

  if (content !== original) {
    fs.writeFileSync(absPath, content, "utf-8");
    fixed++;
    console.log(`  Fixed: ${file}`);
  }
}

console.log(`\nFixed ${fixed} files.`);
