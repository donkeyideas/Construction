"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";
import "@/styles/vendor-detail.css";

export default function UploadCertClient() {
  const router = useRouter();
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
      setMessage({ type: "error", text: "Please select a file to upload." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", form.cert_name || file.name);
      formData.append("category", "certification");

      const res = await fetch("/api/vendor/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload document");
      }

      setMessage({ type: "success", text: "Document uploaded successfully." });
      setForm({ cert_name: "", cert_type: "insurance", expiry_date: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";

      setTimeout(() => router.push("/vendor/compliance"), 1500);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Link href="/vendor/compliance" className="vd-back">
        <ArrowLeft size={16} /> Back to Compliance
      </Link>

      <div className="vd-header">
        <div className="vd-header-left">
          <h2>Upload Document</h2>
          <span className="vd-header-sub">Upload a certification or compliance document</span>
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
              <label className="vd-form-label">Document Name</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.cert_name}
                onChange={(e) => setForm({ ...form, cert_name: e.target.value })}
                placeholder="e.g. General Liability Insurance"
                required
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">Document Type</label>
              <select
                className="vd-form-select"
                value={form.cert_type}
                onChange={(e) => setForm({ ...form, cert_type: e.target.value })}
              >
                <option value="insurance">Insurance Certificate</option>
                <option value="license">License</option>
                <option value="w9">W-9</option>
                <option value="bond">Bond</option>
                <option value="safety">Safety Certification</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">Expiry Date</label>
              <input
                type="date"
                className="vd-form-input"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
            <div className="vd-form-group vd-form-full">
              <label className="vd-form-label">File</label>
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
                    <span className="vd-upload-link">Click to upload</span> or drag and drop
                    <br />
                    PDF, PNG, or JPG up to 10MB
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="vd-form-actions">
            <Link href="/vendor/compliance" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={uploading || !file}>
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
