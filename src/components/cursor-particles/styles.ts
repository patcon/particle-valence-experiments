import type { CSSProperties } from "react";

export const styles = {
  app: {
    display: "flex", flexDirection: "column",
    height: "100vh", background: "#0c1210", color: "#cfe8df",
    fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", fontSize: 13,
  },
  toolbar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "8px 14px", borderBottom: "1px solid #1d2b26",
  },
  title: { fontWeight: 700, letterSpacing: 2, color: "#2dd4a8" },
  count: { opacity: 0.6 },
  recBadge: { color: "#ff5a5a", fontWeight: 700, animation: "none" },
  btn: {
    background: "#14201b", color: "#cfe8df", border: "1px solid #27473c",
    borderRadius: 6, padding: "4px 12px", cursor: "pointer",
    fontFamily: "inherit", fontSize: 12,
  },
  panes: { display: "flex", flex: 1, minHeight: 0, gap: 1, background: "#1d2b26" },
  pane: {
    flex: 1, display: "flex", flexDirection: "column",
    minWidth: 0, minHeight: 220, background: "#0c1210",
  },
  paneHeader: {
    padding: "6px 12px", fontSize: 11, letterSpacing: 1,
    textTransform: "uppercase", opacity: 0.55,
    borderBottom: "1px solid #17241f",
  },
  canvas: { flex: 1, width: "100%", minHeight: 0, display: "block" },
  progressStack: { display: "flex", flexDirection: "column", gap: 1 },
  progressTrack: { position: "relative", height: 3, background: "#17241f" },
  progressBar: {
    position: "absolute", left: 0, top: 0, bottom: 0, width: "0%",
    transition: "width 60ms linear, opacity 150ms linear",
  },
  controls: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "6px 16px", padding: "10px 14px", borderTop: "1px solid #17241f",
  },
  sliderLabel: { display: "flex", flexDirection: "column", gap: 2 },
  sliderText: { fontSize: 11, opacity: 0.8 },
} as const satisfies Record<string, CSSProperties>;
