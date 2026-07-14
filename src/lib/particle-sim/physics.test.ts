import { describe, expect, it } from "vitest";
import { applyPairwiseForces, computeCoeffMatrix, integrateParticles } from "./physics";
import type { Params, Particle } from "./types";

const baseParams: Params = {
  forceScale: 100,
  proximityRange: 0.5,
  invert: false,
  coreRadius: 10,
  falloff: 100,
  friction: 0,
  maxSpeed: 1000,
  centerGravity: 0,
  multiplier: 1,
};

describe("computeCoeffMatrix", () => {
  it("gives max attraction between coincident cursors", () => {
    const cursors = [{ x: 0.5, y: 0.5, t: 0 }];
    const m = computeCoeffMatrix(cursors, baseParams);
    expect(m[0][0]).toBeCloseTo(baseParams.forceScale);
  });

  it("gives negative coefficient for cursors beyond proximityRange", () => {
    const cursors = [{ x: 0, y: 0, t: 0 }, { x: 1, y: 0, t: 0 }];
    const m = computeCoeffMatrix(cursors, baseParams);
    expect(m[0][1]!).toBeLessThan(0);
  });

  it("inverts sign when invert param is set", () => {
    const cursors = [{ x: 0.5, y: 0.5, t: 0 }];
    const m = computeCoeffMatrix(cursors, { ...baseParams, invert: true });
    expect(m[0][0]).toBeCloseTo(-baseParams.forceScale);
  });

  it("uses null when either cursor is missing (not currently playing)", () => {
    const cursors = [null, { x: 0.5, y: 0.5, t: 0 }];
    const m = computeCoeffMatrix(cursors, baseParams);
    expect(m[0][1]).toBeNull();
  });
});

describe("applyPairwiseForces", () => {
  it("pushes particles apart when inside the core radius", () => {
    const parts: Particle[] = [
      { x: 0, y: 0, vx: 0, vy: 0, cursorIdx: 0 },
      { x: 5, y: 0, vx: 0, vy: 0, cursorIdx: 0 },
    ];
    const coeffM = [[100]];
    applyPairwiseForces(parts, coeffM, baseParams, 1);
    expect(parts[0].vx).toBeLessThan(0); // pushed away from b (which is to the right)
    expect(parts[1].vx).toBeGreaterThan(0);
  });

  it("attracts particles toward each other outside the core when coeff is positive", () => {
    const parts: Particle[] = [
      { x: 0, y: 0, vx: 0, vy: 0, cursorIdx: 0 },
      { x: 20, y: 0, vx: 0, vy: 0, cursorIdx: 0 },
    ];
    const coeffM = [[50]];
    applyPairwiseForces(parts, coeffM, baseParams, 1);
    expect(parts[0].vx).toBeGreaterThan(0); // pulled toward b
  });

  it("skips a pair when their cursors' coefficient is null", () => {
    const parts: Particle[] = [
      { x: 0, y: 0, vx: 0, vy: 0, cursorIdx: 0 },
      { x: 20, y: 0, vx: 0, vy: 0, cursorIdx: 1 },
    ];
    const coeffM = [[100, null], [null, 100]];
    applyPairwiseForces(parts, coeffM, baseParams, 1);
    expect(parts[0].vx).toBe(0);
    expect(parts[1].vx).toBe(0);
  });
});

describe("integrateParticles", () => {
  it("moves a particle by velocity * dt", () => {
    const parts: Particle[] = [{ x: 50, y: 50, vx: 10, vy: 0, cursorIdx: 0 }];
    integrateParticles(parts, baseParams, 1, 200, 200);
    expect(parts[0].x).toBeCloseTo(60);
  });

  it("clamps speed to maxSpeed", () => {
    const parts: Particle[] = [{ x: 50, y: 50, vx: 5000, vy: 0, cursorIdx: 0 }];
    integrateParticles(parts, { ...baseParams, maxSpeed: 100 }, 1, 1000, 1000);
    expect(Math.hypot(parts[0].vx, parts[0].vy)).toBeCloseTo(100);
  });

  it("bounces off the left/top wall", () => {
    const parts: Particle[] = [{ x: 2, y: 2, vx: -50, vy: -50, cursorIdx: 0 }];
    integrateParticles(parts, baseParams, 1, 200, 200);
    expect(parts[0].x).toBe(6);
    expect(parts[0].vx).toBeGreaterThan(0);
    expect(parts[0].y).toBe(6);
    expect(parts[0].vy).toBeGreaterThan(0);
  });

  it("bounces off the right/bottom wall", () => {
    const parts: Particle[] = [{ x: 198, y: 198, vx: 50, vy: 50, cursorIdx: 0 }];
    integrateParticles(parts, baseParams, 1, 200, 200);
    expect(parts[0].x).toBe(194);
    expect(parts[0].vx).toBeLessThan(0);
    expect(parts[0].y).toBe(194);
    expect(parts[0].vy).toBeLessThan(0);
  });

  it("applies center gravity toward canvas center", () => {
    const parts: Particle[] = [{ x: 0, y: 100, vx: 0, vy: 0, cursorIdx: 0 }];
    integrateParticles(parts, { ...baseParams, centerGravity: 1 }, 1, 200, 200);
    expect(parts[0].vx).toBeGreaterThan(0); // pulled toward cx=100
  });

  it("applies friction to damp velocity", () => {
    const parts: Particle[] = [{ x: 100, y: 100, vx: 100, vy: 0, cursorIdx: 0 }];
    integrateParticles(parts, { ...baseParams, friction: 0.5 }, 0, 200, 200);
    expect(parts[0].vx).toBeCloseTo(50);
  });
});
