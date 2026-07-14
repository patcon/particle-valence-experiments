import type { RefObject } from "react";
import type { Params } from "../../lib/particle-sim/types";
import { Slider } from "./Slider";
import { styles } from "./styles";

interface ParticlePaneProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  params: Params;
  setParam: <K extends keyof Params>(key: K, value: Params[K]) => void;
}

export function ParticlePane({ canvasRef, params, setParam }: ParticlePaneProps) {
  return (
    <div style={styles.pane}>
      <div style={styles.paneHeader}>particles · driven by cursor proximity</div>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.controls}>
        <Slider label="force" value={params.forceScale} min={0} max={300} step={1}
          onChange={(v) => setParam("forceScale", v)} />
        <Slider label="proximity range" value={params.proximityRange} min={0.05} max={1.4} step={0.01}
          fmt={(v) => v.toFixed(2)} onChange={(v) => setParam("proximityRange", v)} />
        <Slider label="core radius" value={params.coreRadius} min={4} max={60} step={1}
          fmt={(v) => `${v}px`} onChange={(v) => setParam("coreRadius", v)} />
        <Slider label="falloff" value={params.falloff} min={40} max={500} step={5}
          fmt={(v) => `${v}px`} onChange={(v) => setParam("falloff", v)} />
        <Slider label="friction" value={params.friction} min={0} max={0.3} step={0.005}
          fmt={(v) => v.toFixed(3)} onChange={(v) => setParam("friction", v)} />
        <Slider label="max speed" value={params.maxSpeed} min={50} max={1000} step={10}
          onChange={(v) => setParam("maxSpeed", v)} />
        <Slider label="center gravity" value={params.centerGravity} min={0} max={4} step={0.05}
          fmt={(v) => v.toFixed(2)} onChange={(v) => setParam("centerGravity", v)} />
        <Slider label="particles per cursor" value={params.multiplier} min={1} max={12} step={1}
          fmt={(v) => `×${v}`} onChange={(v) => setParam("multiplier", v)} />
        <label style={{ ...styles.sliderLabel, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={params.invert}
            onChange={(ev) => setParam("invert", ev.target.checked)}
          />
          <span style={styles.sliderText}>invert (close cursors repel)</span>
        </label>
      </div>
    </div>
  );
}
