# Refactor cursor-particles.tsx into components + helpers

Pure, behavior-preserving refactor of `src/components/cursor-particles.tsx` (575 lines)
into `src/lib/particle-sim/*` (pure logic) and `src/components/cursor-particles/*` (UI).

No new test framework beyond vitest for the pure modules; UI/canvas wiring is verified
via `pnpm build` + `pnpm lint` + manual smoke check (no framework meaningfully covers
raw canvas/pointer-event code).

## Tasks

1. [x] Set up vitest (`pnpm add -D vitest`, `test` script) — done ahead of task loop
2. [ ] Extract `src/lib/particle-sim/types.ts` (Point, Recording, LiveRecording, Particle, Params)
3. [ ] Extract `src/lib/particle-sim/constants.ts` (HUES, colorFor, DEFAULT_PARAMS)
4. [ ] Extract `src/lib/particle-sim/sampleRecording.ts` + vitest tests (RED→GREEN)
5. [ ] Extract `src/lib/particle-sim/physics.ts` (coeff matrix, pairwise force, integration step) + vitest tests (RED→GREEN)
6. [ ] Extract `src/lib/particle-sim/io.ts` (exportJSON/importJSON logic) + vitest tests (RED→GREEN)
7. [ ] Extract `src/lib/particle-sim/draw.ts` (resize helper + two canvas draw routines) — no test, pure DOM/canvas side effects
8. [ ] Extract `src/components/cursor-particles/styles.ts`
9. [ ] Extract `src/components/cursor-particles/Slider.tsx`
10. [ ] Extract `src/components/cursor-particles/Toolbar.tsx`
11. [ ] Extract `src/components/cursor-particles/CursorPane.tsx`
12. [ ] Extract `src/components/cursor-particles/ParticlePane.tsx`
13. [ ] Assemble `src/components/cursor-particles/CursorParticles.tsx`, update `src/App.tsx`, delete old `src/components/cursor-particles.tsx`
14. [ ] Final verification: `pnpm build`, `pnpm lint`, `pnpm test`, manual smoke check in browser
