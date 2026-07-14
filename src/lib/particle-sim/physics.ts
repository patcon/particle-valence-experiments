import type { Params, Particle, Point } from "./types";

// coefficient matrix from cursor proximity (same cursor → dist 0 → max attract)
export function computeCoeffMatrix(cursors: (Point | null)[], P: Params): (number | null)[][] {
  const nCur = cursors.length;
  const coeffM: (number | null)[][] = [];
  for (let i = 0; i < nCur; i++) {
    coeffM.push([]);
    for (let j = 0; j < nCur; j++) {
      const ci = cursors[i], cj = cursors[j];
      if (!ci || !cj) { coeffM[i].push(null); continue; }
      const cursorDist = i === j ? 0 : Math.hypot(ci.x - cj.x, ci.y - cj.y);
      let closeness = 1 - cursorDist / Math.max(0.01, P.proximityRange);
      closeness = Math.max(-1, Math.min(1, closeness));
      coeffM[i].push(P.forceScale * closeness * (P.invert ? -1 : 1));
    }
  }
  return coeffM;
}

// pairwise forces between particles, coefficient from their cursors; mutates particle velocities
export function applyPairwiseForces(parts: Particle[], coeffM: (number | null)[][], P: Params, dt: number) {
  for (let i = 0; i < parts.length; i++) {
    for (let j = 0; j < parts.length; j++) {
      if (i === j) continue;
      const a = parts[i], b = parts[j];
      const coeff = coeffM[a.cursorIdx]?.[b.cursorIdx];
      if (coeff == null) continue;

      const dx = b.x - a.x, dy = b.y - a.y;
      const r = Math.hypot(dx, dy) || 0.001;
      const ux = dx / r, uy = dy / r;

      let f: number;
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
}

// integrate, center gravity, damp, clamp, bounce; mutates particles in place
export function integrateParticles(parts: Particle[], P: Params, dt: number, w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  for (const p of parts) {
    if (P.centerGravity > 0) {
      p.vx += (cx - p.x) * P.centerGravity * dt;
      p.vy += (cy - p.y) * P.centerGravity * dt;
    }
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
}
