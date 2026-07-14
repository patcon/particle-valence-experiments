import type { Point, Recording } from "./types";

// position of a recording's cursor at loop-time tau (ms)
export function sampleRecording(rec: Recording, tau: number): Point | null {
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
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, t };
}
