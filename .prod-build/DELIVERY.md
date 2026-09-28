# Delivery report — Regrade (hackathon, 2026-09-28)

## Built
- J0 Read results written any way (added 2026-09-28): paste a coaches' message or an email and use Read with AI. A Gemini model extracts rows and the line each came from; code keeps a row only if both names and both scores are in that line, matches short names to known teams, and runs the ordinary parser; the secretary reviews every row beside its source line before adding. A fictional sample message is one click away.
- Club fixture lists (added 2026-09-28): each club's teams Saturday by Saturday, byes included, to copy, plus one CSV of all clubs.
- J1 Generate: the sample league loads labelled synthetic. Bands are proposed by goal difference per game, with each division above counted as 2 goals a game stronger. Generate fills four Saturdays across two venues, the chips show clashes, repeat pairings and home/away gap, and fixtureupload.csv downloads in the FA uploader's nine-column layout under the division names from the results file.
- J2 Regrade: a team moves by drag or arrow buttons and shows the division it was in; the block is marked changed, Download is blocked until Regenerate, and Regenerate rebuilds all four weeks. Odd bands rest one team per Saturday, in turn, listed under the grid.
- J3 Shortfall: fewer pitches or kick-off times list every fixture that doesn't fit, by week, with the slots to add ("Add 2 pitches, or 1 kick-off time."); the Export panel says those fixtures are not in the file.
- Setup: venue names, add or remove a venue, pitches per venue, kick-off times (9:00 accepted), first Saturday from a list of Saturdays, band count, and a Full-Time division name for any band the results file has no division for.
- States reachable by URL for review: `?state=first-run|generated|stale|partial|error|dragging`; Alt+Shift+G generates, Alt+Shift+R resets (asks first when the results are yours).
- Demo video: re-recorded from the Vercel site with the reading step and club lists, outside the repo in `../regrade-demo/v3/build/` (final.mp4, thumbnail.png, captions.srt, script.md); the previous cut is `../regrade-demo/demo/build/final.v2.mp4`.
- Cut to later (contract COULD/WON'T): a shareable block link, importing a Full-Time fixtures download, Sunday slots, persistence, postponements, multi-age workspaces.

## Architecture
- One static Vite page in TypeScript with vanilla DOM and no runtime dependencies (docs/adr/0001, ADR-0001). Pipeline: `results.ts` → `banding.ts` → `scheduler.ts` → `export.ts`, all in the browser.
- Banding counts each division above as 2 goals a game stronger, because results only come from games inside a division (docs/adr/0004, ADR-0003).
- The scheduler searches a perfect matching per week: most constrained team first, seeded partner order, four relaxation tiers, a 20,000-step budget per tier, unplayed partners first when a rule is relaxed. It doesn't rotate a round robin or use a solver library (docs/adr/0002, F-0002). Results are pasted, not fetched from Full-Time (docs/adr/0003, ADR-0002).
- Fonts are self-hosted and preloaded (F-0005), and the shell stays unpainted until the first render (F-0006).
- Hosting moved to Vercel (static page plus one function, security headers, immutable asset caching); the old GitHub Pages URL redirects. The one model call lives in `api/read-results.ts`: one structured-output call, a four-model Gemini chain in two rounds, and code that decides (docs/adr/0005, F-0007). Deliberately not built: accounts, storage, any model in banding, scheduling or export.

## Verification
- Unit and rule tests: 37 passed in 3 files [E0072]; with the reading step, club lists and model fallback, 54 pass in 4 files [E0148]
- Typecheck: clean [E0071]
- Validate on the seeded 48-team league: every constraint is recounted from the exported CSV rows, not from the app's counters. It shows 0 clashes, every fixture in a setup slot, every team once per Saturday, 0 repeats, a home/away gap of 0, counters that agree, and a reported shortfall with 18 slots. Bands place 16 of 48 teams away from their true strength, against 24 for the league's guess [E0073]
- Mutation check of validate: a RED run with slot booking and the counters broken in a scratch copy fails 3 checks, including 88 clashes [E0089]
- Bye rotation: RED test first (one team got every bye) [E0010], then green [E0011, E0013]
- 18-team search froze for 87.7 s: RED test [E0021], then green [E0022]
- Screenshot, axe and interaction QA at 320 to 1440 px: the first run failed on two setup checks [E0023], then passed [E0024]. After the final reviews it passes again, with new checks for the Saturday list, the stale-download block, rename-after-generate, old-division tags and the division name field [E0075, E0081]
- Demo flow J1 three times on the live URL after the final deploy: no console or HTTP errors, and the CSV header is exact [E0078, E0087]
- Lighthouse on the live URL after the final deploy, two runs each: desktop 100/100/100 with CLS 0; mobile 99/100/100 with CLS 0 [E0082, E0083, E0084, E0085, E0086]
- First deploy of the review fixes: desktop CLS failed at 0.845 [E0079], fixed in e8c2ad6 [E0086]
- Web-font loading change T07 failed its check, CLS 0.71, and was reverted [E0045]
- Dependency audit: no high or critical advisories [E0039]
- Secrets scan of tracked files: the first run failed on a false positive ("secretary") [E0040]; the word-bounded re-run is clean [E0042]
- Built output has no local paths or email [E0041]
- Code review workflow: 53 findings raised, 43 confirmed, fixed or triaged in `.prod-build/reports/review.md` [E0016]
- Four final reviews (user, engineering, reliability, founder), 43 findings, fixed or listed with reasons in `.prod-build/reports/final-reviews.md` [E0088]
- Reading step, live eval of 6 golden cases on the production model chain (sample message 23 of 23, an email with an abandoned game skipped, an injection line ignored, chat only, away-first, draws): all pass [E0120]; an earlier run failed while every Gemini model answered 503 [E0119]
- Reading step end to end on the live site: 23 of 23 read in 8.7 s, added, bands re-proposed, Generate 0/0/0, no console errors [E0122]
- Review screen QA with a test double for the API, including axe: the first run failed on an unfocusable scrolling list [E0110], fixed [E0111, E0121]
- Assistant baseline, one run: Gemini 3.6 Flash from one prompt made a valid block (0 clashes, 0 repeats, gap 0) in 149 s; its divisions misplace 24 of 48 teams against Regrade's 16 [E0146]
- Vercel production: security headers, immutable caching, Pages redirect [E0099]; demo flow x3 and Lighthouse desktop 99/100/100, mobile 96/100/100, CLS 0 [E0151, E0152, E0153, E0154]
- Demo video: first cut QA passed [E0064]; re-recorded from the final live site, QA with speech recognition passed and every contact sheet reviewed [E0091]

## Deployment
- Production: https://regrade-app.vercel.app on Vercel (CLI deploys; project lack-toes/regrade), smoke-tested [E0098] and measured live [E0154]; the old https://itssaharsh.github.io/regrade/ redirects there [E0099]; rollback: `vercel rollback` or revert the code commit (never the ledger) and redeploy (CLAUDE.md, L-0002); the reading step alone: `AI_ENABLED=false`

## Bugs found and fixed
- Rotating a fixed round robin produced 4 repeat pairings and a home/away gap of 4; replaced by per-week matching (F-0002, docs/adr/0002) [E0006]
- Byes landed on the same team every week and were never shown: RED test [E0010]; rotated and listed, green [E0011, E0013]
- Alphabetical partner order paired same-club teams in week 1; seeded shuffle (F-0004), tests and validate green [E0013, E0014]
- The 18-team search could run for 87.7 s: RED test [E0021]; precheck plus step budget, green [E0022]
- Non-Saturday dates were accepted and renamed venues didn't reach the grid: QA failed [E0023]; fixed, QA passed [E0024]
- Desktop CLS 0.854 from the web-font swap; deferring the font CSS failed (CLS 0.71) [E0045]; self-hosted and preloaded fonts, CLS 0 (F-0005) [E0056]
- Editing the setup after Generate misplaced the block on screen while the counters stayed green; each block now keeps its slots, with a test and a QA check [E0072, E0081]
- A stale block could be downloaded; now blocked, checked by QA [E0081]
- Formula-leading division and venue names reached the CSV; rejected at input and neutralised in the file, with a test [E0072]
- Banding compared goal difference across divisions and was no better than the league's guess; division-aware ranking, guarded by validate (docs/adr/0004) [E0073]
- A band's export name could flip after one move; names fixed at proposal, checked by QA [E0081]
- validate's recount wasn't independent; now reads the exported CSV [E0073]
- Large bands took avoidable repeats (48 teams: 45 where 0 was possible); most-constrained-first search, unplayed partners first, with tests [E0072]
- TSV rows with an empty first cell, duplicate dated rows, and non-Latin names merging; all fixed with tests [E0072]
- Desktop CLS 0.845 after the review deploy: failed [E0079]; shell kept unpainted until the first render (F-0006) [E0086]
- Demo recorder hung on below-the-fold targets under virtual time; kit patched outside the repo (F-0001): not run through the ledger (the kit lives in ../regrade-demo)

## Known limitations
- The reading step runs on a free-tier Gemini key: for over an hour at a time every Flash model answered 503, 3.8 Flash allows 20 requests a day and 3.1 Pro none. The page retries and then says Gemini is busy; the table path never depends on it. A paid key would remove most of this.
- The assistant comparison is one run of one model on one sample; a stronger model or prompt may do better.
- The uploader layout comes from the FA's 2015 guide (v5.1); a league admin should confirm it against the current uploader. Division, venue and pitch names must exist in Full-Time exactly as exported.
- The 2-goals-a-game gap between divisions is a fixed assumption from one league's target spread, not a setting.
- Pairings are chosen a week at a time. Late in a season this can use a few more repeats than the best four-week plan; the counters show them.
- Results must be pasted; no league-level export from Full-Time was found. One age group per workspace; Saturday slots only.
- Nothing is saved between visits; the downloaded CSV is the record. The page needs no network after it loads, but there is no service worker, so a reload needs a connection.
- The CSV is UTF-8 without a byte-order mark; accented names in Excel are unverified.
- Dev-only advisory in vitest's dependency chain (2 moderate, GHSA-82fw-gwwq-j7x9); the fix is a breaking major upgrade, so it stays until after the deadline.
- The video voice is synthetic (Kokoro TTS); the learner can re-record the narration from script.md.
- `devpost/scope.md` still says "exports the file FA Full-Time imports"; it is the learner's planning document and is left for them.
- Evidence missing: no test on a real league's results file; no screen-reader run with NVDA or VoiceOver (axe and keyboard checks only); no check on Safari or Firefox (Chromium only).

## Cleanup
- Removed the Google Fonts links and preconnects (commit 36ed975); nothing references googleapis.
- Deleted the `C:\Users\...\lighthouse.*` folders WSL created in the repo and ignored `C:*` (commit 2b3fad8); removed the machine username from L-0001.
- `qa/` screenshots are ignored; only `qa/shots.py` and `qa/live-demo.py` are tracked. BUILD-PLAN.md is marked historical.

## Optimization
- Desktop Lighthouse performance 73 → 100 and CLS 0.854 → 0; mobile 89 → 99; self-hosted fonts (61 KB) and an unpainted shell until first render [E0047, E0048, E0082, E0083]
- Scheduler worst case, two odd groups of 21 that have played each other: 26 s in the first most-constrained-first attempt, 1.4 s after moving the search onto a precomputed matrix, with the minimum 4 repeats [E0090]

## Memory
- ADR-0001, ADR-0002, ADR-0003 (division gap), F-0001 (global candidate: pump every awaited page call under a paused virtual clock), F-0002, F-0003, F-0004, F-0005 (global candidate: fix web-font CLS with same-origin files and preload), F-0006 (global candidate: hide a script-filled shell until the first render), L-0001 (global candidate: Lighthouse under WSL writes C:\ folders into the cwd), L-0002 (global candidate: roll back code, never the ledger). `pb.py mem check`: 11 records, 0 warnings.

## Next steps
- Learner: upload the video unlisted to YouTube and put the link in the README and on Devpost. Read the planning documents and say "looks good" to take them out of draft. Write the submission copy from `devpost/submission-facts.md`. Deadline: 2026-10-26 17:00 EDT.
- Test with one real league secretary's results file, and confirm the uploader columns and the 2-goals-a-game gap against Full-Time.
- Make the division gap a setting, and plan all four weeks together to close the late-season repeat gap.
