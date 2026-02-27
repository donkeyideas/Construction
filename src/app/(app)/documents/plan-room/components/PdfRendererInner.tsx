"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfRendererInnerProps {
  fileUrl: string;
  pageNumber: number;
  scale: number;
  onLoadSuccess?: (numPages: number) => void;
  onPageDimensions?: (width: number, height: number) => void;
}

export default function PdfRendererInner({
  fileUrl,
  pageNumber,
  scale,
  onLoadSuccess,
  onPageDimensions,
}: PdfRendererInnerProps) {
  const t = useTranslations("documents");
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDocLoad = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setError(null);
      onLoadSuccess?.(n);
    },
    [onLoadSuccess]
  );

  const handlePageRenderSuccess = useCallback(
    (page: { width: number; height: number }) => {
      onPageDimensions?.(page.width, page.height);
    },
    [onPageDimensions]
  );

  if (error) {
    return (
      <div className="plan-room-viewer-empty">
        <p>{t("planRoom.pdfRenderer.failedToLoadPdf", { error })}</p>
      </div>
    );
  }

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={handleDocLoad}
      onLoadError={(err) => setError(err?.message || "Unknown error")}
      loading={
        <div className="plan-room-viewer-loading">
          <div className="plan-room-spinner" />
          <p>{t("planRoom.pdfRenderer.loadingPdf")}</p>
        </div>
      }
    >
      {numPages > 0 && (
        <Page
          pageNumber={pageNumber}
          scale={scale}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onRenderSuccess={handlePageRenderSuccess}
          loading={
            <div className="plan-room-viewer-loading">
              <div className="plan-room-spinner" />
              <p>{t("planRoom.pdfRenderer.renderingPage")}</p>
            </div>
          }
        />
      )}
    </Document>
  );
}
