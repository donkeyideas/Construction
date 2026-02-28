"use client";

import { Printer, Download } from "lucide-react";

interface Props {
  invoiceId: string;
}

export default function PrintExportButtons({ invoiceId }: Props) {
  const printUrl = `/financial/invoices/${invoiceId}/print`;

  function handlePrint() {
    window.open(printUrl, "_blank");
  }

  function handleExportPdf() {
    window.open(`${printUrl}?autoPrint=1`, "_blank");
  }

  return (
    <>
      <button
        className="ui-btn ui-btn-outline ui-btn-md"
        type="button"
        onClick={handlePrint}
      >
        <Printer size={16} />
        Print
      </button>
      <button
        className="ui-btn ui-btn-outline ui-btn-md"
        type="button"
        onClick={handleExportPdf}
      >
        <Download size={16} />
        Export PDF
      </button>
    </>
  );
}
