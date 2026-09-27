---
id: F-0004
type: failure
title: Alphabetical partner order paired same-club teams first
status: active
scope: project
components: src/scheduler.ts
triggers: same club, derby, partner order, alphabetical, matching
evidence: src/scheduler.ts#L28-111
verified_at: 2026-09-27@36ed975
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: 76baf38df146228a
created: 2026-09-26
source: unknown
---

Attempted: backtracking matching that tries partners in alphabetical order. Error signature: week 1 of a regenerated block showed six or more same-club fixtures (Ivybrook Blues v Ivybrook Reds, Caldicott Cubs Blacks v Whites), because a club's teams sort next to each other. Root cause: the tie-break was localeCompare on team ids. Fix (measured: 0-1 same-club fixtures per week, all constraints still 0/0/0; E0013, E0014): a deterministic seeded shuffle (FNV hash of the band's ids into mulberry32) sets the partner and orientation tie-break order. Lesson: never let an alphabetical tie-break leak into a schedule a human will read; it produces visible patterns that look like a naive algorithm. Early check: count same-club fixtures per week on the seed.