import { useRef, useState, useEffect, useCallback, type ChangeEvent } from "react";
import { DEFAULT_PARAMS } from "../../lib/particle-sim/constants";
import { drawCursorField, drawParticleField, resizeCanvas } from "../../lib/particle-sim/draw";
import { buildExportPayload, downloadJSON, parseImportedRecordings } from "../../lib/particle-sim/io";
import { applyPairwiseForces, computeCoeffMatrix, integrateParticles } from "../../lib/particle-sim/physics";
import { pointAtLocalTime, sampleRecording } from "../../lib/particle-sim/sampleRecording";
import type { LiveRecording, Particle, Params, Recording } from "../../lib/particle-sim/types";
import { CursorPane } from "./CursorPane";
import { ParticlePane } from "./ParticlePane";
import { styles } from "./styles";
import { Toolbar } from "./Toolbar";

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

export default function CursorParticles() {
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- mutable sim state (refs so the RAF loop never resubscribes) ---
  const recordingsRef = useRef<Recording[]>([]);        // committed recordings
  const liveRef = useRef<LiveRecording | null>(null);   // {points, startedAt} while recording
  const tauRef = useRef(0);                             // virtual playback clock (ms), advances at `rate`
  const rateRef = useRef(1);                            // playback rate: 1, 1/2, 1/4, 1/8
  const syncStartRef = useRef(true);                    // sync all recordings to a shared loop period
  const particlesRef = useRef<Particle[]>([]);          // {x, y, vx, vy} in particle-canvas px
  const paramsRef = useRef<Params>({ ...DEFAULT_PARAMS });
  const pointerRef = useRef({ x: 0.5, y: 0.5, inside: false });
  const barRefsRef = useRef<(HTMLDivElement | null)[]>([]); // one progress bar per recording, indexed by cursorIdx

  // --- UI state ---
  const [recCount, setRecCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [params, setParams] = useState<Params>({ ...DEFAULT_PARAMS });
  const [rate, setRate] = useState(1);
  const [syncStart, setSyncStart] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setPlaybackRate = (r: number) => { rateRef.current = r; setRate(r); };
  const setBarRef = useCallback((i: number) => (el: HTMLDivElement | null) => {
    barRefsRef.current[i] = el;
  }, []);
  const setSyncStartTimes = (v: boolean) => {
    syncStartRef.current = v;
    tauRef.current = 0; // restart the shared loop clock so the toggle takes visible effect
    setSyncStart(v);
  };

  const syncParticles = useCallback(() => {
    const canvas = particleCanvasRef.current;
    const n = recordingsRef.current.length;
    const M = Math.max(1, Math.round(paramsRef.current.multiplier));
    const w = canvas ? canvas.clientWidth : 300;
    const h = canvas ? canvas.clientHeight : 300;
    const old = particlesRef.current;
    const next: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const mine = old.filter((p) => p.cursorIdx === i).slice(0, M);
      while (mine.length < M) {
        mine.push({
          x: w * (0.2 + 0.6 * Math.random()),
          y: h * (0.2 + 0.6 * Math.random()),
          vx: 0, vy: 0, cursorIdx: i,
        });
      }
      next.push(...mine);
    }
    particlesRef.current = next;
  }, []);

  const setParam = <K extends keyof Params>(key: K, value: Params[K]) => {
    paramsRef.current[key] = value;
    setParams((p) => ({ ...p, [key]: value }));
    if (key === "multiplier") syncParticles();
  };

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

    const norm = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      };
    };

    const record = (e: PointerEvent) => {
      const live = liveRef.current;
      if (!live) return;
      const { x, y } = norm(e);
      live.points.push({ x, y, t: performance.now() - live.startedAt });
    };

    const onDown = (e: PointerEvent) => {
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

    const onMove = (e: PointerEvent) => {
      const p = norm(e);
      pointerRef.current = { ...p, inside: true };
      record(e);
    };

    const onUp = (e: PointerEvent) => {
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
    let raf: number;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const recs = recordingsRef.current;
      const P = paramsRef.current;
      // playback rate slows cursor replay only; sim physics still runs at real dt
      tauRef.current += dt * 1000 * rateRef.current;
      const tau = tauRef.current;

      // shared loop period = longest recording; used both for synced playback
      // and to time each recording's own progress bar
      const period = recs.reduce((m, r) => Math.max(m, r.duration), 0);
      const localT = period > 0 ? tau % period : 0;

      // current cursor positions (normalized). In sync mode, every recording
      // is timed against the shared period and returns null once its own
      // (shorter) duration has elapsed — its particles go neutral until the
      // shared loop restarts.
      const cursors = syncStartRef.current
        ? recs.map((r) => pointAtLocalTime(r, localT))
        : recs.map((r) => sampleRecording(r, tau));

      // per-recording progress bar: fraction of its own duration elapsed this loop
      recs.forEach((r, i) => {
        const bar = barRefsRef.current[i];
        if (!bar) return;
        const t = syncStartRef.current ? localT : tau % r.duration;
        const ended = syncStartRef.current && t > r.duration;
        const frac = r.duration > 0 ? Math.min(1, t / r.duration) : 0;
        bar.style.width = `${frac * 100}%`;
        bar.style.opacity = ended ? "0.3" : "1";
      });

      // ---- CursorField ----
      const cc = cursorCanvasRef.current;
      if (cc) {
        const [ctx, w, h] = resizeCanvas(cc);
        drawCursorField(ctx, w, h, recs, cursors, liveRef.current, pointerRef.current);
      }

      // ---- ParticleField ----
      const pc = particleCanvasRef.current;
      if (pc) {
        const [ctx, w, h] = resizeCanvas(pc);
        const parts = particlesRef.current;

        const coeffM = computeCoeffMatrix(cursors, P);
        applyPairwiseForces(parts, coeffM, P, dt);
        integrateParticles(parts, P, dt, w, h);

        drawParticleField(ctx, w, h, parts, cursors);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------------- import / export ----------------
  const exportJSON = () => {
    downloadJSON(buildExportPayload(recordingsRef.current), `cursor-recordings-${Date.now()}.json`);
  };

  const importJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        recordingsRef.current = parseImportedRecordings(reader.result as string);
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

  return (
    <div style={styles.app}>
      <Toolbar
        recCount={recCount}
        isRecording={isRecording}
        onImport={importJSON}
        onExport={exportJSON}
        onClear={clearAll}
        fileInputRef={fileInputRef}
      />

      <div style={styles.panes} className="panes">
        {/* Particle sim — left on wide screens */}
        <ParticlePane canvasRef={particleCanvasRef} params={params} setParam={setParam} />

        {/* CursorField — right on wide screens */}
        <CursorPane
          canvasRef={cursorCanvasRef}
          rate={rate}
          onSetRate={setPlaybackRate}
          syncStart={syncStart}
          onSetSyncStart={setSyncStartTimes}
          recCount={recCount}
          setBarRef={setBarRef}
        />
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
