"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Image,
  FileText,
  Stamp,
  Layout,
  File,
  Eye,
  X,
} from "lucide-react";
import type { AssetLibraryRow } from "@/lib/queries/documents";

interface AssetLibraryProps {
  assets: AssetLibraryRow[];
  onUploadAsset: (file: File, name: string, assetType: string) => void;
}

const ASSET_TABS = [
  { value: "all", label: "All" },
  { value: "logo", label: "Logos" },
  { value: "standard_detail", label: "Std Details" },
  { value: "template", label: "Templates" },
  { value: "stamp", label: "Stamps" },
  { value: "photo", label: "Photos" },
  { value: "general", label: "General" },
];

function getAssetIcon(assetType: string) {
  switch (assetType) {
    case "logo":
      return Image;
    case "standard_detail":
      return Layout;
    case "template":
      return FileText;
    case "stamp":
      return Stamp;
    case "photo":
      return Image;
    default:
      return File;
  }
}

export default function AssetLibrary({
  assets,
  onUploadAsset,
}: AssetLibraryProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [previewAsset, setPreviewAsset] = useState<AssetLibraryRow | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered =
    activeTab === "all"
      ? assets
      : assets.filter((a) => a.asset_type === activeTab);

  const handleUpload = () => {
    if (!uploadFile) return;
    onUploadAsset(
      uploadFile,
      uploadName.trim() || uploadFile.name.replace(/\.[^/.]+$/, ""),
      uploadType
    );
    setUploadFile(null);
    setUploadName("");
    setUploadType("general");
    setShowUpload(false);
  };

  return (
    <div className="asset-library">
      <div className="asset-library-header">
        <span className="asset-library-title">Asset Library</span>
        <button
          className="asset-library-upload-btn"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Upload size={12} />
          Upload
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="asset-library-upload-form">
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.svg,.dwg,.dxf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setUploadFile(f);
                if (!uploadName) {
                  setUploadName(f.name.replace(/\.[^/.]+$/, ""));
                }
              }
            }}
          />
          <div
            className={`asset-library-dropzone ${uploadFile ? "has-file" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadFile ? (
              <span className="asset-library-dropzone-file">{uploadFile.name}</span>
            ) : (
              <>
                <Upload size={16} />
                <span>Click to select file</span>
              </>
            )}
          </div>
          <input
            className="asset-library-input"
            type="text"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="Asset name..."
          />
          <select
            className="asset-library-select"
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
          >
            <option value="general">General</option>
            <option value="logo">Logo</option>
            <option value="standard_detail">Standard Detail</option>
            <option value="template">Template</option>
            <option value="stamp">Stamp</option>
            <option value="photo">Photo</option>
          </select>
          <div className="asset-library-upload-actions">
            <button
              className="plan-room-btn-primary"
              style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              onClick={handleUpload}
              disabled={!uploadFile}
            >
              Upload Asset
            </button>
            <button
              className="plan-room-btn-secondary"
              style={{ fontSize: "0.75rem", padding: "5px 12px" }}
              onClick={() => {
                setShowUpload(false);
                setUploadFile(null);
                setUploadName("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="asset-library-tabs">
        {ASSET_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`asset-library-tab ${activeTab === tab.value ? "active" : ""}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="asset-library-empty">
          <File size={24} />
          <p>No assets{activeTab !== "all" ? ` of type "${activeTab}"` : ""}</p>
        </div>
      ) : (
        <div className="asset-grid">
          {filtered.map((asset) => {
            const Icon = getAssetIcon(asset.asset_type);
            return (
              <div
                key={asset.id}
                className="asset-card"
                onClick={() => setPreviewAsset(asset)}
              >
                <div className="asset-card-preview">
                  {asset.thumbnail_url ? (
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.name}
                      className="asset-card-img"
                    />
                  ) : (
                    <Icon size={24} />
                  )}
                </div>
                <div className="asset-card-name" title={asset.name}>
                  {asset.name}
                </div>
                <div className="asset-card-type">{asset.asset_type.replace("_", " ")}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {previewAsset && (
        <div
          className="plan-room-modal-overlay"
          onClick={() => setPreviewAsset(null)}
        >
          <div
            className="plan-room-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="plan-room-modal-header">
              <h3>{previewAsset.name}</h3>
              <button
                className="plan-room-modal-close"
                onClick={() => setPreviewAsset(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="plan-room-modal-body">
              <div className="asset-preview-content">
                {previewAsset.thumbnail_url ? (
                  <img
                    src={previewAsset.thumbnail_url}
                    alt={previewAsset.name}
                    style={{ maxWidth: "100%", borderRadius: "8px" }}
                  />
                ) : (
                  <div className="asset-preview-placeholder">
                    <Eye size={32} />
                    <p>Preview not available</p>
                  </div>
                )}
              </div>
              {previewAsset.description && (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "12px" }}>
                  {previewAsset.description}
                </p>
              )}
              <div className="asset-preview-meta">
                <span>Type: {previewAsset.asset_type.replace("_", " ")}</span>
                {previewAsset.tags && previewAsset.tags.length > 0 && (
                  <span>Tags: {previewAsset.tags.join(", ")}</span>
                )}
                <span>Used {previewAsset.usage_count} time{previewAsset.usage_count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
