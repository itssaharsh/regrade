---
name: Regrade
scope: sprint
one_line: "Regrade re-bands youth-league teams by results and refixtures them into your pitch slots"
ambition: L1            # tabular schedule data that users compare; polished DOM, one draw-on payoff; no spatial structure worth a scene
registers: { workspace: productive, generate_payoff: celebratory, failure_list: serious, export: productive }
direction: "derived: canvas white fixtures sheet #FFFFFF · ink marker black #151515 · accent training-cone orange #EE5A24 (fill-only, ink label) · display Barlow Condensed 700 (jersey numerals; candidates: Barlow Condensed, Big Shoulders Display, Saira Extra Condensed) · body Public Sans · mono Chivo Mono (CSV preview only)"
personality: precise
dials: { variance: 3, motion: 3, density: 7 }
stack: { page: "Vite + TypeScript, vanilla DOM (one page, no framework)", tests: "vitest for the scheduler", fonts: "Google Fonts", deps: "none at runtime" }
archetype: dev-tool-like single workspace (B13 g proportions, without the terminal)
viewports: [320x640, 390x844, 1024x768, 1440x900]
signature: { interaction: "Dragging a team across a band boundary re-flows both bands and their spread numbers, then Generate refills the grid in slot order", visual: "the pitch-plan grid: each pitch column drawn as a mini pitch (centre line, two goal boxes) with fixtures placed in its slots" }
wow: "Generate 4 weeks → cells fill in slot order over ~1 s → the three counters land on 0 → the export preview appears already in the FA's nine columns"
demo: { seed: ./src/seed.ts (fictional league, deterministic), flag: "?demo=1 (default when no results pasted)", state_param: "?state=", reset: "alt+shift+r", replay: "n/a (the solver is deterministic and instant)", guest: true }
live_vs_simulated: [ "results parsing: live", "banding: live", "scheduler: live", "fixtureupload.csv export: live (layout from the FA's 2015 guide; confirm current)", "results data: synthetic, labelled 'fictional league'" ]
deviations: [ "no replay shortcut: there is no long-running or networked step to replay", "no ?demo=1 flag: the sample league loads by default and Alt+Shift+R reloads it", "band moves use arrow buttons, not Alt+Arrow: buttons are discoverable and touch-friendly", "no band tabs under 640px: one list with wrapping names reads better on a phone", "no loading state: the solver finishes in well under 100 ms on 48 teams", "Regraded count moved from the chips row into the bands intro (review #37)", "Pitch slots panel sits above the band board: short setup before the 48-row list", "first-run shows the empty pitch plan with a one-line invitation, not three hairlines (review #38)" ]
---

## 0. Brief + context profile

- **One line:** Regrade re-bands youth-league teams by results and refixtures them into your pitch slots.
- **User and moment:** the volunteer fixtures secretary of a U7–U11 mini-soccer league, at a laptop on a weekday evening every four to six weeks, with a block of results in and the next block due in Full-Time before the weekend.
- **Primary action:** Generate (the next block).
- **Hero object:** the pitch-plan grid (pitches × Saturday slots × weeks) and, beside it, the band board (teams ordered by goal difference per game with band boundaries).
- **Product moment:** the grid fills with clash-free pairings and the counters read 0.
- **Demo moment:** drag one team down a band, click Generate, the grid refills, download fixtureupload.csv.
- **Differentiator:** results → proposed bands → regenerate only the next block inside the same slot capacity → the FA uploader's exact nine columns. Proved on screen by the band board's spread numbers, the constraint chips with live counts, and the export preview column-matched to the FA layout.
- **Artifact:** fixtureupload.csv (Date, Time, Division, Home Team, Away Team, Venue, Pitch, Home Score, Away Score).
- **World inventory:** the clubhouse whiteboard pitch plan; numbered pitch boards; training cones and marker discs; the printed fixtures sheet pinned by the door; jersey numerals; the results sheet with scores in pen.
- **Moving truth:** none.
- **Judging:** Design, Potential Impact, Innovation/Idea, Presentation, equal weight, 1–5 stars each; async video under three minutes plus repo and text; three Devpost staff judges; no UI prize. From hackathon-idea/build-with-ai-basics-2026-10/idea-package.md.
- **Budget:** 3–5 h of UI inside a 6–12 h build; stack above; nothing exists yet.

