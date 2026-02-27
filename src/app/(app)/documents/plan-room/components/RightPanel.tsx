"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface RightPanelProps {
  children: ReactNode;
}

interface PanelSectionProps {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function PanelSection({ title, badge, defaultOpen = true, children }: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`plan-room-panel-section${open ? " open" : ""}`}>
      <div className="plan-room-panel-header" onClick={() => setOpen(!open)}>
        <h3>
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="plan-room-panel-badge">{badge}</span>
          )}
        </h3>
        <svg
          className="plan-room-panel-chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      {open && <div className="plan-room-panel-body">{children}</div>}
    </div>
  );
}

export default function RightPanel({ children }: RightPanelProps) {
  const t = useTranslations("documents");
  return <div className="plan-room-right-panel">{children}</div>;
}
