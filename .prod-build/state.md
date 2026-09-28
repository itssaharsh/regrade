# State — regrade (hackathon, direct) — 2026-09-28

Deadline: 2026-10-26 17:00 EDT (2026-10-27 02:30 IST). Live: https://regrade-app.vercel.app (Vercel, CLI deploys, project lack-toes/regrade); the old Pages URL redirects. CI runs typecheck, tests, validate and build on every push.

## Done
- T01 vertical slice; T02 review (53 findings, triaged in reports/review.md); T03 fixes; T04 live demo flow ×3.
- T05 video (E0064), re-recorded after the final reviews from the final live site: ../regrade-demo/demo/build/final.mp4.
- T07 skipped (non-blocking font CSS made CLS worse, E0045). T08 self-hosted fonts (E0056).
- T06: four final reviews (E0088, reports/final-reviews.md), fixes in 85cdbaf and e8c2ad6: division-aware banding (docs/adr/0004), block keeps its slots, stale download blocked, input hardening, scheduler search, CSV recount in validate, docs aligned; live: demo ×3 (E0078), Lighthouse desktop 100 / mobile 99, CLS 0 (E0086); DELIVERY.md passes `pb.py report`.
- T09 Vercel hosting (E0099); T10 read results written any way, Gemini with a 4-model fallback, live eval 6/6 (E0120, E0122); T11 assistant baseline: Gemini 3.6 Flash made a valid block from one prompt, its divisions misplace 24 vs Regrade's 16 (E0146); club fixture lists.
- T12 video v3 in ../regrade-demo/v3 (kit copied to ../regrade-demo/kit3 with the F-0001 pump patch); recording needs Gemini to answer, so it runs behind an availability gate.
- Memory: ADR-0001 to ADR-0003, F-0001 to F-0007, L-0001 to L-0003; mem check clean.
- Gemini key: sensitive env var GOOGLE_GENERATIVE_AI_API_KEY in Vercel production only (free tier). Rotate after judging (it was pasted in chat).

## Left for the learner (not the agent's to do)
- Upload final.mp4 unlisted to YouTube; put the link in README ("Video:") and Devpost.
- Read devpost/scope.md, prd.md, spec.md and say "looks good" to flip them from status: draft.
- Write the Devpost name, tagline, description and survey answers themselves from devpost/submission-facts.md (skill-pack rule: the agent only fixes spelling and grammar).

## What not to repeat
- Ranking goal difference across divisions as if it were comparable (docs/adr/0004).
- Painting the static shell before the script fills it (F-0006).
- Deferring the font stylesheet to fix CLS (F-0005): it moves the swap later and makes CLS worse.
- Reverting a commit that carries ledger files (L-0002): revert code only.
- Running Lighthouse from the repo under WSL (L-0001): run it from /tmp.

## Ledger note (2026-09-27)
E0047 and E0048 were removed: they were appended while evidence.jsonl held git conflict markers from a conflicted revert (E0047 had an empty prev hash, breaking the chain) and both measured the pre-revert deployment. Plan statuses were restored from commit 541d808 after the same revert reset T04 and T05. Lighthouse was then re-run on the reverted site (the current E0047 and E0048).
