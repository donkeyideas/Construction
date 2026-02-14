"use client";

import dynamic from "next/dynamic";

const PdfRendererInner = dynamic(() => import("./PdfRendererInner"), {
  ssr: false,
  loading: () => (
    <div className="plan-room-viewer-loading">
      <div className="plan-room-spinner" />
      <p>Loading viewer...</p>
    </div>
  ),
});

interface PdfRendererProps {
  fileUrl: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess?: (numPages: number) => void;
  onPageDimensions?: (width: number, height: number) => void;
}

export default function PdfRenderer(props: PdfRendererProps) {
  return <PdfRendererInner {...props} />;
}
