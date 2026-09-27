---
id: ADR-0003
type: decision
title: Banding counts each division above as 2 goals a game stronger
status: active
scope: project
components: src/banding.ts, src/main.ts, scripts/validate.ts
triggers: banding, goal difference per game, divisions, promotion, relegation, regrade accuracy
evidence: src/banding.ts#L1-40, docs/adr/0004-division-gap-in-banding.md, test:npm run validate
verified_at: 2026-09-27@0016b05
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: bcdb70509e4afe77
created: 2026-09-27
source: unknown
---

Decision: rank teams by goal difference per game less DIVISION_GAP (2.00) per division below the top, with levels from the number in division names (else file order). Why: results only come from games inside a division, so raw goal difference per game promoted teams losing in lower divisions and was no better than the league's own guess against the seed's hidden strengths (24 of 48 misplaced either way); with the gap, 16 of 48, and better on 5 of 6 seeds. Alternatives: raw goal difference (rejected, measured worse), promotion/relegation of top/bottom N per division (needs a per-league N), a tuned gap of 1.5 (slightly better on this seed but tuned to synthetic data). Revisit if a real league's results disagree; make the gap a setting. Guard: validate fails if the bands stop beating the league's guess.