"use client";

import { useState } from "react";
import {
  Map,
  MousePointer2,
  Pencil,
  Type,
  ArrowUpRight,
  Square,
  Circle,
  Cloud,
  Ruler,
  Highlighter,
  Undo2,
  Redo2,
  Save,
  Minus,
  Plus,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  FileCheck,
  Eye,
  PanelRightClose,
  Download,
  Layers,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanDoc {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  category: string;
  version: number;
  created_at: string;
  project_id: string | null;
  projects: { id: string; name: string } | null;
  uploader: { full_name: string; email: string } | null;
}

interface PlanRoomClientProps {
  documents: PlanDoc[];
  projectList: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Mock sheet data (when no real documents exist)
// ---------------------------------------------------------------------------

interface Sheet {
  id: string;
  number: string;
  name: string;
  discipline: string;
  revision: number;
  date: string;
  isNew?: boolean;
}

const MOCK_SHEETS: Sheet[] = [
  { id: "a10", number: "A1.0", name: "Site Plan", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "a21", number: "A2.1", name: "Floor Plan L1", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "a22", number: "A2.2", name: "Floor Plan L2", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "a23", number: "A2.3", name: "Floor Plan L3", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "a30", number: "A3.0", name: "Elevations", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "a40", number: "A4.0", name: "Sections", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "a50", number: "A5.0", name: "Details", discipline: "Architectural", revision: 3, date: "Feb 3, 2026" },
  { id: "s10", number: "S1.0", name: "Foundation Plan", discipline: "Structural", revision: 4, date: "Feb 5, 2026" },
  { id: "s20", number: "S2.0", name: "Framing Plan L1", discipline: "Structural", revision: 3, date: "Feb 3, 2026" },
  { id: "s21", number: "S2.1", name: "Framing Plan L2", discipline: "Structural", revision: 3, date: "Feb 3, 2026" },
  { id: "s30", number: "S3.0", name: "Structural Details", discipline: "Structural", revision: 3, date: "Feb 3, 2026" },
  { id: "m10", number: "M1.0", name: "HVAC Plan L1", discipline: "Mechanical", revision: 3, date: "Feb 3, 2026", isNew: true },
  { id: "m11", number: "M1.1", name: "HVAC Plan L2", discipline: "Mechanical", revision: 3, date: "Feb 3, 2026" },
  { id: "m20", number: "M2.0", name: "Plumbing Plan", discipline: "Mechanical", revision: 3, date: "Feb 3, 2026" },
  { id: "e10", number: "E1.0", name: "Power Plan L1", discipline: "Electrical", revision: 3, date: "Feb 3, 2026" },
  { id: "e11", number: "E1.1", name: "Power Plan L2", discipline: "Electrical", revision: 3, date: "Feb 3, 2026" },
  { id: "e20", number: "E2.0", name: "Lighting Plan", discipline: "Electrical", revision: 3, date: "Feb 3, 2026" },
];

const MOCK_LINKED_ITEMS = [
  { id: "rfi12", type: "RFI", number: "#12", title: "Foundation detail clarification" },
  { id: "rfi18", type: "RFI", number: "#18", title: "Site grading question" },
  { id: "sub5", type: "Submittal", number: "#5", title: "Concrete mix design" },
];

const MOCK_MARKUP_HISTORY = [
  { initials: "JM", name: "John M.", date: "Feb 10", count: 3, color: "var(--color-blue)" },
  { initials: "SK", name: "Sarah K.", date: "Feb 8", count: 1, color: "#a855f7" },
];

const MARKUP_TOOLS = [
  { icon: MousePointer2, label: "Select", id: "select" },
  { icon: Pencil, label: "Pen", id: "pen" },
  { icon: Type, label: "Text", id: "text" },
  { icon: ArrowUpRight, label: "Arrow", id: "arrow" },
  { icon: Square, label: "Rectangle", id: "rect" },
  { icon: Circle, label: "Circle", id: "circle" },
  { icon: Cloud, label: "Cloud", id: "cloud" },
  { icon: Ruler, label: "Dimension", id: "ruler" },
  { icon: Highlighter, label: "Highlight", id: "highlight" },
];

const MARKUP_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#18181b"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanRoomClient({
  documents,
  projectList,
}: PlanRoomClientProps) {
  // Build sheets from real documents or use mock data
  const hasRealDocs = documents.length > 0;

  const sheets: Sheet[] = hasRealDocs
    ? documents.map((doc, i) => ({
        id: doc.id,
        number: `D${(i + 1).toString().padStart(2, "0")}`,
        name: doc.name,
        discipline: doc.category === "plan" ? "Plans" : "Specifications",
        revision: doc.version,
        date: doc.created_at
          ? new Date(doc.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "--",
      }))
    : MOCK_SHEETS;

  const [activeSheetId, setActiveSheetId] = useState(sheets[0]?.id ?? "");
  const [activeProject, setActiveProject] = useState("all");
  const [activeTool, setActiveTool] = useState("select");
  const [activeColor, setActiveColor] = useState(MARKUP_COLORS[0]);
  const [zoom, setZoom] = useState(100);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  const sheetIndex = sheets.findIndex((s) => s.id === activeSheetId);

  // Group sheets by discipline
  const disciplines: Record<string, Sheet[]> = {};
  for (const s of sheets) {
    if (!disciplines[s.discipline]) disciplines[s.discipline] = [];
    disciplines[s.discipline].push(s);
  }

  function goToPrevSheet() {
    if (sheetIndex > 0) setActiveSheetId(sheets[sheetIndex - 1].id);
  }

  function goToNextSheet() {
    if (sheetIndex < sheets.length - 1) setActiveSheetId(sheets[sheetIndex + 1].id);
  }

  // Filter projects
  const filteredProjectList = projectList;

  return (
    <div className="plan-room-shell">
      {/* Header Bar */}
      <div className="plan-room-header">
        <div className="plan-room-header-left">
          <Map size={20} className="plan-room-icon" />
          {filteredProjectList.length > 0 ? (
            <select
              className="plan-room-project-select"
              value={activeProject}
              onChange={(e) => setActiveProject(e.target.value)}
            >
              <option value="all">All Projects</option>
              {filteredProjectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="plan-room-project-name">Plan Room</span>
          )}
          <span className="plan-room-set-info">
            <Layers size={14} />
            Current Set - Rev {activeSheet?.revision ?? 1}
          </span>
        </div>
        <div className="plan-room-header-right">
          <button className="plan-room-download-btn">
            <Download size={14} />
            Download Set
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="plan-room-body">
        {/* LEFT: Sheet Index */}
        <div className="plan-room-sidebar">
          {Object.entries(disciplines).map(([discipline, discSheets]) => (
            <div key={discipline} className="plan-room-discipline">
              <div className="plan-room-discipline-title">{discipline}</div>
              {discSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className={`plan-room-sheet-item ${sheet.id === activeSheetId ? "active" : ""}`}
                  onClick={() => setActiveSheetId(sheet.id)}
                >
                  <div className="plan-room-sheet-top">
                    <span className={`plan-room-sheet-number ${sheet.id === activeSheetId ? "active" : ""}`}>
                      {sheet.number}
                    </span>
                    {sheet.isNew && <span className="plan-room-sheet-badge new">New</span>}
                    {sheet.revision > 3 && <span className="plan-room-sheet-badge rev">Rev {sheet.revision}</span>}
                  </div>
                  <div className={`plan-room-sheet-name ${sheet.id === activeSheetId ? "active" : ""}`}>
                    {sheet.name}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* CENTER: Viewer */}
        <div className="plan-room-viewer">
          {/* Floating Markup Toolbar */}
          <div className="plan-room-toolbar">
            {MARKUP_TOOLS.map((tool) => (
              <button
                key={tool.id}
                className={`plan-room-tool-btn ${activeTool === tool.id ? "active" : ""}`}
                title={tool.label}
                onClick={() => setActiveTool(tool.id)}
              >
                <tool.icon size={16} />
              </button>
            ))}

            <div className="plan-room-toolbar-sep" />

            {/* Color Picker */}
            <div className="plan-room-colors">
              {MARKUP_COLORS.map((color) => (
                <button
                  key={color}
                  className={`plan-room-color-dot ${activeColor === color ? "active" : ""}`}
                  style={{ background: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>

            <div className="plan-room-toolbar-sep" />

            {/* Undo / Redo */}
            <button className="plan-room-tool-btn" title="Undo">
              <Undo2 size={16} />
            </button>
            <button className="plan-room-tool-btn disabled" title="Redo">
              <Redo2 size={16} />
            </button>

            <div className="plan-room-toolbar-sep" />

            <button className="plan-room-save-btn">
              <Save size={14} />
              Save Markups
            </button>
          </div>

          {/* Blueprint Drawing Area */}
          <div className="plan-room-blueprint">
            <div className="plan-room-drawing" style={{ transform: `scale(${zoom / 100})` }}>
              {/* Simulated Site Plan */}
              <div className="blueprint-container">
                {/* North Arrow */}
                <div className="blueprint-north">
                  <span>N</span>
                  <div className="blueprint-north-arrow" />
                  <div className="blueprint-north-line" />
                </div>

                {/* Property Boundary */}
                <div className="blueprint-boundary" />

                {/* Building Footprint */}
                <div className="blueprint-building">
                  <div className="blueprint-building-label">
                    <p className="blueprint-building-title">Building Footprint</p>
                    <p className="blueprint-building-sub">{activeSheet.name}</p>
                    <p className="blueprint-building-info">3 Stories - 42,000 SF</p>
                  </div>
                  {/* Dimension lines */}
                  <div className="blueprint-dim-h">
                    <div className="blueprint-dim-tick" />
                    <div className="blueprint-dim-line">
                      <span>180&apos;-0&quot;</span>
                    </div>
                    <div className="blueprint-dim-tick" />
                  </div>
                  <div className="blueprint-dim-v">
                    <div className="blueprint-dim-tick-h" />
                    <div className="blueprint-dim-line-v">
                      <span>120&apos;-0&quot;</span>
                    </div>
                    <div className="blueprint-dim-tick-h" />
                  </div>
                </div>

                {/* Parking Areas */}
                <div className="blueprint-parking left">
                  <div className="blueprint-parking-hatch" />
                  <div className="blueprint-parking-label">
                    <span>Parking</span>
                    <span className="sub">42 Spaces</span>
                  </div>
                </div>
                <div className="blueprint-parking right">
                  <div className="blueprint-parking-hatch" />
                  <div className="blueprint-parking-label">
                    <span>Parking</span>
                    <span className="sub">28 Spaces</span>
                  </div>
                </div>

                {/* Road */}
                <div className="blueprint-road">
                  <div className="blueprint-road-surface" />
                  <div className="blueprint-road-center" />
                  <span className="blueprint-road-label">RIVERSIDE DRIVE</span>
                </div>

                {/* Scale Bar */}
                <div className="blueprint-scale">
                  <div className="blueprint-scale-bars">
                    <div className="scale-seg dark" />
                    <div className="scale-seg light" />
                    <div className="scale-seg dark" />
                    <div className="scale-seg light" />
                  </div>
                  <div className="blueprint-scale-labels">
                    <span>0</span>
                    <span>50&apos;</span>
                    <span>100&apos;</span>
                  </div>
                  <div className="blueprint-scale-text">SCALE: 1&quot; = 50&apos;-0&quot;</div>
                </div>

                {/* Title Block */}
                <div className="blueprint-title-block">
                  <div className="title-block-row main">
                    <p className="title-block-project">RIVERSIDE COMMONS PHASE II</p>
                    <p className="title-block-address">4200 Riverside Dr, Austin, TX 78741</p>
                  </div>
                  <div className="title-block-row split">
                    <div className="title-block-cell">
                      <span className="title-block-label">DRAWN BY</span>
                      <span className="title-block-value">MDA Architects</span>
                    </div>
                    <div className="title-block-cell">
                      <span className="title-block-label">DATE</span>
                      <span className="title-block-value">{activeSheet.date}</span>
                    </div>
                  </div>
                  <div className="title-block-row split">
                    <div className="title-block-cell">
                      <span className="title-block-label">SHEET</span>
                      <span className="title-block-value lg">{activeSheet.number}</span>
                    </div>
                    <div className="title-block-cell">
                      <span className="title-block-label">REVISION</span>
                      <span className="title-block-value lg">{activeSheet.revision}</span>
                    </div>
                  </div>
                  <div className="title-block-row footer">
                    <span>{activeSheet.name.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="plan-room-bottom-bar">
            <div className="plan-room-zoom">
              <button
                className="plan-room-tool-btn sm"
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                title="Zoom Out"
              >
                <Minus size={14} />
              </button>
              <span className="plan-room-zoom-label">{zoom}%</span>
              <button
                className="plan-room-tool-btn sm"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                title="Zoom In"
              >
                <Plus size={14} />
              </button>
              <button
                className="plan-room-tool-btn sm text"
                onClick={() => setZoom(100)}
                title="Fit to Screen"
              >
                <Maximize2 size={14} />
                Fit
              </button>
            </div>

            <div className="plan-room-page-nav">
              <button
                className="plan-room-tool-btn sm"
                onClick={goToPrevSheet}
                disabled={sheetIndex <= 0}
                title="Previous Sheet"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="plan-room-page-label">
                Sheet {sheetIndex + 1} of {sheets.length}
              </span>
              <button
                className="plan-room-tool-btn sm"
                onClick={goToNextSheet}
                disabled={sheetIndex >= sheets.length - 1}
                title="Next Sheet"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="plan-room-bottom-actions">
              <button className="plan-room-action-btn">
                <MessageSquare size={12} />
                Link RFI
              </button>
              <button className="plan-room-action-btn">
                <FileCheck size={12} />
                Link Submittal
              </button>
              <button className="plan-room-action-btn">
                <Eye size={12} />
                View History
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Info Panel */}
        {infoPanelOpen && (
          <div className="plan-room-info">
            {/* Panel Header */}
            <div className="plan-room-info-header">
              <span>Sheet Info</span>
              <button
                className="plan-room-tool-btn sm"
                onClick={() => setInfoPanelOpen(false)}
                title="Collapse Panel"
              >
                <PanelRightClose size={16} />
              </button>
            </div>

            {/* Sheet Details */}
            <div className="plan-room-info-section">
              <div className="plan-room-info-field">
                <span className="plan-room-info-label">Sheet Name</span>
                <span className="plan-room-info-value">
                  {activeSheet.number} - {activeSheet.name}
                </span>
              </div>
              <div className="plan-room-info-row">
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Revision</span>
                  <span className="plan-room-info-value sm">Rev {activeSheet.revision}</span>
                </div>
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Date</span>
                  <span className="plan-room-info-value sm">{activeSheet.date}</span>
                </div>
              </div>
              {hasRealDocs && (
                <div className="plan-room-info-field">
                  <span className="plan-room-info-label">Uploaded By</span>
                  <span className="plan-room-info-value sm">
                    {documents.find((d) => d.id === activeSheetId)?.uploader?.full_name ?? "--"}
                  </span>
                </div>
              )}
            </div>

            {/* Linked Items */}
            <div className="plan-room-info-section">
              <div className="plan-room-info-section-title">Linked Items</div>
              <div className="plan-room-linked-items">
                {MOCK_LINKED_ITEMS.map((item) => (
                  <div key={item.id} className="plan-room-linked-item">
                    <div
                      className={`plan-room-linked-icon ${item.type === "RFI" ? "amber" : "green"}`}
                    >
                      {item.type === "RFI" ? (
                        <MessageSquare size={12} />
                      ) : (
                        <FileCheck size={12} />
                      )}
                    </div>
                    <div className="plan-room-linked-content">
                      <span className="plan-room-linked-title">
                        {item.type} {item.number}
                      </span>
                      <span className="plan-room-linked-desc">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Markup History */}
            <div className="plan-room-info-section no-border">
              <div className="plan-room-info-section-title">Markup History</div>
              <div className="plan-room-markup-history">
                {MOCK_MARKUP_HISTORY.map((entry) => (
                  <div key={entry.initials} className="plan-room-markup-entry">
                    <div
                      className="plan-room-markup-avatar"
                      style={{ background: `${entry.color}20`, color: entry.color }}
                    >
                      {entry.initials}
                    </div>
                    <div className="plan-room-markup-info">
                      <div className="plan-room-markup-top">
                        <span className="plan-room-markup-name">{entry.name}</span>
                        <span className="plan-room-markup-date">{entry.date}</span>
                      </div>
                      <span className="plan-room-markup-count">
                        {entry.count} markup{entry.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Toggle info panel when closed */}
        {!infoPanelOpen && (
          <button
            className="plan-room-info-toggle"
            onClick={() => setInfoPanelOpen(true)}
            title="Open Info Panel"
          >
            <PanelRightClose size={16} style={{ transform: "scaleX(-1)" }} />
          </button>
        )}
      </div>
    </div>
  );
}