| Factor | This product |
|---|---|
| Task frequency | once per block (every 4–6 weeks): guidance on the panel, one expressive payoff on Generate |
| Data density | 48 teams, 96 fixtures per block: 36px rows, tabular numerals, the grid as the main surface |
| Stakes | moderate and recoverable: calm tone, explicit clash and unscheduled warnings, Regenerate as undo |
| Audience | domain-savvy volunteers, not technical: their words (banding, block, slot, Full-Time), plain explanations |
| Use scene | desk, laptop, evening: light canvas, 1440 first, must read at 720p |
| Emotional target | sorted |
| Personality | precise, with snap (cones set out in rows) |
| Sponsor / host | none; the FA's Full-Time is referenced by name as the destination, never imitated |

## 1. Judge tests

- **5 s:** the populated band board and pitch-plan grid, the wordmark "Regrade" and the top-bar descriptor "Re-band by results. Refixture into your slots. Export to Full-Time." A stranger says: for people who run kids' football leagues; makes the fixtures.
- **30 s:** sample results loaded → bands visible → drag one team → Generate → grid fills, counters 0 → Download. The differentiator shows without narration: the spread numbers change on the drag; the chips count; the export preview is already in the FA columns.
- **Demo-critical screen:** S1 Workspace (the only screen), plus its failure state (unscheduled list).
- **Three stills:** (1) the band board mid-drag with spread numbers; (2) the grid filled with the three chips at 0; (3) the export preview beside the FA column list.

## 2. Demo script (video ≤ 3:00; Devpost advice: pitch and overview first; 80% product)

| Time | On screen | Voice |
|---|---|---|
| 0:00–0:10 | the forum quote as a caption over the product | "Volunteers who run kids' football leagues in England spend four to five hours per age group every few weeks re-sorting teams by results and re-making fixtures in Excel, because the FA's own system won't re-grade." |
| 0:10–0:20 | Regrade with the fictional league loaded; the band board | "This is Regrade. Paste the block's results and it proposes ability bands." |
| 0:20–0:45 | drag Oakford Colts to Band B; Generate; the grid fills; chips 0 / 0 / balanced | "Move a team, generate the next four weeks inside your own pitch slots. No clashes, no repeat pairings, home and away balanced." |
| 0:45–1:05 | export preview; Download; the CSV opened in a spreadsheet beside the FA guide's column list | "It exports the exact file Full-Time's uploader takes." |
| 1:05–1:30 | remove a pitch; the red unscheduled list with the suggestion; add a slot; back to 0 | "When fixtures don't fit, it says which and why." |
| 1:30–1:55 | constraint panel; the verify script printing PASS | "The rules are on screen, and a script checks every generated block." |
| 1:55–2:10 | the repo: devpost/scope.md, prd.md, spec.md | "Planned and built with the Devpost Learn skill pack." |
| 2:10–2:30 | scope limit (mini-soccer central venues, England) and the FutureFit line; repo link | "Built for the season the FA's formats change." |

## 3. Journey + screen inventory

| id | route | why it exists | entered from | primary action | states |
|---|---|---|---|---|---|
| S1 | / | the whole job on one screen: results in, bands, block out, file out | direct (sample loaded by default) | Generate 4 weeks | first-run (grid empty) · ideal (generated) · partial (unscheduled list) · error (bad results row) · loading (solver >300 ms: "Placing 96 fixtures… 61/96") |
| S1.import | / (panel) | the user's own results replace the sample | top-left panel | Load results | collapsed after load · open · row error |
| S1.export | / (panel) | the artifact, previewed in the FA's layout | after Generate | Download fixtureupload.csv | hidden until generated · preview · downloaded |

No auth, no settings, no history. Golden path: Generate → Download (2 clicks).

## 4. Flow map

S1(first-run, sample loaded) --Generate--> S1(ideal) --Download--> S1.export(downloaded) ; S1(ideal) --drag team--> S1(bands changed, grid stale) --Generate--> S1(ideal) ; S1 --remove pitch + Generate--> S1(partial) --add slot + Generate--> S1(ideal) ; S1.import --paste bad row--> S1.import(error)

## 5. Screen S1 Workspace

Blueprint at 1440: top bar 52 · left column 4 cols (Results panel, then Band board) · main 8 cols (week tabs 40, constraint chips row 36, the pitch-plan grid, then the export preview). Under 1024: single column: results, bands, grid, export. Under 640: the band board becomes a list with band tabs; the grid scrolls horizontally inside a labelled region; Generate is sticky at the bottom.

