"use client";

import { Printer, Download } from "lucide-react";

export default function PrintExportButtons() {
  return (
    <>
      <button
        className="ui-btn ui-btn-outline ui-btn-md"
        type="button"
        onClick={() => window.print()}
      >
        <Printer size={16} />
        Print
      </button>
      <button
        className="ui-btn ui-btn-outline ui-btn-md"
        type="button"
        onClick={() => {
          // Opens browser print dialog — user can choose "Save as PDF" destination
          window.print();
        }}
      >
        <Download size={16} />
        Export PDF
      </button>
    </>
  );
}
