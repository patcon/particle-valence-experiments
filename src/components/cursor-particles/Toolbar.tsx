import type { ChangeEvent } from "react";
import { styles } from "./styles";

interface ToolbarProps {
  recCount: number;
  isRecording: boolean;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClear: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function Toolbar({ recCount, isRecording, onImport, onExport, onClear, fileInputRef }: ToolbarProps) {
  return (
    <div style={styles.toolbar}>
      <span style={styles.title}>same·field</span>
      <span style={styles.count}>{recCount} cursor{recCount === 1 ? "" : "s"}</span>
      {isRecording && <span style={styles.recBadge}>● REC</span>}
      <span style={{ flex: 1 }} />
      <button style={styles.btn} onClick={() => fileInputRef.current?.click()}>Import</button>
      <button style={styles.btn} onClick={onExport} disabled={recCount === 0}>Export</button>
      <button style={{ ...styles.btn, color: "#f88" }} onClick={onClear} disabled={recCount === 0 && !isRecording}>Clear</button>
      <input ref={fileInputRef} type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
    </div>
  );
}
