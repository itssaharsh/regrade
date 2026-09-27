# Build plan — Regrade (hackathon-build, adapted to a 6–12 h solo build for Devpost "Build With AI: Basics")

> Historical: this is the plan as written before the build. The scheduler, tests and file list changed during it; ARCHITECTURE.md and docs/adr describe what was built.

Eligibility first: the project starts in this empty folder (created 2026-09-26, inside the submission period), is planned and built through the Devpost Learn skill pack (1-start → 6-ship; the learner delegated the interviews and the build to the agent, so the planning documents are agent-drafted and stay status: draft until the learner reads them and approves), and commits devpost/scope.md, prd.md, spec.md, checklist.md and app-map.html. This plan and UI-SPEC.md are inputs to those interviews, not substitutes.

## R13 Demo script before code
The shot list is UI-SPEC.md §2. Build only what appears in it: results in, band board, Generate, grid, chips, unscheduled list, export preview, download, verify script. Nothing else.

## Architecture (R23: one serious dependency per surface; here none at runtime)
- Vite + TypeScript, vanilla DOM. One page. No framework, no state library, no CSS framework.
- `src/model.ts` types (Team, Result, Band, Slot, Fixture, Block).
- `src/results.ts` parse pasted results (the FA uploader's nine-column layout with scores filled, or a simple `home,away,homeScore,awayScore,date` table); per-team played, goals for/against, goal difference per game.
- `src/banding.ts` propose bands by GD/game with a target spread; move a team between bands.
- `src/scheduler.ts` per band: circle-method round robin for the next 4 rounds, skipping pairings already played this season; then slot assignment (venue × pitch × time per Saturday) by backtracking with hard constraints (one fixture per slot; one fixture per team per week; no repeat pairing in the block) and soft ones (home/away alternation per team). Returns fixtures, unscheduled, and the counters.
- `src/export.ts` fixtureupload.csv writer: Date DD/MM/YYYY, Time HH:MM, Division, Home Team, Away Team, Venue, Pitch, Home Score, Away Score (blank).
- `src/seed.ts` deterministic fictional league (seeded PRNG): Oakford & District Youth League, U9, 48 teams, 3 bands, 2 venues × 4 pitches × 3 slots (09:00, 10:00, 11:00), 6 weeks of results from latent strengths.
- `src/main.ts` band board, grid, chips, import panel, slots panel, export panel; `?state=` forces states; Alt+Shift+R resets; Alt+Shift+G generates.
- `scripts/validate.ts` (R18): seed → band → schedule 4 weeks → assert 0 clashes, 0 repeats, |home−away| ≤ 1 per team, every team once per week, CSV has 9 columns and DD/MM/YYYY dates → print PASS/FAIL. Runs offline in under a second.
- `tests/scheduler.test.ts` (R Step 7): the branching functions a judge would probe: `proposeBands`, `roundRobin`, `assignSlots` (capacity shortfall returns the unscheduled list, never a silent partial).

## Demo world (R17)
The seed is the demo world. Two scenarios: (1) the happy block: 24 slots, 24 fixtures per week, fills to 0/0/balanced; (2) the shortfall: one pitch removed → 18 slots → "6 fixtures don't fit" with the suggestion; adding a slot returns to 0. Both reproducible from the seed; no network.

## Time budget (6–12 h solo, with a coding agent)
| Hours | What |
|---|---|
| 0–1 | skill pack 1-start, 2-scope, 3-prd, 4-spec with the learner's answers (UI-SPEC and this plan as the draft answers) |
| 1–3 | slice 1: seed, results parsing, banding, the band board on screen (ugly is fine) |
| 3–6 | slice 2: scheduler with constraints and the unscheduled path; validate script PASS; grid on screen |
| 6–8 | slice 3: export in the FA layout; chips; states; tokens and type; responsive pass |
| 8–9 | slice 4: motion (T-01…T-05), keyboard band moves, accessibility pass, anti-slop grep |
| 9–10 | README (evidence table by criterion, real-vs-simulated, 3-command quickstart), CI, ADRs |
| 10–12 | 5-build wrap-up and app map; 6-ship: video (≤3 min), public repo, learner-written submission |

## Quality signals (R19, R21, R22)
- `.github/workflows/ci.yml`: install → typecheck → test → build.
- ADRs (3): why no framework; why backtracking over a solver library; why pasted results over an API (no league-level export evidenced).
- AI use disclosed in the README and a minimal CLAUDE.md; the skill pack's learner-profile.md stays uncommitted.

## Deploy (R20)
Static `vite build` to GitHub Pages (a live URL is optional for this event; the video must show the loop). Warm the URL before recording.

## Submission (R40–R48)
- Video ≤ 3:00, product on screen by 0:10, aha by 0:45, captions, 1080p.
- README hero: the filled-grid GIF, video and repo links, what and why, a Mermaid diagram (results → bands → scheduler → CSV), an evidence table with the four criteria in the rubric's own words, "what's real vs synthetic", limitations (2015 uploader layout to confirm; results must be pasted; mini-soccer central venues only), 3-command quickstart.
- The learner writes the project name, tagline (the outcome, not the mechanism), description and survey answers (6-ship rule).

## Scope ladder (R53)
1. cut: keyboard band moves, motion beyond the fill; 2. mock: nothing (no network); 3. simplify: one band, fixed slots; 4. pivot: not planned.
