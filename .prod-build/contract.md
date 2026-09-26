# Implementation contract — Regrade (hackathon mode, direct channel)

Upstream read, not regenerated: `hackathon-idea/build-with-ai-basics-2026-10/ideas.json` (idea "Re-grade and re-fixture"), `UI-SPEC.md`, `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`, `BUILD-PLAN.md`.

## Intent
The volunteer fixtures secretary of a U7–U11 mini-soccer league in England, at a laptop on a weekday evening every four to six weeks with a block of results in. Before: four to five hours per age group re-sorting teams and re-making fixtures in Excel, then uploading a spreadsheet to FA Full-Time. After: paste the results, accept or drag the bands, generate the next four weeks inside the league's own pitch slots, download fixtureupload.csv, upload it.

## Scope
- MUST (core, main workflow, judged): results paste (uploader layout with scores, or a simple table) with named bad rows; sample league loaded by default and labelled synthetic; bands by goals per game with spread, drag and arrow moves; slot setup (venues, pitches, times, first Saturday); four-week block with no repeat pairings, home/away within one, one fixture per slot, one fixture per team per week; counters on screen; unscheduled list when fixtures don't fit; fixtureupload.csv export in the FA uploader's nine columns; validate script and tests; planning documents in `devpost/` (Stage One eligibility).
- SHOULD: keyboard path and screen-reader announcements; `?state=` harness; reset shortcut; per-venue tables that fit at 1280.
- COULD (listed, not built): shareable link to a block; import of a Full-Time fixtures download; Sunday slots; configurable band count.
- WON'T now: accounts, persistence, postponement re-slotting, referees, cups, multi-age workspaces, any model call, live fetch from Full-Time.

## Core journeys
- J1 Generate: open (sample loaded) → bands shown → Generate → grid fills, chips 0/0/≤1 → Download → fixtureupload.csv saved.
- J2 Regrade: move a team (drag or arrow) → spreads update, block marked changed → Generate → new block.
- J3 Shortfall: remove pitches → Generate → unscheduled list names every fixture that doesn't fit with the shortfall and a suggestion.

## Surfaces
S1 Workspace `/` (UI-SPEC §3): Results panel (S1.import), Bands, Pitch slots, week tabs, chips, Generate, grid, unscheduled list, Export (S1.export), solver log. No other routes.

## States per journey
| State | J1 | J2 | J3 |
|---|---|---|---|
| initial | sample loaded, grid placeholder "Generate to fill 4 weeks" | same | same |
| loading | n/a: the solver is synchronous and under 50 ms for 48 teams (measured by validate) | n/a | n/a |
| success | grid filled, chips green at 0, export shown | new block, stale line gone | fixtures that fit placed |
| error | bad results rows named, input kept (S1.import) | n/a: moves cannot fail | n/a |
| empty | grid placeholder; export hidden | n/a | n/a |
| partial | n/a | n/a | red list of unscheduled fixtures, grid shows what fit |
| retry | Regenerate after any change | same | add a pitch → Regenerate → 0 |
| disabled | n/a: Generate is always enabled because results are always loaded (sample) | n/a | n/a |
| permission-denied | n/a: no accounts | n/a | n/a |
| offline/degraded | works offline once loaded; fonts fall back to system fonts | same | same |

## Data
| Entity | Key fields | Owner | Persistence | Source of truth | PII |
|---|---|---|---|---|---|
| Team | id, name, club | the user's paste | none (memory) | the pasted results | none (team names) |
| Result | date, division, home, away, scores | user | none | the paste | none |
| Band | id, name, teamIds | user | none | the proposal plus moves | none |
| Setup | venues, pitches, times, weeks, firstSaturday | user | none | the slots panel | none |
| Block | fixtures, unscheduled, counters, log | app | none | generateBlock output | none |
The downloaded CSV is the only record. No data leaves the browser.

