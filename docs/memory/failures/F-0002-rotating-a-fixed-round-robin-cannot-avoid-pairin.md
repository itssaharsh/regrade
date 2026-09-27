---
id: F-0002
type: failure
title: Rotating a fixed round robin cannot avoid pairings the old divisions already played
status: active
scope: project
components: src/scheduler.ts
triggers: repeat pairings, round robin, home away balance, chooseRounds, validate
evidence: src/scheduler.ts#L28-125, docs/adr/0002-matching-not-solver-library.md, test:npm run validate
verified_at: 2026-09-27@e8c2ad6
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: 07e47c559254afe6
created: 2026-09-26
source: unknown
---

Attempted: choose 4 consecutive rounds of a circle-method round robin per band, rotated to minimise repeats, with home/away decided from season history. Error signature: validate printed 4 repeat pairings and a home/away gap of 4 on the seeded league. Root cause: each pair belongs to exactly one circle round, so with played pairs spread across rounds no rotation avoids them; and balancing against season history pushes a team with a history surplus to away in every block game. Fix (verified, docs/adr/0002): per-week perfect matching by backtracking that skips played pairs and pairs a team owed a home game with one owed an away game, relaxing in two logged steps. Lesson: when the constraint is 'avoid these pairs', search matchings per week instead of picking rounds from a fixed schedule; balance within the block, not against history. Early check: the validate script before any UI.