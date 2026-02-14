"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check, X } from "lucide-react";

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  label?: string;
  existingSignature?: string | null;
}

export default function SignaturePad({
  onSave,
  onCancel,
  width = 500,
  height = 200,
  label = "Sign here",
  existingSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw baseline
    ctx.beginPath();
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.moveTo(20, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();

    // Reset stroke style
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
  }, [getCtx, width, height]);

  function getPosition(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPosition(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    // Redraw baseline
    ctx.beginPath();
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.moveTo(20, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    setHasContent(false);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  }

  if (existingSignature) {
    return (
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--foreground)", marginBottom: "8px" }}>
          Signature
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", background: "#fff", display: "inline-block" }}>
          <img src={existingSignature} alt="Signature" style={{ maxWidth: "300px", height: "auto" }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--foreground)", marginBottom: "8px" }}>
        {label}
      </div>
      <div
        style={{
          border: "2px solid var(--border)",
          borderRadius: "10px",
          overflow: "hidden",
          display: "inline-block",
          touchAction: "none",
          background: "#fff",
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width: `${width}px`, height: `${height}px`, cursor: "crosshair", display: "block", maxWidth: "100%" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
        <button
          type="button"
          onClick={clearCanvas}
          className="btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "6px 14px" }}
        >
          <Eraser size={14} /> Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasContent}
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "6px 14px", opacity: hasContent ? 1 : 0.5 }}
        >
          <Check size={14} /> Sign &amp; Confirm
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "6px 14px" }}
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