| Element | Tier | Register | Levers (grayscale first) | States | Transition |
|---|---|---|---|---|---|
| Pitch-plan grid (weeks × pitches × slots) | primary | productive | the largest region (8 of 12 cols); white cells on the canvas separated by 1px pitch-line rules; each pitch column header drawn as a mini pitch; fixtures set in 14px body, home first, band letter as a leading swatch with the letter; clash cells hatched with a danger outline | first-run: slot skeleton with "Generate to fill 4 weeks" centred · ideal · partial: red "6 unscheduled" list under the grid with the fix suggestion · loading: cells fill with a count in the status region | cells draw on in slot order, 40 ms stagger, ≤1.2 s total (the payoff); regenerate = fade-through then fill |
| Band board | secondary | productive | left column on surface-1; rows 36px; band headers as a 2px rule with the band name and the spread number in tabular numerals; team rows show P and GD/game right-aligned; a drag handle glyph at the left | empty: "Load results to propose bands" · ideal · dragging: the row lifts (raised shadow), the target band's header underlines | layout settle 200 ms ease-out-quint; spread number ticks |
| Constraint chips (Clashes, Repeat pairings, Home/away) | tertiary | system | one row of three quiet chips, 13px, tabular numerals; a chip turns success-tinted at 0 only after a generation; never colour alone (the number is always shown) | before generate: "—" · after: counts | number ticks when the fill ends |
| Generate 4 weeks | interactive | productive | the one filled button (accent fill, ink label), right of the week tabs; sticky bottom on phones | idle · blocked (no results): stays focusable, click shows "Load results first" and focuses the import panel · loading: label "Placing… 61/96", width locked · done: label returns | label morph 180 ms |
| Export preview + Download fixtureupload.csv | secondary | productive | a nine-column preview table in the mono face (it is the file), first 6 rows, with the FA column names as the header; Download as a tonal button | hidden until generated · preview · downloaded: "Downloaded" for 2 s then back | slides up under the grid, 240 ms |
| Results panel | tertiary | productive | collapsible; textarea with the expected columns as placeholder text; "Load sample results" and "Use your own results"; a "Fictional league · synthetic results" caption on the sample | collapsed (one line: "Oakford & District U9, 6 weeks of results, 48 teams") · open · row error: "Row 14: score missing" pinned to the textarea | disclosure 200 ms |
| Top bar | tertiary | system | wordmark + one-line descriptor at the left, nothing else | — | — |

**First 10 seconds:** the sample league is already loaded and banded; the grid shows its first-run skeleton with the invitation to generate; the top bar says what it is.
**Data:** results: synthetic (labelled); banding, scheduling, export: live.

## 6. Components

### C-01 BandRow (custom, native button + drag)
Purpose: move a team between bands with the mouse or the keyboard.
Tier / register: secondary · productive
Placement: S1 band board, one per team, grouped under band headers; mobile: same list, names wrap.
Size: h36, px12, gap 8; drag handle 16px glyph.
Tokens: bg surface-1, hover surface-2, ink; band swatch --data-a/b/c 8px square with the letter.
States: idle | hover (surface-2) | focus-visible (2px ink outline) | dragging (raised shadow, 98% opacity) | dropped (settles, spread numbers tick)
Keyboard: the ↑/↓ buttons move the team one band; focus stays on the moved team; the status region says "Oakford Colts Reds moved to Band B".
A11y: role=listitem within role=list per band; the move buttons have names.
Acceptance: ?state=dragging renders at 320 and 1440.

### C-02 GenerateButton (native button)
Purpose: run the scheduler for the next 4 weeks.
States: idle "Generate 4 weeks" | stale "Regenerate 4 weeks" with the changed line beside it | done (status region announces fixtures, clashes, repeats, unscheduled, byes).
Keyboard: Enter/Space; Alt+Shift+G anywhere.

### C-03 ConstraintChip
Purpose: show one constraint's count after a generation.
States: idle "—" | counted "0" (success tint) | counted "3" (danger tint) — the number is always shown.

## 7. Choreography

| id | trigger | from → to | what moves | pattern | timing |
|---|---|---|---|---|---|
| T-01 | Generate DONE | empty grid → filled | cells fill in slot order; chips tick at the end | draw-on onto the object | 40 ms stagger, ≤1.2 s total, ease-out-quint |
| T-02 | team dropped in another band | band board | rows re-flow; the two spread numbers tick | layout | 200 ms |
| T-03 | Generate after a change | filled grid → refilled | fade-through (≤3px blur) then T-01 | fade through | 150 ms + T-01 |
| T-04 | Download | export panel | the button label morphs "Download fixtureupload.csv" → "Downloaded" | morphing label | 180 ms |
| T-05 | unscheduled fixtures | grid → list | the red list rises under the grid | shared axis | 210 ms |

Reduced motion: keep opacity fades, drop the stagger (cells appear at once).

## 8. State machines

