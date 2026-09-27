---
doc: prd
status: draft
---

# Regrade — Product Requirements

One line: Regrade re-bands youth-league teams by results and refixtures them into your pitch slots, for volunteer fixture secretaries. Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. The secretary opens Regrade. The sample league is already loaded and banded, and the grid invites them to generate. (`scope.md > What "Working" Looks Like`)
2. They paste their own block's results, or keep the sample to try it. Bad rows are named; good rows load.
3. The band board shows every team ordered by goals per game, split into bands, each band with a spread number and a count of teams that would change division.
4. They drag a team to another band, or use the arrow buttons. The spread numbers update and the block is marked stale.
5. They set the Saturday slots: venue names, pitches per venue, the kick-off times and the first Saturday (which must be a Saturday).
6. They click Generate 4 weeks. The grid fills week by week; the chips show clashes, repeat pairings and the home/away gap.
7. If fixtures do not fit, a red list names them and what to change.
8. They download fixtureupload.csv, in the Full-Time uploader's nine columns with each band under its division name from the results file, and upload it to Full-Time. Success: the file uploads with no manual edits.

## Screens and Layout
One workspace. Left column: Results panel (collapsed to a summary once loaded), Bands board, Pitch slots panel. Main area: week tabs, constraint chips and the Generate button in a row; the pitch-plan grid (venues as column groups, pitches as columns, times as rows); the unscheduled list when needed; the Export panel with a preview of the CSV; a collapsible solver log. Under 1024 px it stacks into one column; under 640 px the Generate button is fixed at the bottom. (`scope.md > The Core Loop`)

## Look and Feel
White fixtures-sheet canvas, marker-black ink, one training-cone orange for the primary action, band colours drawn from kit colours (claret, royal, amber) always paired with the band letter. Condensed jersey-numeral display type for pitch numbers, times and week tabs (Barlow Condensed); a plain grotesk for names (Public Sans); monospace only in the CSV preview because it is a file. Each pitch column header is drawn as a small pitch. Precise motion: the grid fills in slot order on Generate; nothing else moves on its own. (`scope.md > Inspiration & Identity`; detail in UI-SPEC.md.)

## Features and Behavior

### Results in
- Accepts the Full-Time uploader layout with scores filled in, or a simple table (Date, Home Team, Away Team, Home Score, Away Score); dates as DD/MM/YYYY or ISO.
- Names each bad row ("Row 14: score missing (Oakford Colts Reds vs Ashby Lions Blues)") and loads the good rows.
- The sample league is labelled as fictional with synthetic results wherever it appears.

### Banding
- Orders teams by goal difference per game, then goal difference, and splits them into three bands as evenly as possible.
- Shows each band's spread (strongest minus weakest, in goals per game) and how many teams change division against the results file.
- Drag between bands with the mouse, or move up and down a band with buttons; the status region announces the move.

### Generating the block
- Pairings per band for four Saturdays that never repeat a pairing already played this season or earlier in the block, and keep every team within one home game of its away games; if the strict search fails, it relaxes and says so in the log.
- Places every fixture into a venue, pitch and time; one fixture per slot, at most one per team per week; each band's fixtures grouped at as few venues as possible, with any split logged; a club's teams share a venue when possible.
- Odd bands rest one team each Saturday, a different team every week, and the byes are listed under the grid for that week.
- Counters after every generation: clashes, repeat pairings, home/away gap, moved teams.
- Fixtures that do not fit are listed by name with the shortfall and a suggestion, never dropped silently.

### Export
- fixtureupload.csv with the columns Date, Time, Division, Home Team, Away Team, Venue, Pitch, Home Score, Away Score; dates DD/MM/YYYY; scores blank; preview of the first rows; download and copy.

## States and Boundaries
- **First use** — the sample league is loaded and banded; the grid shows "Generate to fill 4 weeks" with the fixture and slot counts.
- **Stale** — a band or slot changed after a block was generated: the button reads Regenerate and a line says so.
- **Partial** — some fixtures do not fit: a red list with the shortfall and a suggestion; the grid shows what did fit.
- **Row error** — the textarea keeps the input and lists the bad rows.
- **Nothing persists** between visits; the artifact is the downloaded file. A reset shortcut (Alt+Shift+R) reloads the sample.

## Product Decisions
- Results are pasted, not fetched — no league-level export or API was evidenced; pasting works today.
- Three bands by default — the sample age group has 48 teams; more bands are a later setting.
- Blocks are four weeks — the cadence secretaries describe (four to six weeks); the count is in the setup.
- No model call anywhere — the job is deterministic; a constraint search is more trustworthy and demonstrable than a prompt.
- The uploader layout follows the FA's 2015 guide — labelled on screen as something to confirm against the league's own uploader.

## What We're Building
Everything under Features and Behavior, plus a validate script that proves the constraints on the seeded league and a test suite on the pairing, banding and export functions.

## Deferred From the POC
- Saving a league between visits (would need storage; the file is the artifact for now).
- Postponement re-slotting (Full-Time already has a reschedule tool; the block loop is the kernel).
- Referees, cups and multiple age groups (each adds constraints without changing the kernel).

## Possible Later Enhancements
A shareable link to a generated block; importing a league's team list from a Full-Time fixtures download; Sunday slots.

## Non-Goals
- Replacing Full-Time: Regrade returns a file to it.
- Predicting results or rating teams beyond goals per game.
- Accounts, payments, notifications.

## Open Questions
- Is the 2015 uploader column layout still current? Must be confirmed by a league admin before real use; does not block the build.
- Do leagues want a target spread (the Kent post mentions about 2.00 goals per game) enforced, or just shown? Shown for now.
