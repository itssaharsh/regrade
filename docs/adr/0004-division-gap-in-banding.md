# ADR 4: Count each division above as 2 goals a game stronger when banding

Status: accepted, 2026-09-27.

Context: results only come from games inside a division, so goal difference per game is relative to the division's own opposition: +2 in Division 3 is not +2 in Division 1. Banding by raw goal difference per game promoted teams that were losing in a lower division (on the sample, a Division 3 side at −0.67 a game went into Band B), and against the seed's hidden team strengths it placed 24 of 48 teams in the wrong third, no better than the league's own guess (24), and worse on 4 of 6 other seeds (27, 24, 24, 30 against 18, 18, 18, 17).

Decision: rank by goal difference per game less `DIVISION_GAP` (2.00) per division below the top. 2.00 is the within-division spread a Kent league secretary aims for (FA Grassroots Technology forum, see README), so adjacent divisions sit about one spread apart. Division levels come from the number in the division names when every name has one (Division 1 is the top), else from the order the file lists them. With no Division column every team is level 0 and this is plain goal difference per game. Team rows show the ranking figure, with the raw figure and the adjustment in the tooltip and screen-reader text, and every team that changes division shows the one it was in.

Measured (gap 0 / 1 / 1.5 / 2 / 3, teams away from their true third, seed 20261017): 24 / 15 / 14 / 16 / 18, against 24 for the league's guess; teams moved: 29 / 22 / 21 / 18 / 12. Across six seeds, gap 2 beats the league's guess on five and ties or trails by one on the sixth. 1.5 scored slightly better on this seed; 2.00 was kept because it comes from a real league rather than from tuning to synthetic data. `scripts/validate.ts` now fails if the bands stop beating the league's guess on the sample.

Consequences: fewer, more defensible moves (18 instead of 29 on the sample); the figure is a fixed assumption, listed under Limitations; a league whose divisions are closer or further apart would want to change it (a setting is the obvious next step).
