"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";

interface PhotosClientProps {
  projects: Array<{ id: string; name: string; code: string }>;
}

export default function PhotosClient({ projects }: PhotosClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProject, setSelectedProject] = useState(
    projects.length > 0 ? projects[0].id : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload to Supabase Storage via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "photo");
      if (selectedProject) {
        formData.append("project_id", selectedProject);
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to upload photo.");
        return;
      }

      setSuccess("Photo uploaded successfully.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <>
      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="photo-project">
            Tag to Project
          </label>
          <select
            id="photo-project"
            className="mobile-form-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Camera Capture */}
      <label className="photo-upload-btn">
        {loading ? (
          <>
            <Upload size={28} />
            Uploading...
          </>
        ) : (
          <>
            <Camera size={28} />
            Take Photo or Choose from Gallery
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={loading}
        />
      </label>

      {error && (
        <p
          style={{
            color: "var(--color-red)",
            fontSize: "0.8rem",
            textAlign: "center",
            marginBottom: "12px",
          }}
        >
          {error}
        </p>
      )}

      {success && (
        <p
          style={{
            color: "var(--color-green)",
            fontSize: "0.8rem",
            textAlign: "center",
            marginBottom: "12px",
          }}
        >
          {success}
        </p>
      )}
    </>
  );
}
