# ADR 2: A per-week matching search instead of a solver library

Status: accepted, 2026-09-26.

Context: the first version rotated a fixed circle-method round robin. It could not avoid pairings the old divisions had already played (4 repeats on the seeded league) and balanced home/away against season history instead of the block (gap 4).

Decision: pairings are chosen week by week as a perfect matching by backtracking over partners in a fixed order, avoiding played pairs and pairing teams that are "owed" a home game with teams owed an away game; constraints relax in two steps and the log says when. Slot assignment stays a scored greedy pass under hard constraints, with an independent recount.

Consequence: 0 repeats and a home/away gap of 0 on the seed (scripts/validate.ts); no dependency on OR-tools or similar; the search is exhaustive only over one week's matching, which is small.
