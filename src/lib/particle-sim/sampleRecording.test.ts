import { describe, expect, it } from "vitest";
import { sampleRecording } from "./sampleRecording";
import type { Recording } from "./types";

describe("sampleRecording", () => {
  it("returns null for an empty recording", () => {
    const rec: Recording = { points: [], duration: 0 };
    expect(sampleRecording(rec, 0)).toBeNull();
  });

  it("returns the single point for a one-point recording", () => {
    const rec: Recording = { points: [{ x: 0.3, y: 0.7, t: 0 }], duration: 100 };
    expect(sampleRecording(rec, 50)).toEqual({ x: 0.3, y: 0.7, t: 0 });
  });

  it("interpolates linearly between two points", () => {
    const rec: Recording = {
      points: [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 20, t: 100 },
      ],
      duration: 100,
    };
    const p = sampleRecording(rec, 50)!;
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(10);
    expect(p.t).toBe(50);
  });

  it("wraps tau by the recording's duration to loop playback", () => {
    const rec: Recording = {
      points: [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 0, t: 100 },
      ],
      duration: 100,
    };
    const looped = sampleRecording(rec, 150)!;
    const direct = sampleRecording({ ...rec, _idx: 0 }, 50)!;
    expect(looped.x).toBeCloseTo(direct.x);
  });

  it("advances through multiple segments as tau increases", () => {
    const rec: Recording = {
      points: [
        { x: 0, y: 0, t: 0 },
        { x: 10, y: 0, t: 50 },
        { x: 20, y: 0, t: 100 },
      ],
      duration: 100,
    };
    const early = sampleRecording(rec, 10)!;
    const late = sampleRecording(rec, 90)!;
    expect(early.x).toBeCloseTo(2);
    expect(late.x).toBeCloseTo(18);
  });
});
