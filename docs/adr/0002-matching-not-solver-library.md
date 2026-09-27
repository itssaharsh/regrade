# ADR 2: A per-week matching search instead of a solver library

Status: accepted, 2026-09-26.

Context: the first version rotated a fixed circle-method round robin. It could not avoid pairings the old divisions had already played (4 repeats on the seeded league) and balanced home/away against season history instead of the block (gap 4).

Decision: pairings are chosen week by week as a perfect matching by backtracking over partners in a fixed order, avoiding played pairs and pairing teams that are "owed" a home game with teams owed an away game; constraints relax in two steps and the log says when. Slot assignment stays a scored greedy pass under hard constraints, with an independent recount.

Consequence: 0 repeats and a home/away gap of 0 on the seed (scripts/validate.ts); no dependency on OR-tools or similar; the search is exhaustive only over one week's matching, which is small.

Addendum, 2026-09-27 (final reviews): the search now has four tiers (strict; balance relaxed; season repeats allowed; block repeats allowed for tiny bands), a seeded partner order instead of a fixed one (F-0004), a precheck that skips a tier when a team has no allowed partner, and a 20,000-step budget per tier. It picks the most constrained team first and, in a relaxed tier, tries unplayed partners first: on 48- and 64-team bands with unplayed rounds left this took repeats from 45-95 to 0-6, and two odd groups that have played each other now get the minimum of one repeat a week (tests/rules.test.ts). Known gap: weeks are chosen one at a time, so late in a season a four-week plan can use a few more repeats than the best possible.
