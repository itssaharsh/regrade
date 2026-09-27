# State — regrade (hackathon, direct) — 2026-09-26

Deadline: 2026-10-26 17:00 EDT (2026-10-27 02:30 IST). Live: https://itssaharsh.github.io/regrade/ (Pages via Actions; CI green).

## Done
- T01 vertical slice (E0006–E0009 on BASE eb0866e); contract, ARCHITECTURE.md, plan (6 tasks, serial).
- Memory: F-0001 demo-kit hang (global candidate; kit patched in ../regrade-demo/demokit/run.py, original at run.py.orig), F-0002 round-robin repeats, ADR-0001, ADR-0002.
- Video rehearsal: storyboard in ../regrade-demo/demo/storyboard.json, recorded at dsf 2, stills reviewed.

## Doing
- T02 fresh review workflow (6 dimensions + 3 skeptics each) running; save its output to .prod-build/reports/review.md.

## Queued fixes for T03 (from the video rehearsal, pending review findings)
1. Byes are invisible: odd bands (after a move: 15/17) give two teams a bye each Saturday; show byes per week under the grid and a note on odd bands; narration must not say "every team plays".
2. At 1280 wide the 4th pitch column is cut off: table-layout fixed + ellipsis with title.
3. Band header wraps ("BAND / A"); team names truncated: drop the constant "6p" column, nowrap the heading, let the spread wrap below.
4. Move the Pitch slots panel above the band board (short setup panel before the 48-row list).

## Next step
When the review lands: write reports/review.md, T02 done, T03 fixes (RED tests for the bye surfacing), push, T04 live ×3, then re-record the video from the fixed live site (story: bands → generate → move visible team + regenerate → week 3 → export → shortfall via slots panel at top → tech → end).

## Ledger note (2026-09-27)
E0047 and E0048 were removed: they were appended while evidence.jsonl held git conflict markers from a conflicted revert (E0047 had an empty prev hash, breaking the chain) and both measured the pre-revert deployment. Plan statuses were restored from commit 541d808 after the same revert reset T04 and T05. Lighthouse is re-run below on the reverted site.
