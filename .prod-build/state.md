# State — regrade (hackathon, direct) — 2026-09-27

Deadline: 2026-10-26 17:00 EDT (2026-10-27 02:30 IST). Live: https://itssaharsh.github.io/regrade/ (Pages via Actions, gated on typecheck, test and validate).

## Done
- T01 vertical slice; T02 review (53 findings, triaged in reports/review.md); T03 fixes (byes, seeded partner order, search budget, setup validation, keyboard tabs); T04 live demo flow ×3 (E0032).
- T05 video: ../regrade-demo/demo/build/final.mp4 (2:06, QA passed, contact sheets reviewed, E0064); thumbnail.png, captions.srt, script.md alongside.
- T07 non-blocking font CSS made CLS worse (E0045) and was reverted: skipped.
- T08 self-hosted and preloaded fonts: desktop perf 100 / CLS 0, mobile 99 / CLS 0, no third-party requests (E0056).
- Memory: ADR-0001, ADR-0002, F-0001 to F-0005, L-0001, L-0002; mem check clean.

## Doing
- T06 submission package: four final reviews, DELIVERY.md, README GIFs (docs/media, cut from final.mp4).

## Left for the learner (not the agent's to do)
- Upload final.mp4 unlisted to YouTube; put the link in README ("Video:") and Devpost.
- Read devpost/scope.md, prd.md, spec.md and say "looks good" to flip them from status: draft.
- Write the Devpost name, tagline, description and survey answers themselves from devpost/submission-facts.md (skill-pack rule: the agent only fixes spelling and grammar).

## What not to repeat
- Deferring the font stylesheet to fix CLS (F-0005): it moves the swap later and makes CLS worse.
- Reverting a commit that carries ledger files (L-0002): revert code only.
- Running Lighthouse from the repo under WSL (L-0001): run it from /tmp.

## Ledger note (2026-09-27)
E0047 and E0048 were removed: they were appended while evidence.jsonl held git conflict markers from a conflicted revert (E0047 had an empty prev hash, breaking the chain) and both measured the pre-revert deployment. Plan statuses were restored from commit 541d808 after the same revert reset T04 and T05. Lighthouse was then re-run on the reverted site (the current E0047 and E0048).
