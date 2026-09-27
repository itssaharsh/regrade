# T02 review — fresh-context bug hunt (workflow wf_be40f16b-f24, 2026-09-26)

Six reviewers (contract, scheduler, UX, accessibility, submission honesty, security/deploy), each finding checked by three skeptics (reproduce, severity, devil). 53 raised. Verifier tallies below (✓ confirmed, ✗ refuted, ? verifier failed on a session limit). The 10 contract-dimension findings are unverified duplicates of confirmed findings from other dimensions, except #48 (checked by hand: after adding one pitch 12 fixtures still did not fit; confirmed).

| # | Dim | Sev | Finding | File | Votes | Decision |
|---|---|---|---|---|---|---|
| 0 | security-deploy | minor | CSV export does not neutralise formula-leading team names (CSV injection) | src/export.ts:8 | 2✓1✗0? | fix: reject formula-leading names at parse |
| 1 | security-deploy | minor | .prod-build/, docs/memory/ and AGENTS.md are untracked but not gitignored; evidence.jsonl holds an absolute local path | .gitignore:10 | 1✓2✗0? | no change: ledger is meant to be committed; handle is public |
| 2 | security-deploy | minor | Pages deploy has no test gate: a push that fails ci still goes live | .github/workflows/pages.yml:18 | 3✓0✗0? | fix: test gate in pages.yml |
| 3 | security-deploy | minor | Pages workflow cancels in-progress production deployments | .github/workflows/pages.yml:6 | 1✓2✗0? | fix: cancel-in-progress false |
| 4 | security-deploy | minor | Deep links show GitHub's generic 404 with no way back to the app | public/: | 1✓2✗0? | fix: 404.html |
| 5 | a11y | major | Focus is thrown to <body> after every arrow move, pitch stepper, week tab and Cancel (full-panel re-render) | src/main.ts:85 | 3✓0✗0? | fix: restore focus after render |
| 6 | a11y | major | At phone width the stale notice is injected into the fixed bottom bar and overprints the page | src/main.ts:210 | 3✓0✗0? | fix: stale notice out of the fixed bar |
| 7 | a11y | major | Generate is the 76th Tab stop from the top; the Alt+Shift+G shortcut is not shown anywhere | index.html:39 | 2✓1✗0? | fix: skip link to the block + aria-keyshortcuts |
| 8 | a11y | minor | Footer disclaimer is hidden under the fixed Generate bar on phones | src/style.css:142 | 3✓0✗0? | fix: footer padding on phones |
| 9 | a11y | minor | Fixture cells read as one undivided string to screen readers; kick-off times are not row headers | src/main.ts:236 | 3✓0✗0? | fix: row headers + sr-only versus |
| 10 | a11y | minor | Selected week tab is indistinguishable in Windows High Contrast (forced-colors) | src/style.css:94 | 3✓0✗0? | fix: forced-colors indicator |
| 11 | a11y | minor | aria-label on the #chips <div> has no role, so 'Constraint counts' is never exposed | index.html:38 | 2✓1✗0? | fix: role=group |
| 12 | a11y | minor | Week tabs use tablist/tab roles without the tab keyboard pattern or a linked panel | src/main.ts:193 | 3✓0✗0? | fix: tab keyboard pattern |
| 13 | a11y | minor | Team names truncate in the band board at phone width with no touch-accessible full name | src/style.css:73 | 3✓0✗0? | fix: names wrap |
| 14 | a11y | minor | 'Solver log and constraints' summary is a 19.5px-tall target | src/style.css:139 | 2✓1✗0? | fix: summary padding |
| 15 | a11y | minor | No level-one heading; the wordmark is a link and headings start at h2 | index.html:18 | 3✓0✗0? | fix: h1 wordmark |
| 16 | scheduler | blocking | Byes are never shown and land on the same team: the demo's own move leaves Ashby Lions Whites with 1 game in 4 weeks | src/scheduler.ts:73 | 3✓0✗0? | fixed (8a6c7ee): byes rotate, shown per week |
| 17 | scheduler | major | Per-week matching is exhaustive backtracking and freezes the page for seconds to minutes on a band where the last-sorted team has played eve | src/scheduler.ts:43 | 2✓0✗1? | fix: step budget per tier |
| 18 | scheduler | major | Bands of 1-4 teams silently lose whole weeks: no fixtures, no bye, no unscheduled entry, only a line in the collapsed log | src/scheduler.ts:65 | 3✓0✗0? | fix: block-repeat tier (8a6c7ee) + counted repeats |
| 19 | scheduler | major | Tab-separated paste (what Excel and a copied Full-Time table produce) is rejected with a header error | src/results.ts:18 | 2✓1✗0? | fix: accept tab-separated paste |
| 20 | scheduler | minor | Any weekday is accepted as 'First Saturday' and the grid labels it 'Sat' | src/main.ts:240 | 3✓0✗0? | fix: reject non-Saturday with a reason |
| 21 | scheduler | minor | Score cells are not validated: negative, hex, 'Infinity' and a team playing itself are accepted and corrupt the banding numbers | src/results.ts:53 | 3✓0✗0? | fix: validate scores and self-play |
| 22 | scheduler | minor | Exported Division column carries the app's fixed 'Band A/B/C' names, so the file cannot be uploaded to Full-Time as-is | src/scheduler.ts:121 | 3✓0✗0? | fix: export under the recorded division names |
| 23 | scheduler | minor | The 'Repeat pairings' counter is not independently recounted despite the README/ADR claim of an independent recount | scripts/validate.ts:21 | 1✓2✗0? | fix: independent repeat recount in validate |
| 24 | submission | blocking | "A band at one venue per Saturday" is false on the sample and structurally impossible; the solver log hides the split | README.md:16 | 3✓0✗0? | fix: reword claim; log split bands |
| 25 | submission | blocking | The demo's move gives the moved team three byes in four weeks and the UI never shows a bye | src/main.ts:93 | 3✓0✗0? | fixed with 16 |
| 26 | submission | blocking | README/scope/PRD/spec say venues and kick-off times are set by the user; only pitch counts and the date are editable, so own-league exports  | README.md:15 | 3✓0✗0? | fix: editable venues and kick-off times |
| 27 | submission | major | README's Presentation evidence describes a video that does not exist and shots the storyboard deliberately cuts | README.md:25 | 3✓0✗0? | fix after the video exists |
| 28 | submission | major | Planning docs are all status: draft with learner checkpoints unticked, while BUILD-PLAN says the learner answered the skill-pack interviews | BUILD-PLAN.md:3 | 2✓1✗0? | fix wording; statuses stay draft until the learner approves |
| 29 | submission | minor | UI-SPEC promises Alt+Arrow band moves, a ?demo=1 flag, band tabs under 640px and a loading counter; none exist | UI-SPEC.md:106 | 2✓1✗0? | fix: UI-SPEC deviations |
| 30 | submission | minor | spec.md claims nothing is unverified and the whole build is exercised by npm test/validate | devpost/spec.md:18 | 2✓1✗0? | fix: spec.md wording |
| 31 | submission | minor | Build-tool internals sit untracked at the repo root without an ignore rule | .gitignore:12 | 0✓3✗0? | refuted |
| 32 | ux | blocking | Fixture grid is clipped with no scrollbar at 390, 1024 and 1280: fixtures silently hidden | src/style.css:105 | 3✓0✗0? | fix: scrollable per-venue tables |
| 33 | ux | major | Band board truncates 44 of 48 team names at 1024 and 1280 (25 of 48 at 1440) | src/style.css:35 | 3✓0✗0? | dup of 13 |
| 34 | ux | major | Band headers break into two lines ('BAND / A') at 1024 and 1280 | src/style.css:63 | 3✓0✗0? | fixed (8a6c7ee) |
| 35 | ux | major | On phones, tapping the fixed Generate button changes nothing on screen: the grid fills 2,500px below the fold | src/main.ts:69 | 3✓0✗0? | fix: scroll to the result on phones |
| 36 | ux | minor | Error state shows two accent-filled primary buttons (Load results and Generate 4 weeks) | src/main.ts:115 | 3✓0✗0? | fix: Load results secondary |
| 37 | ux | minor | The 'Regraded 29' chip reads as a fourth violation counter and is explained only by a hover title | src/main.ts:203 | 3✓0✗0? | fix: move Regraded count out of the chips |
| 38 | ux | minor | First-run stage is mostly blank: the placeholder is three hairlines, not the spec's slot skeleton | src/main.ts:216 | 2✓1✗0? | fix: empty pitch plan as first-run |
| 39 | ux | minor | Unscheduled panel heading says '24 fixtures don't fit' but the list shows 6 with no week label | src/main.ts:248 | 3✓0✗0? | fix: week-scoped heading |
| 40 | ux | minor | First Saturday date input shows a US date (10/17/2026) beside a grid that says Sat 17/10/2026 | src/main.ts:176 | 0✓1✗2? | no change: native date display follows the browser locale (0 confirmations) |
| 41 | ux | minor | Fixed Generate button on phones covers the footer and content scrolling under it | src/style.css:142 | 2✓0✗1? | dup of 8 |
| 42 | ux | minor | Dragging state is a 50% fade, which reads as disabled rather than lifted | src/style.css:71 | 3✓0✗0? | fix: lifted drag state |
| 43 | contract | blocking | README, PRD and submission facts claim "a band at one venue per Saturday"; the sample block splits Band C across both venues every week, sil | README.md:16 | 0✓0✗3? | dup of 24 |
| 44 | contract | blocking | Slot setup MUST only half-built: venue names, venue count and kick-off times are hard-coded; README/PRD say the user sets them | src/main.ts:173 | 0✓0✗3? | dup of 26 |
| 45 | contract | major | Pitch-plan tables hard-clip at <=1280 and cannot scroll on phones: fourth pitch column cut at the video viewport, pitches 3-4 unreachable at | src/style.css:105 | 0✓0✗3? | dup of 32 |
| 46 | contract | major | Keyboard focus is thrown to <body> after every arrow move, pitch stepper press and date edit because render() rebuilds the panels | src/main.ts:93 | 0✓0✗3? | dup of 5 |
| 47 | contract | minor | Unscheduled panel headline counts the whole block (24) but lists only the current week (6) with no 'this week' label | src/main.ts:248 | 0✓0✗3? | dup of 39 |
| 48 | contract | minor | Shortfall suggestion 'Add a pitch or a time' understates the fix: after adding one pitch 12 fixtures still don't fit | src/main.ts:249 | 0✓0✗3? | fix: precise shortfall suggestion |
| 49 | contract | minor | Pairing search goes exponential when one team has already played every band-mate: 16 teams 5.2 s, 18 teams >30 s, synchronous on the main th | src/scheduler.ts:43 | 0✓0✗3? | dup of 17 |
| 50 | contract | minor | ?state=dragging fails axe colour contrast (3.37:1 and 2.14:1) because the dragged row is rendered at 50% opacity instead of the spec's 98% | src/style.css:71 | 0✓0✗3? | dup of 42 |
| 51 | contract | minor | Grid header hard-codes 'Sat' and the first-Saturday input accepts any weekday, so a Sunday block is labelled 'Sat 18/10/2026' | src/main.ts:240 | 0✓0✗3? | dup of 20 |
| 52 | contract | minor | At the video viewport (1280x720) 44 of 48 band-board names are truncated, including 'Ashby Lions Wh...' which the storyboard zooms on while  | src/style.css:35 | 0✓0✗3? | dup of 13 |
