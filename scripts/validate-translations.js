#!/usr/bin/env node
/**
 * Translation Validation Script
 *
 * Validates all locale JSON files against the English reference file.
 * Checks for: missing keys, extra keys, missing placeholders, empty values.
 *
 * Usage: node scripts/validate-translations.js
 */

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "..", "messages");
const REFERENCE_LOCALE = "en";

// All locales that should exist (excluding the reference)
const EXPECTED_LOCALES = ["es", "pt-BR", "fr", "ar", "de", "hi", "zh"];

function flattenObject(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function extractPlaceholders(str) {
  if (typeof str !== "string") return [];
  // Strip ICU plural/select blocks — only extract simple {name} placeholders.
  // ICU syntax like {count, plural, one {# bid} other {# bids}} contains
  // translated text inside the braces that legitimately differs per locale.
  const stripped = str.replace(/\{[^,}]+,\s*(?:plural|select|selectordinal)\s*,[^]*$/g, "");
  const matches = stripped.match(/\{[^}]+\}/g);
  return matches ? matches.sort() : [];
}

function validate() {
  let hasErrors = false;

  // Load reference
  const refPath = path.join(MESSAGES_DIR, `${REFERENCE_LOCALE}.json`);
  if (!fs.existsSync(refPath)) {
    console.error(`Reference file not found: ${refPath}`);
    process.exit(1);
  }

  const refData = JSON.parse(fs.readFileSync(refPath, "utf-8"));
  const refFlat = flattenObject(refData);
  const refKeys = Object.keys(refFlat);

  console.log(`Reference (${REFERENCE_LOCALE}): ${refKeys.length} keys\n`);

  for (const locale of EXPECTED_LOCALES) {
    const localePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const errors = [];
    const warnings = [];

    if (!fs.existsSync(localePath)) {
      console.log(`[${locale}] FILE MISSING: ${localePath}`);
      hasErrors = true;
      continue;
    }

    let localeData;
    try {
      localeData = JSON.parse(fs.readFileSync(localePath, "utf-8"));
    } catch (e) {
      console.log(`[${locale}] INVALID JSON: ${e.message}`);
      hasErrors = true;
      continue;
    }

    const localeFlat = flattenObject(localeData);
    const localeKeys = Object.keys(localeFlat);

    // Missing keys
    const missingKeys = refKeys.filter((k) => !(k in localeFlat));
    if (missingKeys.length > 0) {
      errors.push(`${missingKeys.length} missing keys`);
      for (const k of missingKeys.slice(0, 10)) {
        errors.push(`  - ${k}`);
      }
      if (missingKeys.length > 10) {
        errors.push(`  ... and ${missingKeys.length - 10} more`);
      }
    }

    // Extra keys
    const extraKeys = localeKeys.filter((k) => !(k in refFlat));
    if (extraKeys.length > 0) {
      warnings.push(`${extraKeys.length} extra keys`);
      for (const k of extraKeys.slice(0, 5)) {
        warnings.push(`  - ${k}`);
      }
      if (extraKeys.length > 5) {
        warnings.push(`  ... and ${extraKeys.length - 5} more`);
      }
    }

    // Empty values
    const emptyValues = localeKeys.filter(
      (k) => typeof localeFlat[k] === "string" && localeFlat[k].trim() === ""
    );
    if (emptyValues.length > 0) {
      errors.push(`${emptyValues.length} empty values`);
      for (const k of emptyValues.slice(0, 5)) {
        errors.push(`  - ${k}`);
      }
      if (emptyValues.length > 5) {
        errors.push(`  ... and ${emptyValues.length - 5} more`);
      }
    }

    // Placeholder mismatches
    const placeholderIssues = [];
    for (const key of refKeys) {
      if (!(key in localeFlat)) continue;
      const refPh = extractPlaceholders(refFlat[key]);
      const locPh = extractPlaceholders(localeFlat[key]);
      if (JSON.stringify(refPh) !== JSON.stringify(locPh)) {
        placeholderIssues.push(
          `  - ${key}: expected ${JSON.stringify(refPh)}, got ${JSON.stringify(locPh)}`
        );
      }
    }
    if (placeholderIssues.length > 0) {
      errors.push(`${placeholderIssues.length} placeholder mismatches`);
      for (const issue of placeholderIssues.slice(0, 10)) {
        errors.push(issue);
      }
      if (placeholderIssues.length > 10) {
        errors.push(`  ... and ${placeholderIssues.length - 10} more`);
      }
    }

    // Print results
    const status = errors.length > 0 ? "FAIL" : "PASS";
    const keyCount = localeKeys.length;
    console.log(`[${locale}] ${status} — ${keyCount}/${refKeys.length} keys`);

    for (const e of errors) {
      console.log(`  ERROR: ${e}`);
    }
    for (const w of warnings) {
      console.log(`  WARN: ${w}`);
    }

    if (errors.length > 0) hasErrors = true;
    console.log();
  }

  if (hasErrors) {
    console.log("Validation FAILED — fix errors above.");
    process.exit(1);
  } else {
    console.log("All translations PASSED validation.");
  }
}

validate();
