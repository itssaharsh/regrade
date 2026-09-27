---
doc: spec
status: draft
---

# Regrade — Technical Spec

## How This Works, In Plain Language
Regrade is one web page that runs entirely in the browser. It has five parts. The results reader turns pasted rows into a list of games and a tally per team (played, goals for and against, goal difference per game). The bander sorts the tally and splits it into bands. The scheduler does two jobs for each band: it picks who plays whom on each of the next four Saturdays without repeating games already played and keeping home and away even, then it gives every game a venue, pitch and time from the slots the secretary set up. The exporter writes the fixtures in the exact column order the FA's Full-Time uploader expects. The screen shows the bands, the grid and the counters, and lets the secretary drag teams and change slots. Nothing is sent anywhere and nothing is stored: the download is the result. This shape was chosen because the whole job is arithmetic and search; a server, a database or a model would add moving parts without adding value.

## The Core Journey Through the System
The secretary pastes results → `results.ts` parses rows, names bad ones, and computes each team's tally → `banding.ts` proposes three bands by goals per game → the band board renders them; a drag calls `moveTeam` and marks the block stale → the slots panel edits the `Setup` (venues, pitches, times, first Saturday) → Generate calls `scheduler.ts > generateBlock`: for each band `chooseRounds` finds four Saturdays of pairings (a matching search avoiding played pairs and balancing home/away), then every fixture gets a slot by a scored greedy assignment with hard constraints → `countConstraints` recounts clashes and team clashes independently → the grid, chips, unscheduled list and export preview render → Download calls `export.ts > toUploaderCsv` and saves fixtureupload.csv. PRD ref: `prd.md > The Core Journey`.

## Stack
- TypeScript 5 with Vite 6 for the dev server and build (https://vite.dev); vanilla DOM, no framework: one page, one state object, render functions. Tradeoff accepted: a little more hand-written DOM code in exchange for zero runtime dependencies.
- Vitest 3 for tests (https://vitest.dev); Node's built-in type stripping runs the validate script without extra tooling.
- Fonts self-hosted from `public/fonts` (Barlow Condensed, Public Sans, Chivo Mono; SIL Open Font License; latin subset), the two above the fold preloaded; the page still works if they fail to load.
- Verified by `npm test`, `npm run validate` and the QA script (qa/shots.py): the parser, banding, scheduler, export and the workspace states on a synthetic league.
- Unverified: the 2015 uploader column layout against a live Full-Time uploader; that the exported division names exist in a real league's Full-Time; behaviour on a real league's season.

## Where It Runs and How Someone Tries It
Runs in any modern browser as static files. Requirements to develop: Node.js 22 and Git. Commands: `npm install`, `npm run dev` (open http://localhost:5173), `npm test`, `npm run validate`, `npm run build`. For the demo recording open the dev or preview server, click Generate 4 weeks, then Download. Deployment (optional, chosen): GitHub Pages from the `main` branch via a workflow that builds with `BASE_PATH=/regrade/`.

## Look and Feel
White canvas, black ink, cone orange (`#EE5A24`) for the one primary button, band swatches in claret, royal and amber always with a letter, a green pitch-line motif only in the grid headers. Barlow Condensed 700 for pitch numbers, times, week tabs and section headings; Public Sans 400/600 for everything else; Chivo Mono in the CSV preview only. Dense but calm; the grid fills in slot order on Generate; other motion is limited to hover and press. Copy in sentence case, buttons name outcomes. Tokens in `src/style.css`; direction in UI-SPEC.md. The stack honours all of it.

## Components

### Results reader (`src/results.ts`)
Parses CSV rows (quotes respected), detects the uploader or simple layout by header names, normalises dates, builds the team list and per-team tally, and the set of pairings already played. PRD ref: `prd.md > Results in`.

### Bander (`src/banding.ts`)
`proposeBands` (goal difference per game, each division above counted as `DIVISION_GAP` = 2 goals a game stronger because results only come from games inside a division; docs/adr/0004), `divisionLevels`, `bandScore`, `moveTeam`, `bandSpread`, `divisionNames`, `movedTeams`. PRD ref: `prd.md > Banding`.

### Scheduler (`src/scheduler.ts`)
`circleRounds` (used by the seed to build the sample season, and by tests), `chooseRounds` (per-week matching with backtracking: no repeats, balanced home/away, relaxed in steps and reported), `generateBlock` (slots, preferences, unscheduled list, log), `countConstraints` (independent recount). PRD ref: `prd.md > Generating the block`.

### Exporter (`src/export.ts`)
`UPLOADER_COLUMNS`, `toUploaderCsv`, `fixtureRow`. PRD ref: `prd.md > Export`.

### Seed (`src/seed.ts`)
A deterministic fictional league (seeded PRNG): 24 clubs, 48 teams, two venues of four pitches, three times, six Saturdays of results in guessed divisions so that re-grading visibly matters. PRD ref: `prd.md > States and Boundaries` (first use).

### Workspace (`src/main.ts`, `index.html`, `src/style.css`)
State, render functions for the six regions, drag and drop plus arrow buttons, `?state=` for first-run, generated, stale, partial and error, Alt+Shift+R reset and Alt+Shift+G generate, a live status region. PRD ref: `prd.md > Screens and Layout`.

## Data Model
In-memory only: `Team {id, name, club}`, `Result`, `TeamStats`, `Band {id, name, teamIds}`, `Setup {venues[{name, pitches[]}], times[], weeks, firstSaturday}`, `Fixture {week, date, time, division, homeId, awayId, venue, pitch}`, `Block {fixtures, unscheduled, counters, log, slotsPerWeek, neededPerWeek, byes}`. Leaving the page discards everything; the downloaded CSV is the record.

## File Structure
```
regrade/
├── index.html            # the one page
├── src/
│   ├── main.ts           # state and rendering
│   ├── style.css         # tokens and layout
│   ├── model.ts          # types
│   ├── results.ts        # parsing and tallies
│   ├── banding.ts        # bands
│   ├── scheduler.ts      # pairings and slots
│   ├── export.ts         # fixtureupload.csv
│   └── seed.ts           # fictional league
├── scripts/validate.ts   # PASS/FAIL proof on the seed
├── tests/                # scheduler, byes and rules tests
├── qa/                   # shots.py (screenshots, axe, interactions), live-demo.py
├── public/               # icon.svg, 404.html, fonts/ (self-hosted woff2)
├── devpost/              # Devpost learning workspace
├── UI-SPEC.md, BUILD-PLAN.md, docs/adr/
└── .github/workflows/    # ci.yml, pages.yml
```

## External Services and Dependencies
None at runtime: fonts are self-hosted, so the page makes no third-party requests. GitHub Pages hosts the static build.

## Important Failure Modes
- **Results with unmatched team names** (a typo makes one club two teams) → both appear in the bands; the secretary sees the duplicate and fixes the paste. A later version could suggest merges.
- **Not enough slots for the fixtures** → the unscheduled list names every fixture that did not fit, the shortfall and a suggestion; the grid shows what did fit.
- **Fonts fail to load** → system fonts; layout unchanged.

## What Was Simplified and Why
- **A scored greedy slot assignment** instead of a full optimiser — slots are interchangeable except for venue preferences, so greedy with hard-constraint checks is enough; the validate script proves the hard constraints. A fuller version would search over venue assignments to satisfy every preference.
- **Three fixed bands** instead of a configurable count — the sample has 48 teams; a stepper is a small later change.
- **Pasted results** instead of an import from Full-Time — no export or API for league results was evidenced.
