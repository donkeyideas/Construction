#!/usr/bin/env node
/**
 * Validate i18n translation files.
 * Compares all locale files against English (reference) to find:
 *   - Missing keys
 *   - Extra keys
 *   - Double-nested namespace bugs (e.g., projects.projects)
 *   - Key count mismatches
 */

const fs = require("fs");
const path = require("path");

const messagesDir = path.join(__dirname, "..", "messages");
const locales = ["en", "es", "pt-BR", "fr", "ar", "de", "hi", "zh"];
const reference = "en";

function getLeafKeys(obj, prefix) {
  prefix = prefix || "";
  var keys = [];
  for (var k of Object.keys(obj)) {
    var v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getLeafKeys(v, prefix + k + "."));
    } else {
      keys.push(prefix + k);
    }
  }
  return keys;
}

// Load all locales
var data = {};
for (var loc of locales) {
  var filePath = path.join(messagesDir, loc + ".json");
  data[loc] = JSON.parse(fs.readFileSync(filePath, "utf8"));
}

var en = data[reference];
var namespaces = Object.keys(en);
var totalIssues = 0;

console.log("=== i18n Validation Report ===\n");

// Check 1: Double-nesting bugs
console.log("--- Check 1: Double-nested namespaces ---");
var nestingIssues = 0;
for (var loc of locales) {
  for (var ns of namespaces) {
    if (data[loc][ns] && data[loc][ns][ns] && typeof data[loc][ns][ns] === "object" && !Array.isArray(data[loc][ns][ns])) {
      // Allow string values like safety.safety = "Safety"
      console.log("  DOUBLE-NESTED: " + loc + "." + ns + "." + ns + " (" + Object.keys(data[loc][ns][ns]).length + " keys)");
      nestingIssues++;
    }
  }
}
if (nestingIssues === 0) console.log("  No double-nesting bugs found.");
totalIssues += nestingIssues;

// Check 2: Key count comparison per namespace
console.log("\n--- Check 2: Key counts per namespace ---");
var keyCountIssues = 0;
for (var ns of namespaces) {
  var enCount = Object.keys(en[ns]).length;
  var mismatches = [];
  for (var loc of locales) {
    if (loc === reference) continue;
    if (!data[loc][ns]) {
      mismatches.push(loc + "=MISSING");
    } else {
      var locCount = Object.keys(data[loc][ns]).length;
      if (locCount !== enCount) {
        mismatches.push(loc + "=" + locCount);
      }
    }
  }
  if (mismatches.length > 0) {
    console.log("  " + ns + " (en=" + enCount + "): " + mismatches.join(", "));
    keyCountIssues++;
  }
}
if (keyCountIssues === 0) console.log("  All namespace key counts match English.");
totalIssues += keyCountIssues;

// Check 3: Missing leaf keys (deep comparison for top namespaces)
console.log("\n--- Check 3: Missing leaf keys (deep comparison) ---");
var leafIssues = 0;
for (var ns of namespaces) {
  var enLeafKeys = getLeafKeys(en[ns]);
  for (var loc of locales) {
    if (loc === reference) continue;
    if (!data[loc][ns]) continue;
    var locLeafKeys = getLeafKeys(data[loc][ns]);
    var locKeySet = new Set(locLeafKeys);
    var missing = enLeafKeys.filter(function(k) { return !locKeySet.has(k); });
    if (missing.length > 0) {
      console.log("  " + loc + "." + ns + ": " + missing.length + " missing keys");
      if (missing.length <= 10) {
        missing.forEach(function(k) { console.log("    - " + k); });
      } else {
        missing.slice(0, 5).forEach(function(k) { console.log("    - " + k); });
        console.log("    ... and " + (missing.length - 5) + " more");
      }
      leafIssues++;
    }
  }
}
if (leafIssues === 0) console.log("  All leaf keys present in all locales.");
totalIssues += leafIssues;

// Check 4: Namespaces in non-en locales that don't exist in English
console.log("\n--- Check 4: Extra namespaces not in English ---");
var extraNsIssues = 0;
for (var loc of locales) {
  if (loc === reference) continue;
  var locNs = Object.keys(data[loc]);
  var extras = locNs.filter(function(k) { return namespaces.indexOf(k) < 0; });
  if (extras.length > 0) {
    console.log("  " + loc + ": extra namespaces: " + extras.join(", "));
    extraNsIssues++;
  }
}
if (extraNsIssues === 0) console.log("  No extra namespaces found.");
totalIssues += extraNsIssues;

console.log("\n=== Summary ===");
if (totalIssues === 0) {
  console.log("All checks passed. No issues found.");
} else {
  console.log(totalIssues + " issue(s) found. Review above.");
}
