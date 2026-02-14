"use client";

import { useState } from "react";
import { X, MapPin, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { PhotoEntry } from "./PhotoUploader";

interface PhotoGalleryProps {
  photos: PhotoEntry[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  function openLightbox(idx: number) {
    setLightboxIndex(idx);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function prev() {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1);
  }

  function next() {
    if (lightboxIndex === null) return;
    setLightboxIndex(lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0);
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
        {photos.map((photo, idx) => (
          <div
            key={idx}
            onClick={() => openLightbox(idx)}
            style={{
              position: "relative",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${idx + 1}`}
              style={{ width: "100%", height: "100px", objectFit: "cover", display: "block" }}
            />
            <div
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: "4px",
                padding: "2px",
                color: "#fff",
                fontSize: "0",
              }}
            >
              <Maximize2 size={12} />
            </div>
            {photo.latitude && photo.longitude && (
              <div
                style={{
                  position: "absolute",
                  bottom: "4px",
                  left: "4px",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: "0.6rem",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <MapPin size={8} /> GPS
              </div>
            )}
            {photo.caption && (
              <div style={{ padding: "4px 6px", fontSize: "0.7rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {photo.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          onClick={closeLightbox}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0",
            }}
          >
            <X size={24} />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0",
                }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0",
                }}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", maxWidth: "90vw", maxHeight: "90vh" }}>
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || ""}
              style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: "8px" }}
            />
            <div style={{ color: "#fff", marginTop: "12px", fontSize: "0.9rem" }}>
              {photos[lightboxIndex].caption && (
                <div style={{ marginBottom: "4px" }}>{photos[lightboxIndex].caption}</div>
              )}
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                {lightboxIndex + 1} of {photos.length}
                {photos[lightboxIndex].taken_at && (
                  <> &middot; {new Date(photos[lightboxIndex].taken_at).toLocaleString()}</>
                )}
                {photos[lightboxIndex].latitude && photos[lightboxIndex].longitude && (
                  <> &middot; <MapPin size={10} style={{ display: "inline", verticalAlign: "middle" }} /> {photos[lightboxIndex].latitude?.toFixed(4)}, {photos[lightboxIndex].longitude?.toFixed(4)}</>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
