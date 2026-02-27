"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

export default function ResetCompanyButton() {
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-company", { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        const deleted = data.results?.filter((r: { deleted: number }) => r.deleted > 0) ?? [];
        const summary = deleted.map((r: { table: string; deleted: number }) => `${r.table}: ${r.deleted}`).join(", ");
        alert(`${t("resetCompany.allDataDeleted")}\n\n${summary || t("resetCompany.noDataFound")}`);
        window.location.reload();
      } else {
        alert(`${t("resetCompany.error")}: ${data.error}`);
      }
    } catch {
      alert(t("resetCompany.networkError"));
    } finally {
      setLoading(false);
      setConfirmed(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="ui-btn ui-btn-md"
        style={{
          background: confirmed ? "var(--color-red)" : "rgba(239, 68, 68, 0.1)",
          color: confirmed ? "#fff" : "var(--color-red)",
          border: "1px solid var(--color-red)",
        }}
      >
        <Trash2 size={16} />
        {loading ? t("resetCompany.deleting") : confirmed ? t("resetCompany.clickAgainToConfirm") : t("resetCompany.deleteAllCompanyData")}
      </button>
      {confirmed && (
        <button
          onClick={() => setConfirmed(false)}
          className="ui-btn ui-btn-sm ui-btn-secondary"
        >
          {t("resetCompany.cancel")}
        </button>
      )}
    </div>
  );
}
