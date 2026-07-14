import { colorFor } from "./constants";
import type { LiveRecording, Particle, Point, Recording } from "./types";

export function resizeCanvas(canvas: HTMLCanvasElement): [CanvasRenderingContext2D, number, number] {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [ctx, w, h];
}

export function drawCursorField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  recs: Recording[],
  cursors: (Point | null)[],
  live: LiveRecording | null,
  pointer: { x: number; y: number; inside: boolean }
) {
  ctx.clearRect(0, 0, w, h);

  // faint trails of each recording's full path
  recs.forEach((r, i) => {
    ctx.beginPath();
    r.points.forEach((p, j) => {
      const x = p.x * w, y = p.y * h;
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colorFor(i, 0.18);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // live recording trail
  if (live && live.points.length > 1) {
    const i = recs.length; // color it as the next cursor
    ctx.beginPath();
    live.points.forEach((p, j) => {
      const x = p.x * w, y = p.y * h;
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
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
  if (live && pointer.inside) {
    ctx.beginPath();
    ctx.arc(pointer.x * w, pointer.y * h, 16, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,80,80,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawParticleField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  parts: Particle[],
  cursors: (Point | null)[] = []
) {
  ctx.clearRect(0, 0, w, h);
  parts.forEach((p) => {
    // cursor ended prematurely this loop (synced playback) — go neutral,
    // muted like the recording's own finished trail rather than flat gray
    const neutral = cursors[p.cursorIdx] === null;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colorFor(p.cursorIdx, neutral ? 0.18 : 0.95);
    ctx.fill();
  });
}