## Interfaces
| Boundary | Contract | Failure mode | Fallback |
|---|---|---|---|
| Results paste → parser | `src/results.ts` parseResults | unknown header, missing scores | header error or per-row errors; good rows load |
| Bands → scheduler | `src/scheduler.ts` generateBlock | strict matching impossible for a week | relax balance, then allow played pairs, counted and logged |
| Slots → scheduler | Setup | more fixtures than slots | unscheduled list with reason and suggestion |
| Block → CSV | `src/export.ts` toUploaderCsv | none | n/a |
| Google Fonts | CSS link | blocked/offline | system fonts |
| GitHub Pages | static hosting | 404 on deep links | single route only |

## Constraints
- Judging (verbatim, equal weights, 1–5 stars each): "Design: Does the project deliver a complete, coherent product experience — not just a technical proof of concept?" · "Potential Impact: Does the project make a credible, specific case for solving a real problem for a real audience — and does the solution actually address that problem based on what's demonstrated?" · "Innovation/Idea: How creative and novel is the concept and does the project differ from existing concepts?" · "Presentation: Does the video clearly demonstrate the project working end-to-end?"
- Stage One (pass/fail): "the Project reasonably fits the theme and was built using the Devpost Learn skill pack"; planning documents scope.md, prd.md, spec.md in the repo; "Projects must be newly created during the Submission Period"; video under three minutes on YouTube or Vimeo; public repo; text description.
- Deadline: 2026-10-26 17:00 EDT. Platform: static site, no server, no secrets. No abuse limits needed (no write endpoints).
- Performance budget: first screen usable under 2.5 s on a laptop; the solver under 200 ms for 64 teams.

## Acceptance criteria
- AC-1: WHEN the seeded league is generated THE SYSTEM SHALL place 96 fixtures with 0 clashes, 0 repeat pairings and a home/away gap ≤ 1. Verify: `npm run validate`, `npm test`. P0.
- AC-2: IF more fixtures are needed than slots exist THEN THE SYSTEM SHALL list every unscheduled fixture by name with the shortfall and never render a silent partial grid. Verify: `npm test` (shortfall case), browser J3. P0.
- AC-3: WHEN the CSV is downloaded THE SYSTEM SHALL name it fixtureupload.csv with the header Date,Time,Division,Home Team,Away Team,Venue,Pitch,Home Score,Away Score and DD/MM/YYYY dates. Verify: `npm test` (export), browser J1. P0.
- AC-4: WHEN a team is moved between bands THE SYSTEM SHALL keep all 48 teams, update both spreads, mark the block changed and announce the move in the status region. Verify: `npm test` (moveTeam), browser J2. P0.
- AC-5: IF a results row lacks a score THEN THE SYSTEM SHALL name the row and the teams and keep the input. Verify: browser `?state=error`. P1.
- AC-6: WHEN the page loads at 390 or 1440 THE SYSTEM SHALL show no console errors and no axe violations (wcag2a/aa, 21a/aa, 22aa). Verify: `python3 qa/shots.py` against a preview. P1.
- AC-7: WHEN the live URL is opened logged out THE SYSTEM SHALL complete J1 three times in a row with a reset between runs. Verify: observe: demo flow ×3 on https://itssaharsh.github.io/regrade/. P0.

## Assumptions
- A-1 [reversible]: the FA uploader layout in the 2015 guide is current — labelled on screen; validate by a league admin's upload.
- A-2 [safe]: three bands suit a 48-team age group — the sample; configurable later.
- A-3 [safe]: results are pasted, not fetched — no league-level export was evidenced.
- A-4 [reversible]: judges watch at 1280×720 or larger — the grid fits four pitch columns at 1280; narrower screens scroll inside the region.

## Demo script
UI-SPEC §2 and `regrade-demo/demo/storyboard.json`: hook (forum quote) 0–10 s; problem card; bands with the regraded count; one tap moves Ashby Lions Whites; Generate fills the grid, chips 0/0; week 3 and the second venue; export preview and download; two pitches removed → 24 fixtures don't fit; tech flow card (no model, validate script, skill pack); end card with the URL. Under 2:30.
