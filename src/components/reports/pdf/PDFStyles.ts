import { StyleSheet, Font } from "@react-pdf/renderer";

// Register fonts (using standard PDF fonts — no external files needed)
// @react-pdf/renderer includes Helvetica and Times by default

export const THEMES = {
  market_feasibility: {
    primary: "#1B2A4A",
    accent: "#C9A84C",
    light: "#F5F0E8",
    gradientStart: "#1B2A4A",
    gradientEnd: "#2a3f6a",
  },
  offering_memorandum: {
    primary: "#0D3B3E",
    accent: "#A8B5B8",
    light: "#EDF2F3",
    gradientStart: "#0D3B3E",
    gradientEnd: "#1a5c61",
  },
  basis_of_design: {
    primary: "#2D2D3D",
    accent: "#4A90D9",
    light: "#EBF0F7",
    gradientStart: "#2D2D3D",
    gradientEnd: "#3d3d55",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export function getTheme(reportType: string) {
  return THEMES[reportType as ThemeKey] ?? THEMES.market_feasibility;
}

export const styles = StyleSheet.create({
  // --- Page ---
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333333",
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
    position: "relative",
  },

  // --- Cover page ---
  coverPage: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    position: "relative",
  },
  coverBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverContent: {
    alignItems: "center",
    zIndex: 1,
  },
  coverLabel: {
    fontSize: 9,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 20,
  },
  coverTitle: {
    fontFamily: "Times-Bold",
    fontSize: 32,
    color: "white",
    textAlign: "center",
    marginBottom: 12,
    maxWidth: 400,
  },
  coverSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 30,
  },
  coverDivider: {
    width: 60,
    height: 3,
    marginBottom: 30,
    borderRadius: 2,
  },
  coverMeta: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 1.6,
  },

  // --- Page accent bar ---
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  sideStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },

  // --- Section header ---
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  sectionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionNumberText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "white",
  },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 18,
    flex: 1,
  },
  sectionDividerLine: {
    height: 1,
    marginTop: 4,
  },

  // --- Body text ---
  narrative: {
    fontSize: 10,
    lineHeight: 1.7,
    marginBottom: 12,
    textAlign: "justify",
  },

  // --- Tables ---
  table: {
    marginVertical: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333333",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#666666",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#F8F8F8",
  },
  tableTotalsRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderTopWidth: 2,
    borderTopColor: "#333333",
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellRight: {
    fontSize: 9,
    textAlign: "right",
    fontFamily: "Courier",
  },

  // --- KPI stat cards ---
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 12,
  },
  kpiCard: {
    width: "30%",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
  },
  kpiValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#888888",
  },

  // --- Footer ---
  footer: {
    position: "absolute",
    bottom: 20,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#CCCCCC",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#999999",
  },
  footerPage: {
    fontSize: 7,
    color: "#999999",
  },

  // --- Watermark ---
  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    fontSize: 60,
    fontFamily: "Helvetica-Bold",
    color: "rgba(200,200,200,0.15)",
    transform: "rotate(-45deg)",
  },

  // --- Decorative elements ---
  cornerBracketTL: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 20,
    height: 20,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  cornerBracketBR: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 20,
    height: 20,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },

  // --- TOC ---
  tocEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E8E8E8",
  },
  tocLabel: {
    fontSize: 11,
  },
  tocPage: {
    fontSize: 11,
    color: "#888888",
  },

  // --- Chart image ---
  chartImage: {
    width: "100%",
    marginVertical: 12,
    borderRadius: 4,
  },
});
