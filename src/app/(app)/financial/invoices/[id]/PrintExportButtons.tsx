"use client";

import { Printer } from "lucide-react";

interface Props {
  invoiceId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function PrintExportButtons({ invoiceId }: Props) {
  return (
    <button
      className="ui-btn ui-btn-outline ui-btn-md"
      type="button"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Print
    </button>
  );
}
