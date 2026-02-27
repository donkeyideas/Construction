"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import "@/styles/vendor-detail.css";

export default function UploadCertClient() {
  const router = useRouter();
  const t = useTranslations("vendor");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    cert_name: "",
    cert_type: "insurance",
    expiry_date: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "error", text: t("upload.selectFileError") });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_name", form.cert_name || file.name);
      formData.append("doc_type", "compliance");
      formData.append("cert_type", form.cert_type);
      if (form.expiry_date) formData.append("expiry_date", form.expiry_date);

      const res = await fetch("/api/vendor/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload document");
      }

      setMessage({ type: "success", text: t("upload.successMessage") });
      setForm({ cert_name: "", cert_type: "insurance", expiry_date: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";

      setTimeout(() => router.push("/vendor/compliance"), 1500);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t("upload.uploadFailed") });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Link href="/vendor/compliance" className="vd-back">
        <ArrowLeft size={16} /> {t("upload.backToCompliance")}
      </Link>

      <div className="vd-header">
        <div className="vd-header-left">
          <h2>{t("uploadTitle")}</h2>
          <span className="vd-header-sub">{t("upload.subtitle")}</span>
        </div>
      </div>

      {message && (
        <div className={`vd-msg ${message.type === "success" ? "vd-msg-success" : "vd-msg-error"}`}>
          {message.text}
        </div>
      )}

      <div className="vd-section">
        <form onSubmit={handleSubmit}>
          <div className="vd-profile-form">
            <div className="vd-form-group">
              <label className="vd-form-label">{t("upload.documentName")}</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.cert_name}
                onChange={(e) => setForm({ ...form, cert_name: e.target.value })}
                placeholder={t("upload.documentNamePlaceholder")}
                required
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">{t("upload.documentType")}</label>
              <select
                className="vd-form-select"
                value={form.cert_type}
                onChange={(e) => setForm({ ...form, cert_type: e.target.value })}
              >
                <option value="insurance">{t("upload.typeInsurance")}</option>
                <option value="license">{t("upload.typeLicense")}</option>
                <option value="w9">{t("upload.typeW9")}</option>
                <option value="bond">{t("upload.typeBond")}</option>
                <option value="safety">{t("upload.typeSafety")}</option>
                <option value="other">{t("upload.typeOther")}</option>
              </select>
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">{t("upload.expiryDate")}</label>
              <input
                type="date"
                className="vd-form-input"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
            <div className="vd-form-group vd-form-full">
              <label className="vd-form-label">{t("upload.file")}</label>
              <div
                className="vd-upload-area"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                {file ? (
                  <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                ) : (
                  <span>
                    <span className="vd-upload-link">{t("upload.clickToUpload")}</span> {t("upload.orDragDrop")}
                    <br />
                    {t("upload.fileHint")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="vd-form-actions">
            <Link href="/vendor/compliance" className="btn-secondary">
              {t("cancel")}
            </Link>
            <button type="submit" className="btn-primary" disabled={uploading || !file}>
              <Upload size={16} />
              {uploading ? t("upload.uploading") : t("uploadTitle")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
