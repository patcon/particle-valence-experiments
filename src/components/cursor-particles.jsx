import { useRef, useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------
// CursorField + ParticleField
// - Right pane (CursorField): record pointer paths, loop-replay all.
//   Desktop: click toggles recording. Touch: press = record, release = stop.
//   Starting a new recording resets playback clock for all loops.
// - Left pane (ParticleField): one particle per recording. Pairwise
//   attraction/repulsion coefficient driven by live distance between
//   the two replayed cursors. Tunable via sliders.
// - Import/Export recordings as JSON.
// [Recordings stored in normalized 0..1 coords so they survive
//  resize and export cleanly across screen sizes.]
// ---------------------------------------------------------------

const HUES = [165, 25, 210, 330, 60, 275, 105, 0, 190, 45, 300, 135];
const colorFor = (i, a = 1) => `hsla(${HUES[i % HUES.length]}, 85%, 62%, ${a})`;

// position of a recording's cursor at loop-time tau (ms)
function sampleRecording(rec, tau) {
  const pts = rec.points;
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];
  const t = tau % rec.duration;
  // linear scan with cached index
  let i = rec._idx || 0;
  if (pts[i].t > t) i = 0;
  while (i < pts.length - 2 && pts[i + 1].t <= t) i++;
  rec._idx = i;
  const a = pts[i], b = pts[i + 1];
  const span = b.t - a.t || 1;
  const f = Math.min(1, Math.max(0, (t - a.t) / span));
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

const DEFAULT_PARAMS = {
  forceScale: 180,     // overall force strength
  proximityRange: 0.4, // cursor distance (normalized) where attract flips to repel
  invert: false,       // false: close cursors attract, far cursors repel; true: flipped
  coreRadius: 22,      // px — inside this, particles always repel (personal space)
  falloff: 320,        // px — attraction fades to zero beyond this particle distance
  friction: 0.025,     // velocity damping per frame-ish
  maxSpeed: 480,       // px/s clamp
};

export default function App() {
  const cursorCanvasRef = useRef(null);
  const particleCanvasRef = useRef(null);

  // --- mutable sim state (refs so the RAF loop never resubscribes) ---
  const recordingsRef = useRef([]);        // committed recordings
  const liveRef = useRef(null);            // {points, startedAt} while recording
  const tauRef = useRef(0);                // virtual playback clock (ms), advances at `rate`
  const rateRef = useRef(1);               // playback rate: 1, 1/2, 1/4, 1/8
  const particlesRef = useRef([]);         // {x, y, vx, vy} in particle-canvas px
  const paramsRef = useRef({ ...DEFAULT_PARAMS });
  const pointerRef = useRef({ x: 0.5, y: 0.5, inside: false });

  // --- UI state ---
  const [recCount, setRecCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [rate, setRate] = useState(1);
  const fileInputRef = useRef(null);

  const setPlaybackRate = (r) => { rateRef.current = r; setRate(r); };

  const setParam = (key, value) => {
    paramsRef.current[key] = value;
    setParams((p) => ({ ...p, [key]: value }));
  };

  const syncParticles = useCallback(() => {
    const canvas = particleCanvasRef.current;
    const n = recordingsRef.current.length;
    const parts = particlesRef.current;
    const w = canvas ? canvas.clientWidth : 300;
    const h = canvas ? canvas.clientHeight : 300;
    while (parts.length < n) {
      parts.push({
        x: w * (0.2 + 0.6 * Math.random()),
        y: h * (0.2 + 0.6 * Math.random()),
        vx: 0, vy: 0,
      });
    }
    parts.length = n;
  }, []);

  // ---------------- recording control ----------------
  const startRecording = useCallback(() => {
    liveRef.current = { points: [], startedAt: performance.now() };
    tauRef.current = 0; // reset loops so we record against them from their start
    recordingsRef.current.forEach((r) => (r._idx = 0));
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    const live = liveRef.current;
    liveRef.current = null;
    setIsRecording(false);
    if (!live || live.points.length < 2) return; // discard taps / empty
    const duration = live.points[live.points.length - 1].t;
    if (duration < 50) return;
    recordingsRef.current.push({ points: live.points, duration, _idx: 0 });
    setRecCount(recordingsRef.current.length);
    syncParticles();
  }, [syncParticles]);

  const clearAll = useCallback(() => {
    liveRef.current = null;
    recordingsRef.current = [];
    particlesRef.current = [];
    setIsRecording(false);
    setRecCount(0);
  }, []);

  // ---------------- pointer handling on CursorField ----------------
  useEffect(() => {
    const canvas = cursorCanvasRef.current;
    if (!canvas) return;

    const norm = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      };
    };

    const record = (e) => {
      const live = liveRef.current;
      if (!live) return;
      const { x, y } = norm(e);
      live.points.push({ x, y, t: performance.now() - live.startedAt });
    };

    const onDown = (e) => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      const p = norm(e);
      pointerRef.current = { ...p, inside: true };
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        // touch: hold to record
        startRecording();
        record(e);
      } else {
        // mouse: click toggles
        if (liveRef.current) stopRecording();
        else { startRecording(); record(e); }
      }
    };

    const onMove = (e) => {
      const p = norm(e);
      pointerRef.current = { ...p, inside: true };
      record(e);
    };

    const onUp = (e) => {
      if ((e.pointerType === "touch" || e.pointerType === "pen") && liveRef.current) {
        record(e);
        stopRecording();
      }
    };

    const onLeave = () => { pointerRef.current.inside = false; };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [startRecording, stopRecording]);

  // ---------------- main RAF loop ----------------
  useEffect(() => {
    let raf;
    let last = performance.now();

    const resize = (canvas) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return [ctx, w, h];
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const recs = recordingsRef.current;
      const P = paramsRef.current;
      // playback rate slows cursor replay only; sim physics still runs at real dt
      tauRef.current += dt * 1000 * rateRef.current;
      const tau = tauRef.current;

      // current cursor positions (normalized)
      const cursors = recs.map((r) => sampleRecording(r, tau));

      // ---- CursorField ----
      const cc = cursorCanvasRef.current;
      if (cc) {
        const [ctx, w, h] = resize(cc);
        ctx.clearRect(0, 0, w, h);

        // faint trails of each recording's full path
        recs.forEach((r, i) => {
          ctx.beginPath();
          r.points.forEach((p, j) => {
            const x = p.x * w, y = p.y * h;
            j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.strokeStyle = colorFor(i, 0.18);
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // live recording trail
        const live = liveRef.current;
        if (live && live.points.length > 1) {
          const i = recs.length; // color it as the next cursor
          ctx.beginPath();
          live.points.forEach((p, j) => {
            const x = p.x * w, y = p.y * h;
            j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.strokeStyle = colorFor(i, 0.55);
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // replaying cursor dots
        cursors.forEach((c, i) => {
          if (!c) return;
          const x = c.x * w, y = c.y * h;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fillStyle = colorFor(i, 0.95);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = colorFor(i, 0.35);
          ctx.stroke();
        });

        // recording indicator ring at pointer
        if (live && pointerRef.current.inside) {
          const { x, y } = pointerRef.current;
          ctx.beginPath();
          ctx.arc(x * w, y * h, 16, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,80,80,0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // ---- ParticleField ----
      const pc = particleCanvasRef.current;
      if (pc) {
        const [ctx, w, h] = resize(pc);
        const parts = particlesRef.current;

        // pairwise forces: coefficient from cursor proximity
        for (let i = 0; i < parts.length; i++) {
          for (let j = 0; j < parts.length; j++) {
            if (i === j) continue;
            const ci = cursors[i], cj = cursors[j];
            if (!ci || !cj) continue;

            const cdx = ci.x - cj.x, cdy = ci.y - cj.y;
            const cursorDist = Math.hypot(cdx, cdy); // 0 .. ~1.41
            // closeness in [-1, 1]: +1 when cursors overlap, 0 at proximityRange, → -1 far
            let closeness = 1 - cursorDist / Math.max(0.01, P.proximityRange);
            closeness = Math.max(-1, Math.min(1, closeness));
            let coeff = P.forceScale * closeness * (P.invert ? -1 : 1);

            const a = parts[i], b = parts[j];
            let dx = b.x - a.x, dy = b.y - a.y;
            let r = Math.hypot(dx, dy) || 0.001;
            const ux = dx / r, uy = dy / r;

            let f;
            if (r < P.coreRadius) {
              // hard core repulsion regardless of coefficient
              f = -P.forceScale * 2 * (1 - r / P.coreRadius);
            } else if (coeff >= 0) {
              // attraction: peaks just outside the core, fades by `falloff`
              const t = (r - P.coreRadius) / Math.max(1, P.falloff - P.coreRadius);
              f = coeff * Math.max(0, 1 - t);
            } else {
              // repulsion: doesn't fall to zero with distance — far cursors
              // keep pushing their particles apart (1/r near-field + constant floor)
              const near = Math.min(1, (P.coreRadius * 3) / r);
              f = coeff * (0.25 + 0.75 * near);
            }
            a.vx += ux * f * dt;
            a.vy += uy * f * dt;
          }
        }

        // integrate, damp, clamp, bounce
        for (const p of parts) {
          p.vx *= 1 - P.friction;
          p.vy *= 1 - P.friction;
          const s = Math.hypot(p.vx, p.vy);
          if (s > P.maxSpeed) { p.vx *= P.maxSpeed / s; p.vy *= P.maxSpeed / s; }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < 6) { p.x = 6; p.vx = Math.abs(p.vx); }
          if (p.x > w - 6) { p.x = w - 6; p.vx = -Math.abs(p.vx); }
          if (p.y < 6) { p.y = 6; p.vy = Math.abs(p.vy); }
          if (p.y > h - 6) { p.y = h - 6; p.vy = -Math.abs(p.vy); }
        }

        ctx.clearRect(0, 0, w, h);
        parts.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = colorFor(i, 0.95);
          ctx.fill();
        });
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------------- import / export ----------------
  const exportJSON = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      recordings: recordingsRef.current.map((r) => ({
        points: r.points,
        duration: r.duration,
      })),
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cursor-recordings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const recs = (data.recordings || []).filter(
          (r) => Array.isArray(r.points) && r.points.length > 1 && r.duration > 0
        );
        recordingsRef.current = recs.map((r) => ({ ...r, _idx: 0 }));
        tauRef.current = 0;
        particlesRef.current = [];
        syncParticles();
        setRecCount(recordingsRef.current.length);
      } catch {
        alert("Couldn't parse that file — expected JSON exported from this app.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ---------------- layout ----------------
  const slider = (label, key, min, max, step, fmt = (v) => v) => (
    <label style={styles.sliderLabel} key={key}>
      <span style={styles.sliderText}>
        {label} <b>{fmt(params[key])}</b>
      </span>
      <input
        type="range" min={min} max={max} step={step}
        value={params[key]}
        onChange={(ev) => setParam(key, parseFloat(ev.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );

  return (
    <div style={styles.app}>
      <div style={styles.toolbar}>
        <span style={styles.title}>same·field</span>
        <span style={styles.count}>{recCount} cursor{recCount === 1 ? "" : "s"}</span>
        {isRecording && <span style={styles.recBadge}>● REC</span>}
        <span style={{ flex: 1 }} />
        <button style={styles.btn} onClick={() => fileInputRef.current?.click()}>Import</button>
        <button style={styles.btn} onClick={exportJSON} disabled={recCount === 0}>Export</button>
        <button style={{ ...styles.btn, color: "#f88" }} onClick={clearAll} disabled={recCount === 0 && !isRecording}>Clear</button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
      </div>

      <div style={styles.panes} className="panes">
        {/* Particle sim — left on wide screens */}
        <div style={styles.pane}>
          <div style={styles.paneHeader}>particles · driven by cursor proximity</div>
          <canvas ref={particleCanvasRef} style={styles.canvas} />
          <div style={styles.controls}>
            {slider("force", "forceScale", 0, 300, 1)}
            {slider("proximity range", "proximityRange", 0.05, 1.4, 0.01, (v) => v.toFixed(2))}
            {slider("core radius", "coreRadius", 4, 60, 1, (v) => `${v}px`)}
            {slider("falloff", "falloff", 40, 500, 5, (v) => `${v}px`)}
            {slider("friction", "friction", 0, 0.3, 0.005, (v) => v.toFixed(3))}
            {slider("max speed", "maxSpeed", 50, 1000, 10)}
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

        {/* CursorField — right on wide screens */}
        <div style={styles.pane}>
          <div style={{ ...styles.paneHeader, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1 }}>
              cursor field · click to start/stop <span style={{ opacity: 0.5 }}>(touch: hold to record)</span>
            </span>
            {[1, 0.5, 0.25, 0.125].map((r) => (
              <button
                key={r}
                onClick={() => setPlaybackRate(r)}
                style={{
                  ...styles.btn,
                  padding: "2px 8px",
                  borderColor: rate === r ? "#2dd4a8" : "#27473c",
                  color: rate === r ? "#2dd4a8" : "#cfe8df",
                }}
              >
                {r === 1 ? "1x" : r === 0.5 ? "½x" : r === 0.25 ? "¼x" : "⅛x"}
              </button>
            ))}
          </div>
          <canvas ref={cursorCanvasRef} style={{ ...styles.canvas, touchAction: "none", cursor: "crosshair" }} />
        </div>
      </div>

      <style>{`
        .panes { flex-direction: row; }
        @media (max-width: 720px) {
          .panes { flex-direction: column-reverse; }
        }
        input[type=range] { accent-color: #2dd4a8; }
      `}</style>
    </div>
  );
}

const styles = {
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
  controls: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "6px 16px", padding: "10px 14px", borderTop: "1px solid #17241f",
  },
  sliderLabel: { display: "flex", flexDirection: "column", gap: 2 },
  sliderText: { fontSize: 11, opacity: 0.8 },
};
