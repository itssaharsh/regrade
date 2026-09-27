---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast (the learner delegated the build; verification kept at every slice, explanations short)

## Slices

- [x] **1. The seeded league parses, bands and schedules with every constraint proven**
  Becomes usable: `npm run validate` seeds the fictional league, proposes bands, generates four weeks and prints PASS or FAIL for every constraint; `npm test` covers pairing, banding and export.
  Why now: the kernel (re-banding plus block regeneration) is proven before any screen exists, so the UI only shows what already works.
  PRD ref: `prd.md > Generating the block`, `prd.md > Export`
  Spec ref: `spec.md > Components`, `spec.md > File Structure`
  Build: scaffold Vite + TypeScript, write model, results, banding, scheduler, export and seed modules, the vitest suite and scripts/validate.ts.
  Verify (mechanical): `npm run typecheck`, `npm test` (9 passing), `npm run validate` (ALL PASS: 96 fixtures, 0 clashes, 0 repeats, home/away gap 0, 24 unscheduled with 18 slots).
  Learner check: run `npm run validate` and read the PASS lines; the shortfall line shows the tool refuses to hide fixtures that do not fit.
  Commit: `Add seeded league, banding, scheduler and uploader export with tests`

- [x] **2. You can see the bands, generate a block and download the CSV**
  Becomes usable: the workspace with results summary, band board (drag and arrows), pitch slots, week tabs, chips, the pitch-plan grid, the unscheduled list, the export preview and download.
  Why now: the whole core journey on screen, ugly parts allowed, so every later slice is polish on a working loop.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components > Workspace`
  Build: index.html, src/style.css tokens and layout, src/main.ts state and render functions, `?state=` variants, shortcuts, status region.
  Verify (mechanical): `npm run build`; Playwright at 390 and 1440 with axe: no page errors; Generate yields 24 fixture cells for week 1 with chips 0/0/0; Download names fixtureupload.csv; a move shows the stale notice.
  Learner check: open the app, click Generate 4 weeks, drag a team down a band, generate again, download the CSV and open it next to the FA column list.
  Commit: `Add the workspace: bands, slots, grid, export`

- [x] **3. Keyboard and screen-reader paths, and the two axe findings**
  Becomes usable: the grid scroll region is focusable and named; the error list keeps list semantics inside an alert; arrows move teams without a mouse; the status region announces generation, moves and downloads.
  Why now: the demo must survive a judge who tabs through it.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Components > Workspace`
  Build: role/tabindex on the grid wrapper, alert wrapper around the error list.
  Verify (mechanical): re-run qa/shots.py; axe reports 0 violations at 1440 for every state.
  Learner check: tab from the top of the page to Generate and press Enter; use the arrow buttons to move a team.
  Commit: `Fix scrollable grid focus and error-list semantics`

- [x] **4. README, CI, ADRs and a live URL**
  Becomes usable: a public repo with a green check, a README that maps each judging criterion to evidence and says what is synthetic, and a GitHub Pages deployment.
  Why now: required deliverables a day early (video, README, live link).
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: README.md, .github/workflows/ci.yml and pages.yml, docs/adr, CLAUDE.md; `gh repo create` and push; enable Pages from the workflow.
  Verify (mechanical): CI green (typecheck, tests, validate, build); https://itssaharsh.github.io/regrade/ loads and the demo-kit probe ran 32 actions against it with 0 failures.
  Learner check: open the live URL on your phone; the Generate button sits at the bottom of the screen.
  Commit: `Add README, CI, Pages deployment and decision records`

## Hands-on Checkpoints

- [ ] Early feedback: the learner tries Generate, a drag and Download on the live URL and reports what felt wrong.
- [ ] Final review: after the demo video, the learner reads scope, PRD and spec, and says "looks good" or asks for changes; statuses flip to approved then.

## Revisions

- 2026-09-26: grid split into one table per venue after the 1440 still showed the second venue cut off; side column narrowed so four pitch columns fit at 1280.
- 2026-09-26: pairing algorithm replaced (rotating round robin → per-week matching) after validate showed 4 repeat pairings and a home/away gap of 4; see docs/adr/0002.

## Final Review

- [ ] Recorded after the learner's review.

## Code Tour and App Map

- [ ] `devpost/app-map.html` written at wrap-up.
- 2026-09-27: fonts self-hosted and preloaded, and the page shell kept unpainted until the first render, after Lighthouse measured a desktop layout shift of 0.85; now 0 on desktop and mobile.
- 2026-09-27: banding now counts each division above as 2 goals a game stronger, because results only come from games inside a division; against the sample's hidden strengths this misplaces 16 of 48 teams instead of 24, and validate checks it (docs/adr/0004).
- 2026-09-27: after four final reviews: the first Saturday is picked from a list, a block keeps the slots it was generated in, Download is blocked while the block is out of date, bands without a division ask for their Full-Time name, moved teams show their old division, and validate recounts every constraint from the exported file (.prod-build/reports/final-reviews.md).
