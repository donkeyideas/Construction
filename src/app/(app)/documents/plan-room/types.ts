export type AnnotationTool = "select" | "pan" | "measure" | "markup";
export type MarkupShape = "line" | "rectangle" | "circle" | "text" | "arrow" | "cloud";
export type MarkupColor = "#dc2626" | "#1d4ed8" | "#16a34a" | "#292524";

export const MARKUP_COLORS: { value: MarkupColor; label: string }[] = [
  { value: "#dc2626", label: "Red" },
  { value: "#1d4ed8", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#292524", label: "Black" },
];

export const DISCIPLINES = [
  { value: "architectural", label: "Architectural", letter: "A" },
  { value: "structural", label: "Structural", letter: "S" },
  { value: "mechanical", label: "Mechanical", letter: "M" },
  { value: "electrical", label: "Electrical", letter: "E" },
  { value: "plumbing", label: "Plumbing", letter: "P" },
  { value: "civil", label: "Civil", letter: "C" },
  { value: "landscape", label: "Landscape", letter: "L" },
] as const;

export interface AnnotationGeometry {
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
}
