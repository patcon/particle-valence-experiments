import type { Params } from "./types";

export const HUES = [165, 25, 210, 330, 60, 275, 105, 0, 190, 45, 300, 135];
export const colorFor = (i: number, a = 1) => `hsla(${HUES[i % HUES.length]}, 85%, 62%, ${a})`;

export const DEFAULT_PARAMS: Params = {
  forceScale: 180,     // overall force strength
  proximityRange: 0.4, // cursor distance (normalized) where attract flips to repel
  invert: false,       // false: close cursors attract, far cursors repel; true: flipped
  coreRadius: 22,      // px — inside this, particles always repel (personal space)
  falloff: 320,        // px — attraction fades to zero beyond this particle distance
  friction: 0.025,     // velocity damping per frame-ish
  maxSpeed: 480,       // px/s clamp
  centerGravity: 0,    // spring pull toward canvas center (0 = off, existing behavior)
  multiplier: 1,       // particles spawned per cursor
};
