"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Camera, Upload, Loader2, MapPin, X } from "lucide-react";

export interface PhotoEntry {
  url: string;
  caption: string;
  taken_at: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface PhotoUploaderProps {
  photos: PhotoEntry[];
  onChange: (photos: PhotoEntry[]) => void;
  storageBucket?: string;
  storagePath?: string;
  maxPhotos?: number;
  disabled?: boolean;
}

export default function PhotoUploader({
  photos,
  onChange,
  storageBucket = "photos",
  storagePath = "uploads",
  maxPhotos = 20,
  disabled = false,
}: PhotoUploaderProps) {
  const t = useTranslations("common");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function getGpsPosition(): Promise<{ lat: number; lon: number } | null> {
    if (!navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      setError(t("photoUploader.maxPhotosAllowed", { max: maxPhotos }));
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError("");

    try {
      const gps = await getGpsPosition();
      const newPhotos: PhotoEntry[] = [];

      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) continue;

        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", storageBucket);
        fd.append("path", storagePath);

        const res = await fetch("/api/upload/photo", { method: "POST", body: fd });

        if (res.ok) {
          const data = await res.json();
          newPhotos.push({
            url: data.url,
            caption: "",
            taken_at: new Date().toISOString(),
            latitude: gps?.lat ?? null,
            longitude: gps?.lon ?? null,
          });
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || t("photoUploader.uploadFailed"));
        }
      }

      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos]);
      }
    } catch {
      setError(t("photoUploader.failedToUpload"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateCaption(index: number, caption: string) {
    const updated = photos.map((p, i) => (i === index ? { ...p, caption } : p));
    onChange(updated);
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      {/* Upload area */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {uploading ? <Loader2 size={16} className="spin-icon" /> : <Camera size={16} />}
          {uploading ? t("photoUploader.uploading") : t("photoUploader.addPhotos")}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFiles}
            disabled={disabled || uploading}
            style={{ display: "none" }}
          />
        </label>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Upload size={16} />
          {t("photoUploader.uploadFromDevice")}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            disabled={disabled || uploading}
            style={{ display: "none" }}
          />
        </label>
        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          {t("photoUploader.photoCount", { count: photos.length, max: maxPhotos })}
        </span>
      </div>

      {error && (
        <div style={{ fontSize: "0.82rem", color: "var(--color-red)", marginBottom: "8px" }}>{error}</div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
          {photos.map((photo, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              <img
                src={photo.url}
                alt={photo.caption || t("photoUploader.photoAlt", { number: idx + 1 })}
                style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
              />
              {/* GPS badge */}
              {photo.latitude && photo.longitude && (
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: "0.65rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <MapPin size={10} /> {t("photoUploader.gps")}
                </div>
              )}
              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0",
                  }}
                >
                  <X size={12} />
                </button>
              )}
              {/* Caption input */}
              <input
                type="text"
                placeholder={t("photoUploader.addCaption")}
                value={photo.caption}
                onChange={(e) => updateCaption(idx, e.target.value)}
                disabled={disabled}
                style={{
                  width: "100%",
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  padding: "6px 8px",
                  fontSize: "0.75rem",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  outline: "none",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
