#!/usr/bin/env node
/**
 * Fix Spanish (es.json) double-nested namespaces.
 *
 * Bug: Three namespaces in es.json have keys nested one level too deep:
 *   - es.projects.projects.* → should be es.projects.*
 *   - es.financial.financial.* → should be es.financial.*
 *   - es.adminPanel.adminPanel.* → should be es.adminPanel.*
 *
 * This script flattens them to match the structure of all other locales.
 */

const fs = require("fs");
const path = require("path");

const esPath = path.join(__dirname, "..", "messages", "es.json");
const enPath = path.join(__dirname, "..", "messages", "en.json");

const es = JSON.parse(fs.readFileSync(esPath, "utf8"));
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

const namespacesToFix = ["projects", "financial", "adminPanel"];

for (const ns of namespacesToFix) {
  const nested = es[ns][ns];
  if (!nested || typeof nested !== "object") {
    console.log(`  [SKIP] ${ns}.${ns} not found or not an object`);
    continue;
  }

  const nestedKeyCount = Object.keys(nested).length;
  console.log(`  [FIX] ${ns}.${ns} → flattening ${nestedKeyCount} keys up to ${ns}.*`);

  // Merge nested keys into parent, preserving any existing top-level keys
  for (const [key, value] of Object.entries(nested)) {
    if (!(key in es[ns]) || key === ns) {
      // Only add if not already present at the top level
      es[ns][key] = value;
    }
    // If key exists at top level already, keep the top-level version
    // (it was likely added more recently and is correct)
  }

  // Remove the double-nested key
  delete es[ns][ns];
}

// Validate: compare key counts with English
console.log("\nValidation:");
let allGood = true;
for (const ns of namespacesToFix) {
  const enCount = Object.keys(en[ns]).length;
  const esCount = Object.keys(es[ns]).length;
  const match = enCount === esCount ? "OK" : "MISMATCH";
  if (match !== "OK") allGood = false;
  console.log(`  ${ns}: en=${enCount}, es=${esCount} [${match}]`);
}

// Write back
fs.writeFileSync(esPath, JSON.stringify(es, null, 2) + "\n", "utf8");
console.log("\nWrote corrected es.json");

if (allGood) {
  console.log("All namespaces match English key counts.");
} else {
  console.log("WARNING: Some namespaces have mismatched key counts — review manually.");
}
