# Delivery report — Regrade (hackathon, 2026-09-27)

## Built
- J1 Generate: the sample league loads labelled synthetic, bands are proposed by goals per game, Generate fills four Saturdays across two venues, the chips show clashes, repeat pairings and home/away gap, and fixtureupload.csv downloads in the FA uploader's nine columns under the division names from the results file.
- J2 Regrade: a team moves by drag or arrow buttons, spreads update, the block is marked changed, and Regenerate rebuilds all four weeks; odd bands rest one team per Saturday, a different team each week, listed under the grid.
- J3 Shortfall: fewer pitches or kick-off times list every fixture that doesn't fit, by week, with the slots to add ("Add 2 pitches, or 1 kick-off time.").
- Setup: editable venue names, add or remove a venue, pitches per venue, kick-off times, first Saturday (validated as a Saturday).
- States reachable by URL for review: `?state=first-run|generated|stale|partial|error|dragging`; Alt+Shift+G generates, Alt+Shift+R resets.
- Demo video: 2:06, rendered and QA-checked outside the repo in `../regrade-demo/demo/build/` (final.mp4, thumbnail.png, captions.srt, script.md).
- Cut to later (contract COULD/WON'T): a shareable block link, importing a Full-Time fixtures download, Sunday slots, configurable band count, persistence, postponements, multi-age workspaces.

## Architecture
- One static Vite page in TypeScript with vanilla DOM and no runtime dependencies (ADR-0001, docs/adr/0001). Pipeline: `results.ts` → `banding.ts` → `scheduler.ts` → `export.ts`, all in the browser.
- The scheduler searches a perfect matching per week (seeded partner order, four relaxation tiers, a 20,000-step budget) instead of rotating a round robin or adding a solver library (docs/adr/0002, F-0002). Results are pasted, not fetched from Full-Time (docs/adr/0003, ADR-0002).
- Fonts are self-hosted and preloaded (T08, F-0005). Deliberately not built: a server, accounts, storage, any model call.

## Verification
- Unit and rule tests: 24 passed in 3 files [E0063]
- Typecheck: clean [E0062]
- Validate script on the seeded 48-team league: 13 checks PASS, including 0 pitch clashes and 0 repeat pairings by independent recount, home/away gap 0, and a reported (not hidden) shortfall with 18 slots [E0061]
- Bye rotation: RED test first (one team got every bye) [E0010], then green [E0011, E0013]
- 18-team search froze for 87.7 s: RED test [E0021], then green after the precheck and step budget [E0022]
- Screenshot and accessibility QA at 320 to 1440 px with axe and scripted interactions: the first run failed on two setup checks [E0023], then passed [E0024, E0050, E0058]
- Demo flow J1 three times on the live URL in fresh contexts, no console errors, CSV header exact [E0031, E0032]
- Lighthouse on the live URL after T08: desktop performance 100, accessibility 100, best practices 100, CLS 0; mobile 99, 100, 100, CLS 0; no third-party requests [E0054, E0055, E0056]
- Web-font loading change T07 failed its check, CLS 0.71, and was reverted [E0045]
- Dependency audit: no high or critical advisories [E0039]
- Secrets scan of tracked files: the first run failed on a false positive ("secretary") [E0040]; the word-bounded re-run is clean [E0042]
- Built output has no local paths or email [E0041]
- Code review workflow: 53 findings raised, 43 confirmed, fixed or triaged in `.prod-build/reports/review.md` [E0016]
- Four final reviews (user, engineering, reliability, founder): see "Final reviews" below

## Deployment
- Production: https://itssaharsh.github.io/regrade/ on GitHub Pages via Actions, gated on typecheck, test and validate [E0005, E0030, E0033]; T08 build measured live [E0056]; rollback: revert the commit and let Pages redeploy (CLAUDE.md rollback rule)

## Bugs found and fixed
- Rotating a fixed round robin produced 4 repeat pairings and a home/away gap of 4; replaced by per-week matching (F-0002, docs/adr/0002) [E0006]
- Byes landed on the same team every week and were never shown: RED test [E0010]; rotated and listed, green [E0011, E0013]
- Alphabetical partner order paired same-club teams in week 1; seeded shuffle (F-0004), tests and validate green [E0013, E0014]
- The 18-team search could run for 87.7 s: RED test [E0021]; precheck plus step budget, green [E0022]
- Non-Saturday dates were accepted and renamed venues didn't reach the grid: QA failed [E0023]; fixed, QA passed [E0024]
- Desktop CLS 0.854 from the web-font swap; deferring the font CSS failed (CLS 0.71) [E0045]; self-hosted and preloaded fonts, CLS 0 (F-0005) [E0056]
- Demo recorder hung on below-the-fold targets under virtual time; kit patched outside the repo (F-0001): not run through the ledger (the kit lives in ../regrade-demo)

## Known limitations
- The uploader layout comes from the FA's 2015 guide (v5.1); a league admin should confirm it against the current uploader.
- Results must be pasted; no league-level export from Full-Time was found.
- One age group and three bands per workspace; Saturday slots only.
- Tested on a synthetic league, not a real league's season.
- Nothing is saved between visits; the downloaded CSV is the record. "Works offline" means after the page has loaded; there is no service worker.
- Dev-only advisory in vitest's dependency chain (2 moderate, GHSA-82fw-gwwq-j7x9); the fix is a breaking major upgrade, so it stays until after the deadline.
- The video voice is synthetic (Kokoro TTS); the learner can re-record the narration from script.md.
- Evidence missing: no test on a real league's results file; no screen-reader run with NVDA or VoiceOver (axe and keyboard checks only); no check on Safari or Firefox (Chromium only).

## Cleanup
- Removed the Google Fonts links and preconnects (commit 36ed975); `git grep googleapis` finds nothing in the app or docs.
- Deleted the `C:\Users\...\lighthouse.*` folders WSL created in the repo and ignored `C:*` (commit 2b3fad8).
- `qa/` screenshots are ignored; only `qa/shots.py` and `qa/live-demo.py` are tracked.

## Optimization
- Desktop Lighthouse performance 73 → 100 and CLS 0.854 → 0; mobile 89 → 99, LCP 2.7 s → 1.3 s, by self-hosting three latin woff2 subsets (61 KB) and preloading two [E0047, E0048, E0054, E0055]

## Memory
- ADR-0001, ADR-0002, F-0001 (global candidate: pump every awaited page call under a paused virtual clock), F-0002, F-0003, F-0004, F-0005 (global candidate: fix web-font CLS by same-origin plus preload, not by deferring the CSS), L-0001 (global candidate: Lighthouse under WSL writes C:\ folders into the cwd), L-0002 (global candidate: roll back code, never the ledger). `pb.py mem check`: 9 records, 0 warnings.

## Next steps
- Learner: upload the video unlisted to YouTube, put the link in the README and Devpost, read the planning docs and say "looks good" to take them out of draft, and write the submission copy from `devpost/submission-facts.md`. Deadline 2026-10-26 17:00 EDT.
- Test with one real league secretary's results file and confirm the uploader columns against Full-Time today.
- A shareable link to a block, so a committee can review the fixtures before upload.
