"use client";

import { useState, useCallback } from "react";

export type ZoomPreset = "fit" | 0.5 | 1 | 2;

interface PdfViewerState {
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  pageDimensions: { width: number; height: number } | null;
}

export function usePdfViewer() {
  const [state, setState] = useState<PdfViewerState>({
    currentPage: 1,
    totalPages: 0,
    zoomLevel: 1,
    pageDimensions: null,
  });

  const setTotalPages = useCallback((n: number) => {
    setState((s) => ({ ...s, totalPages: n }));
  }, []);

  const setPageDimensions = useCallback((width: number, height: number) => {
    setState((s) => ({ ...s, pageDimensions: { width, height } }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setState((s) => ({
      ...s,
      currentPage: Math.max(1, Math.min(page, s.totalPages || 1)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState((s) => ({
      ...s,
      currentPage: Math.min(s.currentPage + 1, s.totalPages || 1),
    }));
  }, []);

  const prevPage = useCallback(() => {
    setState((s) => ({
      ...s,
      currentPage: Math.max(s.currentPage - 1, 1),
    }));
  }, []);

  const setZoom = useCallback((level: number) => {
    setState((s) => ({ ...s, zoomLevel: Math.max(0.25, Math.min(level, 4)) }));
  }, []);

  const setZoomPreset = useCallback(
    (preset: ZoomPreset, containerWidth?: number, containerHeight?: number) => {
      if (preset === "fit") {
        // Fit to container
        setState((s) => {
          if (!s.pageDimensions || !containerWidth || !containerHeight) {
            return { ...s, zoomLevel: 1 };
          }
          const scaleX = (containerWidth - 48) / s.pageDimensions.width;
          const scaleY = (containerHeight - 48) / s.pageDimensions.height;
          return { ...s, zoomLevel: Math.min(scaleX, scaleY, 2) };
        });
      } else {
        setState((s) => ({ ...s, zoomLevel: preset }));
      }
    },
    []
  );

  const resetForNewDoc = useCallback(() => {
    setState({
      currentPage: 1,
      totalPages: 0,
      zoomLevel: 1,
      pageDimensions: null,
    });
  }, []);

  return {
    ...state,
    setTotalPages,
    setPageDimensions,
    goToPage,
    nextPage,
    prevPage,
    setZoom,
    setZoomPreset,
    resetForNewDoc,
  };
}
