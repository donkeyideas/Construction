"use client";

import { useState } from "react";
import { Pencil, Check, X, RotateCcw } from "lucide-react";

interface NarrativeEditorProps {
  text: string;
  onChange: (text: string) => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export function NarrativeEditor({
  text,
  onChange,
  onRegenerate,
  isGenerating,
}: NarrativeEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  if (isGenerating) {
    return (
      <div className="generating-indicator">
        <div className="generating-spinner" />
        Generating narrative with AI...
      </div>
    );
  }

  if (!text) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="narrative-editor">
        <textarea
          className="narrative-textarea"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={6}
        />
        <div className="narrative-actions">
          <button
            className="narrative-edit-btn"
            onClick={() => {
              onChange(editText);
              setIsEditing(false);
            }}
            type="button"
          >
            <Check size={12} /> Save
          </button>
          <button
            className="narrative-edit-btn"
            onClick={() => {
              setEditText(text);
              setIsEditing(false);
            }}
            type="button"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="narrative-editor">
      <div className="narrative-text">{text}</div>
      <div className="narrative-actions">
        <button
          className="narrative-edit-btn"
          onClick={() => {
            setEditText(text);
            setIsEditing(true);
          }}
          type="button"
        >
          <Pencil size={12} /> Edit
        </button>
        {onRegenerate && (
          <button
            className="narrative-edit-btn"
            onClick={onRegenerate}
            type="button"
          >
            <RotateCcw size={12} /> Regenerate
          </button>
        )}
      </div>
    </div>
  );
}
