---
id: F-0003
type: failure
title: Byes landed on the same team every week and were never shown
status: active
scope: project
components: src/scheduler.ts, src/main.ts
triggers: bye, odd band, moveTeam, chooseRounds, fairness
evidence: src/scheduler.ts#L28-111, tests/byes.test.ts, test:npx vitest run tests/byes.test.ts
verified_at: 2026-09-27@36ed975
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: 94458d5411e2af7d
created: 2026-09-26
source: unknown
---

Attempted: odd bands handled by adding a BYE placeholder to the per-week matching. Error signature: in a 17-team band one team (first in partner order) got the bye in all 4 weeks; 5 teams: one team 3 of 4; the UI never listed byes, so after any single move (bands 15/17) two teams silently sat out each Saturday while the narration said every team plays. Root cause: pairings with BYE were skipped before used.add, so the matching kept offering the same team the bye; block.byes existed but no view rendered it. Fix (RED E0010 in the fixes worktree, GREEN E0011/E0013): mark BYE pairings as used so byes rotate; render a 'Bye this Saturday' line per week and '(one bye a week)' on odd band headers; announce byes in the status region. Lesson: when a placeholder participant stands in for 'no game', give it the same bookkeeping as a real one and put it on screen; test fairness across the block, not just validity per week. Early check: a test over odd band sizes (5, 7, 15, 17) counting byes per team.