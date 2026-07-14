export interface Point {
  x: number;
  y: number;
  t: number;
}

export interface Recording {
  points: Point[];
  duration: number;
  _idx?: number;
}

export interface LiveRecording {
  points: Point[];
  startedAt: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cursorIdx: number;
}

export interface Params {
  forceScale: number;
  proximityRange: number;
  invert: boolean;
  coreRadius: number;
  falloff: number;
  friction: number;
  maxSpeed: number;
  centerGravity: number;
  multiplier: number;
}
