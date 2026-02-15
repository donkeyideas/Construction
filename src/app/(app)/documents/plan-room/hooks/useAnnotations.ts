"use client";

import { useState, useCallback } from "react";

export interface AnnotationRow {
  id: string;
  company_id?: string;
  document_id: string;
  page_number: number;
  annotation_type: "line" | "rectangle" | "circle" | "text" | "arrow" | "cloud";
  color: string;
  stroke_width: number;
  geometry: { x1: number; y1: number; x2?: number; y2?: number };
  text_content: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

type UndoAction =
  | { type: "add"; annotation: AnnotationRow }
  | { type: "delete"; annotation: AnnotationRow }
  | { type: "update"; annotationId: string; prev: Partial<AnnotationRow>; next: Partial<AnnotationRow> };

interface UseAnnotationsOptions {
  companyId: string;
  userId: string;
  userName: string;
}

export function useAnnotations({ companyId, userId, userName }: UseAnnotationsOptions) {
  const [annotations, setAnnotations] = useState<AnnotationRow[]>([]);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchAnnotations = useCallback(async (documentId: string, page?: number) => {
    try {
      const url = `/api/documents/plan-room/${documentId}/annotations${page ? `?page=${page}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setAnnotations(data.annotations || []);
    } catch {
      // silently fail
    }
  }, []);

  const addAnnotation = useCallback(
    async (annotation: Omit<AnnotationRow, "id" | "created_at" | "updated_at" | "created_by" | "created_by_name">) => {
      // Optimistic local add with temp id
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const localAnnotation: AnnotationRow = {
        ...annotation,
        id: tempId,
        company_id: companyId,
        created_by: userId,
        created_by_name: userName,
        created_at: now,
        updated_at: now,
      };
      setAnnotations((prev) => [...prev, localAnnotation]);
      setRedoStack([]);

      try {
        const res = await fetch(`/api/documents/plan-room/${annotation.document_id}/annotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_number: annotation.page_number,
            annotation_type: annotation.annotation_type,
            color: annotation.color,
            stroke_width: annotation.stroke_width,
            geometry: annotation.geometry,
            text_content: annotation.text_content,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const saved = data.annotation as AnnotationRow;
          // Replace temp with real
          setAnnotations((prev) =>
            prev.map((a) => (a.id === tempId ? { ...saved, created_by_name: userName } : a))
          );
          setUndoStack((prev) => [
            ...prev,
            { type: "add", annotation: { ...saved, created_by_name: userName } },
          ]);
          return saved;
        }
      } catch {
        // Revert on failure
        setAnnotations((prev) => prev.filter((a) => a.id !== tempId));
      }
      return null;
    },
    [companyId, userId, userName]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      const existing = annotations.find((a) => a.id === annotationId);
      if (!existing) return;

      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      setSelectedId(null);
      setRedoStack([]);
      setUndoStack((prev) => [...prev, { type: "delete", annotation: existing }]);

      try {
        await fetch(
          `/api/documents/plan-room/${existing.document_id}/annotations/${annotationId}`,
          { method: "DELETE" }
        );
      } catch {
        // Revert on failure
        setAnnotations((prev) => [...prev, existing]);
      }
    },
    [annotations]
  );

  const updateAnnotation = useCallback(
    async (annotationId: string, updates: Partial<AnnotationRow>) => {
      const existing = annotations.find((a) => a.id === annotationId);
      if (!existing) return;

      const prev: Partial<AnnotationRow> = {};
      for (const key of Object.keys(updates) as (keyof AnnotationRow)[]) {
        (prev as Record<string, unknown>)[key] = existing[key];
      }

      setAnnotations((all) =>
        all.map((a) => (a.id === annotationId ? { ...a, ...updates } : a))
      );
      setRedoStack([]);
      setUndoStack((s) => [...s, { type: "update", annotationId, prev, next: updates }]);

      try {
        await fetch(
          `/api/documents/plan-room/${existing.document_id}/annotations/${annotationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }
        );
      } catch {
        // Revert
        setAnnotations((all) =>
          all.map((a) => (a.id === annotationId ? { ...a, ...prev } : a))
        );
      }
    },
    [annotations]
  );

  const undo = useCallback(async () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;

    setUndoStack((s) => s.slice(0, -1));

    if (action.type === "add") {
      // Undo add → delete
      setAnnotations((prev) => prev.filter((a) => a.id !== action.annotation.id));
      setRedoStack((s) => [...s, action]);
      try {
        await fetch(
          `/api/documents/plan-room/${action.annotation.document_id}/annotations/${action.annotation.id}`,
          { method: "DELETE" }
        );
      } catch {
        /* ignore */
      }
    } else if (action.type === "delete") {
      // Undo delete → re-create
      setAnnotations((prev) => [...prev, action.annotation]);
      setRedoStack((s) => [...s, action]);
      try {
        await fetch(`/api/documents/plan-room/${action.annotation.document_id}/annotations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_number: action.annotation.page_number,
            annotation_type: action.annotation.annotation_type,
            color: action.annotation.color,
            stroke_width: action.annotation.stroke_width,
            geometry: action.annotation.geometry,
            text_content: action.annotation.text_content,
          }),
        });
      } catch {
        /* ignore */
      }
    } else if (action.type === "update") {
      // Undo update → revert
      setAnnotations((all) =>
        all.map((a) => (a.id === action.annotationId ? { ...a, ...action.prev } : a))
      );
      setRedoStack((s) => [...s, action]);
    }
  }, [undoStack]);

  const redo = useCallback(async () => {
    const action = redoStack[redoStack.length - 1];
    if (!action) return;

    setRedoStack((s) => s.slice(0, -1));

    if (action.type === "add") {
      setAnnotations((prev) => [...prev, action.annotation]);
      setUndoStack((s) => [...s, action]);
    } else if (action.type === "delete") {
      setAnnotations((prev) => prev.filter((a) => a.id !== action.annotation.id));
      setUndoStack((s) => [...s, action]);
    } else if (action.type === "update") {
      setAnnotations((all) =>
        all.map((a) => (a.id === action.annotationId ? { ...a, ...action.next } : a))
      );
      setUndoStack((s) => [...s, action]);
    }
  }, [redoStack]);

  // Remote sync methods (for realtime events from other users)
  const mergeRemoteAnnotation = useCallback((annotation: AnnotationRow) => {
    setAnnotations((prev) => {
      if (prev.some((a) => a.id === annotation.id)) return prev;
      return [...prev, annotation];
    });
  }, []);

  const removeRemoteAnnotation = useCallback((annotationId: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
  }, []);

  const updateRemoteAnnotation = useCallback((annotation: AnnotationRow) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotation.id ? { ...a, ...annotation } : a))
    );
  }, []);

  return {
    annotations,
    selectedId,
    setSelectedId,
    fetchAnnotations,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    mergeRemoteAnnotation,
    removeRemoteAnnotation,
    updateRemoteAnnotation,
  };
}