Scheduler: idle -GENERATE-> running(n/96) -DONE-> generated(clashes, repeats, balance, unscheduled[]) ; generated -BAND_CHANGE-> stale -GENERATE-> running ; running -FAIL(capacity)-> partial (unscheduled list with a suggestion) ; any -RESET-> idle (sample reloaded).

## 9. Copy deck (sentence case; buttons name outcomes)

- Descriptor: "Re-band by results. Refixture into your slots. Export to Full-Time."
- Buttons: "Generate 4 weeks" · "Download fixtureupload.csv" · "Load sample results" · "Use your own results" · "Regenerate"
- First-run grid: "Generate to fill 4 weeks into 24 slots"
- Blocked: "Load results first"
- Byes: "Bye this Saturday: <team> (Band A). Bands with an odd number of teams rest one team each week, a different team every week."
- Chips: "Clashes 0" · "Repeat pairings 0" · "Home/away within 1"
- Partial: "6 fixtures don't fit: 24 needed, 18 slots. Add a slot or a week." then the six pairings
- Row error: "Row 14: score missing (Oakford Colts vs Ashby Lions)"
- Sample caption: "Fictional league · synthetic results (Oakford & District U9)"
- Scope line (footer): "Mini-soccer central venues, England. Export layout from the FA's Full-Time guide v5.1 (2015): confirm against your uploader."

## 10. Brand

Logo idea: a training cone (one noun from the world) reduced to a triangle with a cut base line; monogram variant: an R whose leg is the cone. Wordmark: "Regrade" in Barlow Condensed 700, −0.02em, the g's ear cut square. Favicon: the cone in ink, orange in dark mode. OG/thumbnail: the filled grid and the wordmark.

## 11. Real-product checks

- Value: it does the block job end to end; yes.
- Clarity: the first-run grid says what Generate does; yes.
- Trust: constraint chips and the unscheduled list show what was and wasn't placed; the export preview shows the exact file; yes.
- Feedback: every button acknowledges within 100 ms; the solver reports progress; yes.
- Failure: bad rows are named; capacity shortfalls list the fixtures and the fix; input is kept; yes.
- 10× data: 480 teams would need virtualised rows and paging by week; the grid stays per-week; note as a limit.
- Maintainability: no runtime dependencies; one solver file with tests; yes.

## 12. Don'ts

No middle-dot metadata strings; no top-bar sample badge (the caption sits on the results panel); no grey-paper canvas; no safety yellow; no colour-only band encoding; no "AI" anywhere (there is none).

## 13. Acceptance

Gates 1–4 (cut pass; anti-slop grep and art-direction questions; 10-minute accessibility check; judge test on stills) before the video. Skeptical evaluator: optional at Sprint; run if time allows, else self-reviewed and marked.

## 14. Tokens

```css
:root{
  color-scheme: light;
  --ff-display:"Barlow Condensed",system-ui; --ff-body:"Public Sans",system-ui; --ff-mono:"Chivo Mono",ui-monospace;
  --canvas:#FFFFFF; --surface-1:#F4F5F2; --surface-2:#E7E9E4; --surface-sunken:#F0F1EE;
  --line:#CFD3CC; --line-input:#767B72; --ink:#151515; --ink-muted:#5A5F58;
  --accent:#EE5A24; --accent-ink:#151515;
  --accent-hover: oklch(from var(--accent) calc(l - .06) c h); --accent-press: oklch(from var(--accent) calc(l - .12) c h);
  --accent-container: color-mix(in oklch, var(--accent) 14%, var(--surface-1));
  --focus: var(--ink);
  --success:#1E7A4C; --warning:#7A5700; --danger:#B3261E; --danger-container: color-mix(in oklch, var(--danger) 10%, var(--surface-1));
  --data-a:#7A1F3D; --data-b:#1F4E9E; --data-c:#8A6508;   /* band kit colours: claret, royal, amber; always with the letter */
  --pitch:#2E7D4F;                                          /* pitch-line motif in column headers only */
  --r-sm:4px; --r-md:8px; --r-lg:12px;
  --shadow-raised: 0 1px 2px rgb(0 0 0/.08), 0 2px 6px -1px rgb(0 0 0/.08);
  --ease-out-quint:cubic-bezier(.22,1,.36,1); --dur-hover:150ms; --dur-pop:200ms;
}
```
Contrast (WCAG, composited): ink on canvas 17.4:1; ink-muted on canvas 6.1:1; accent-ink on accent ≥ 6:1; danger text on canvas 6.4:1; line-input on canvas 4.3:1 (≥3:1). Re-check after any change.
