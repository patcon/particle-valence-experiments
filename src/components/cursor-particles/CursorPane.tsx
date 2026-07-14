import { colorFor } from "../../lib/particle-sim/constants";
import { styles } from "./styles";

const RATES = [1, 0.5, 0.25, 0.125];
const RATE_LABEL: Record<number, string> = { 1: "1x", 0.5: "½x", 0.25: "¼x", 0.125: "⅛x" };

interface CursorPaneProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  rate: number;
  onSetRate: (r: number) => void;
  syncStart: boolean;
  onSetSyncStart: (v: boolean) => void;
  recCount: number;
  setBarRef: (i: number) => (el: HTMLDivElement | null) => void;
}

export function CursorPane({
  canvasRef, rate, onSetRate, syncStart, onSetSyncStart, recCount, setBarRef,
}: CursorPaneProps) {
  return (
    <div style={styles.pane}>
      <div style={{ ...styles.paneHeader, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1 }}>
          cursor field · click to start/stop <span style={{ opacity: 0.5 }}>(touch: hold to record)</span>
        </span>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={syncStart}
            onChange={(ev) => onSetSyncStart(ev.target.checked)}
          />
          <span>sync start times</span>
        </label>
        {RATES.map((r) => (
          <button
            key={r}
            onClick={() => onSetRate(r)}
            style={{
              ...styles.btn,
              padding: "2px 8px",
              borderColor: rate === r ? "#2dd4a8" : "#27473c",
              color: rate === r ? "#2dd4a8" : "#cfe8df",
            }}
          >
            {RATE_LABEL[r]}
          </button>
        ))}
      </div>
      {recCount > 0 && (
        <div style={styles.progressStack}>
          {Array.from({ length: recCount }, (_, i) => (
            <div key={i} style={styles.progressTrack}>
              <div ref={setBarRef(i)} style={{ ...styles.progressBar, background: colorFor(i, 0.9) }} />
            </div>
          ))}
        </div>
      )}
      <canvas ref={canvasRef} style={{ ...styles.canvas, touchAction: "none", cursor: "crosshair" }} />
    </div>
  );
}
