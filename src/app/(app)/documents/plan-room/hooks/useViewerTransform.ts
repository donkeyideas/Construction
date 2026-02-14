"use client";

import { useCallback } from "react";

/**
 * Converts between screen coordinates (mouse position relative to SVG)
 * and normalized PDF coordinates (0-1 range).
 */
export function useViewerTransform(
  pageWidth: number,
  pageHeight: number,
  scale: number
) {
  /** Convert screen pixel coords (relative to SVG element) to normalized 0-1 coords */
  const screenToNormalized = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: screenX / (pageWidth * scale),
        y: screenY / (pageHeight * scale),
      };
    },
    [pageWidth, pageHeight, scale]
  );

  /** Convert normalized 0-1 coords to screen pixel coords */
  const normalizedToScreen = useCallback(
    (normX: number, normY: number) => {
      return {
        x: normX * pageWidth * scale,
        y: normY * pageHeight * scale,
      };
    },
    [pageWidth, pageHeight, scale]
  );

  /** Get mouse position relative to SVG element */
  const getRelativePosition = useCallback(
    (e: React.MouseEvent, svgRect: DOMRect) => {
      return {
        x: e.clientX - svgRect.left,
        y: e.clientY - svgRect.top,
      };
    },
    []
  );

  return { screenToNormalized, normalizedToScreen, getRelativePosition };
}
