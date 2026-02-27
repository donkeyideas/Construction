"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Property Name", required: true },
  { key: "property_type", label: "Type (residential/commercial/industrial/mixed_use)", required: false },
  { key: "address_line1", label: "Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "zip", label: "ZIP", required: false },
  { key: "year_built", label: "Year Built", required: false, type: "number" },
  { key: "total_sqft", label: "Total Sq Ft", required: false, type: "number" },
  { key: "total_units", label: "Total Units", required: false, type: "number" },
  { key: "purchase_price", label: "Purchase Price ($)", required: false, type: "number" },
  { key: "current_value", label: "Current Value ($)", required: false, type: "number" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { name: "Sunset Ridge Apartments", property_type: "residential", address_line1: "1200 Sunset Blvd", city: "Austin", state: "TX", zip: "78701", year_built: "2018", total_sqft: "45000", total_units: "24", purchase_price: "4200000", current_value: "5100000" },
  { name: "Congress Ave Office Park", property_type: "commercial", address_line1: "500 Congress Ave", city: "Austin", state: "TX", zip: "78701", year_built: "2010", total_sqft: "32000", total_units: "8", purchase_price: "6800000", current_value: "7500000" },
];

export default function PropertiesImport() {
  const router = useRouter();
  const t = useTranslations("properties");
  const [showImport, setShowImport] = useState(false);

  async function handleImport(importRows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "properties", rows: importRows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("import.importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <>
      <button className="ui-btn ui-btn-md ui-btn-secondary" onClick={() => setShowImport(true)}>
        <Upload size={16} />
        {t("import.importCsv")}
      </button>
      {showImport && (
        <ImportModal
          entityName={t("import.properties")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}
