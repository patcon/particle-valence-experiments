# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (not npm/yarn).

- `pnpm install` — install dependencies
- `pnpm dev` — start Vite dev server
- `pnpm build` — type-check (`tsc -b`) then production build via Vite
- `pnpm preview` — preview the production build locally
- `pnpm lint` — run oxlint

There is no test suite configured in this repo.

## Architecture

This is a small Vite + React + TypeScript app for particle-simulation experiments. The entire app logic lives in one component: `src/components/cursor-particles.tsx`, rendered by `src/App.tsx` → `src/main.tsx`.

`cursor-particles.tsx` implements two coupled canvas-based systems, laid out side by side:

- **CursorField** (right pane): records pointer paths as normalized (0..1) `{x, y, t}` point sequences. Desktop click toggles recording; touch press-and-hold records. Each committed recording loops on independent playback, replayed via `sampleRecording(rec, tau)`.
- **ParticleField** (left pane): spawns particles per recording (`multiplier` particles per cursor). A pairwise force between particles is derived live each frame from the proximity of their *cursors'* current replayed positions — not the particles' own positions. Close cursors attract their particles, far cursors repel (or the inverse, via the `invert` param). Sliders adjust `forceScale`, `proximityRange`, `coreRadius`, `falloff`, `friction`, `maxSpeed`, `centerGravity`, `multiplier`.

Key implementation details:

- All simulation state (recordings, live recording buffer, particles, playback clock, tunable params) is held in `useRef`s, not React state, so the `requestAnimationFrame` loop never resubscribes/re-renders on every physics tick. React `useState` only mirrors the subset needed to drive UI (slider values, recording indicator, recording count).
- A single RAF loop (in a `useEffect` with empty deps) advances both canvases each frame: it samples cursor positions at the current virtual clock (`tauRef`, advanced by wall-clock `dt * rate`), computes the pairwise force coefficient matrix between cursors, applies forces/friction/center-gravity/bounds to particles, then draws both canvases.
- Recordings are normalized to 0..1 coordinates specifically so they survive canvas resizes and export/import across different screen sizes.
- Import/export use a versioned JSON blob (`{version, exportedAt, recordings}`) via `Blob`/`FileReader`, no backend involved — everything is client-side.
- Styling is inline JS style objects (`styles` object at the bottom of the file, typed via `satisfies Record<string, CSSProperties>`), plus one `<style>` tag for the responsive pane layout media query. There is no CSS framework.

## TypeScript config notes

`tsconfig.app.json` enables `verbatimModuleSyntax`, so type-only imports must use `import type { ... }` (see the `ChangeEvent`/`CSSProperties` imports in `cursor-particles.tsx`). `noUnusedLocals`/`noUnusedParameters` are also enforced.
