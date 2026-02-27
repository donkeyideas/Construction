"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  FileQuestion,
  Files,
  Check,
  X,
} from "lucide-react";
import type { DocumentFolderRow } from "@/lib/queries/documents";

interface FolderTreeProps {
  folders: DocumentFolderRow[];
  selectedFolderId: string | null; // null = "All Documents", "unfiled" = unfiled
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null, color?: string) => void;
}

interface TreeNode {
  folder: DocumentFolderRow;
  children: TreeNode[];
}

function buildTree(folders: DocumentFolderRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  for (const f of folders) {
    map.set(f.id, { folder: f, children: [] });
  }

  // Build tree
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const FOLDER_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
];

function FolderNodeItem({
  node,
  depth,
  selectedFolderId,
  onSelectFolder,
  expandedIds,
  toggleExpanded,
}: {
  node: TreeNode;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.folder.id);
  const isSelected = selectedFolderId === node.folder.id;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className={`folder-item ${isSelected ? "folder-item-selected" : ""}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelectFolder(node.folder.id)}
      >
        {hasChildren ? (
          <button
            className="folder-item-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.folder.id);
            }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="folder-item-toggle-placeholder" />
        )}
        <span
          className="folder-item-dot"
          style={{ background: node.folder.color || "#6366f1" }}
        />
        {isSelected ? <FolderOpen size={14} /> : <Folder size={14} />}
        <span className="folder-item-name">{node.folder.name}</span>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <FolderNodeItem
            key={child.folder.id}
            node={child}
            depth={depth + 1}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
          />
        ))}
    </>
  );
}

export default function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
}: FolderTreeProps) {
  const t = useTranslations("documents");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#6366f1");

  const tree = buildTree(folders);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed, null, newFolderColor);
    setNewFolderName("");
    setNewFolderColor("#6366f1");
    setShowNewFolder(false);
  };

  return (
    <div className="folder-tree">
      <div className="folder-tree-header">
        <span className="folder-tree-title">{t("planRoom.folderTree.folders")}</span>
        <button
          className="folder-tree-add-btn"
          onClick={() => setShowNewFolder(!showNewFolder)}
          title={t("planRoom.folderTree.newFolder")}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* New folder inline form */}
      {showNewFolder && (
        <div className="folder-tree-new">
          <div className="folder-tree-new-row">
            <input
              className="folder-tree-new-input"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t("planRoom.folderTree.folderNamePlaceholder")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
            />
            <button
              className="folder-tree-new-confirm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              <Check size={12} />
            </button>
            <button
              className="folder-tree-new-cancel"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
            >
              <X size={12} />
            </button>
          </div>
          <div className="folder-tree-color-row">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                className={`folder-tree-color-btn ${newFolderColor === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setNewFolderColor(c)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Documents */}
      <div
        className={`folder-item ${selectedFolderId === null ? "folder-item-selected" : ""}`}
        style={{ paddingLeft: "12px" }}
        onClick={() => onSelectFolder(null)}
      >
        <span className="folder-item-toggle-placeholder" />
        <Files size={14} />
        <span className="folder-item-name">{t("planRoom.folderTree.allDocuments")}</span>
      </div>

      {/* Unfiled */}
      <div
        className={`folder-item ${selectedFolderId === "unfiled" ? "folder-item-selected" : ""}`}
        style={{ paddingLeft: "12px" }}
        onClick={() => onSelectFolder("unfiled")}
      >
        <span className="folder-item-toggle-placeholder" />
        <FileQuestion size={14} />
        <span className="folder-item-name">{t("planRoom.folderTree.unfiled")}</span>
      </div>

      {/* Folder tree */}
      {tree.map((node) => (
        <FolderNodeItem
          key={node.folder.id}
          node={node}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          expandedIds={expandedIds}
          toggleExpanded={toggleExpanded}
        />
      ))}

      {folders.length === 0 && !showNewFolder && (
        <div className="folder-tree-empty">
          {t("planRoom.folderTree.noFolders")}
        </div>
      )}
    </div>
  );
}
