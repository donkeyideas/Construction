#!/usr/bin/env node
/**
 * Add any missing translation keys that agents referenced but didn't create.
 */
const fs = require("fs");
const path = require("path");
const messagesDir = path.join(__dirname, "..", "messages");
const locales = ["en", "es", "pt-BR", "fr", "ar", "de", "hi", "zh"];

const fixKeys = {
  safety: {
    totalIncidents: {
      en: "Total Incidents", es: "Total de Incidentes", "pt-BR": "Total de Incidentes",
      fr: "Total des Incidents", ar: "إجمالي الحوادث", de: "Vorfälle gesamt",
      hi: "कुल घटनाएं", zh: "事故总数",
    },
  },
};

for (const locale of locales) {
  const fp = path.join(messagesDir, locale + ".json");
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  let added = 0;

  for (const [ns, keys] of Object.entries(fixKeys)) {
    if (!data[ns]) data[ns] = {};
    for (const [key, translations] of Object.entries(keys)) {
      if (!(key in data[ns])) {
        data[ns][key] = translations[locale] || translations["en"];
        added++;
      }
    }
  }

  if (added > 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`${locale}: added ${added} missing keys`);
  } else {
    console.log(`${locale}: no missing keys`);
  }
}

console.log("\nDone.");
