# Final reviews — Regrade, 2026-09-27

Four separate read-only subagent passes (prod-build Step 12, verification.md §6): user, engineering, reliability, founder. Findings were deduplicated across the four, checked against the code before any fix, and fixed where practical in commits 85cdbaf and e8c2ad6. Evidence: typecheck E0071, tests E0072 (37), validate E0073, build E0074, QA E0075/E0081, live demo ×3 E0078, Lighthouse E0082–E0086.

## Found by more than one review
| Finding | Reviews | Outcome |
|---|---|---|
| Editing the setup after Generate redrew the grid from the new setup: fixtures showed as "free" while the counters stayed green and the CSV kept the old venue | engineering, founder, reliability | fixed: each block keeps a copy of the slots it was generated in (`Block.setup`); test "a block keeps the slots it was generated for" |
| A stale block could be downloaded | user, (founder) | fixed: Download and Copy are blocked while stale, with "This file is from before your changes. Regenerate first." in the panel; QA check |
| Formula-leading division and venue names reached the CSV | engineering, reliability | fixed: rejected at input (results parser, venue field, division field) and neutralised in `q()`; test |
| Bands with no division exported as "Band A/B/C", which Full-Time won't recognise; panel copy claimed otherwise | user, founder | fixed: a "Full-Time division" field on such bands, a warning in the Export panel until named; QA check |
| Team names cut to the club on phones, so a club's two teams looked like one team playing itself | user, founder | fixed: fixture cells wrap names; visible "v" between home and away |
| "9:00" rejected as a kick-off time | user, founder, reliability | fixed: 9:00 and 09.00 accepted and padded; test |
| Always three bands: a tiny league got bands of one that never play | user, reliability | fixed: as many bands as the file has divisions (2–5), never fewer than 4 teams a band, and a band-count stepper |
| Clearing the date showed "That is a not a date."; typing into the date field validated each keystroke and lost focus | engineering, user, reliability | fixed: the first Saturday is a list of Saturdays |
| Reset and reload lose the user's own data without warning | user, reliability | fixed: a leave-page prompt when the user has work (not under automation), and Alt+Shift+R asks before discarding own results; venue × has no undo (open) |
| The step-budget test never reached the budget | engineering, reliability | fixed: a two-group case with no perfect matching; asserts `budgetStops > 0` and the minimum of 4 repeats |
| Docs: three-step relaxation (four in code), "works offline", "four or more other leagues", README guarantees, stale file trees and plan | engineering, founder | fixed across README, ARCHITECTURE, ADR 0002 addendum, spec.md, UI-SPEC, BUILD-PLAN note, app-map, AGENTS.md, submission-facts |

## Single-review findings
| Finding | Review | Outcome |
|---|---|---|
| validate's "independent recount" called the app's own counter; a mutation with 88 clashes passed | engineering | fixed: validate recounts every constraint from the exported CSV rows; the same mutation now fails 3 checks; hand-built counter tests |
| TSV row with an empty first cell shifted every column | engineering | fixed; test |
| README quickstart missing test/typecheck/build and the Node version | engineering | fixed; `engines: node >= 22.6` |
| Large bands got avoidable repeats (48 teams: 45 where 0 was possible) | reliability | fixed: most-constrained-first search over a precomputed matrix, unplayed partners first in relaxed tiers; 0–6 on the probes; worst case 42 teams 1.2 s (was 26 s in the first attempt) |
| Non-Latin names collapsed to one team | reliability | fixed: Unicode-aware ids; test |
| The same dated row pasted twice counted twice | reliability | fixed: skipped with "duplicate of row N"; test |
| All-draws league banded alphabetically without saying so | reliability | fixed: a note in the bands panel |
| "29 teams change division" but not which | user | fixed: each moved team shows the division it was in |
| A partly good paste looked like a total failure | user | fixed: visible "Loaded N results for M teams. These K rows were skipped:" |
| Red chips don't say why | user | fixed: the band lines of the solver log that relaxed a rule appear under the chips |
| Sample grounds kept after loading your own results | user | fixed: a hint above the venues until the setup is changed |
| Copy CSV gave no visible feedback | founder | fixed: "Copied" / "Copy failed, use Download" on the button |
| Export didn't say that unscheduled fixtures are missing from the file | founder | fixed: "72 of 92 fixtures: the 20 that don't fit are not in this file." |
| Tagline and video said "the file Full-Time imports" / "upload it, done" | founder | fixed: "in the FA Full-Time uploader's layout"; video narration re-recorded; `devpost/scope.md` one-liner left for the learner (their planning document) |

## Found while fixing (not raised by a review)
- Banding compared goal difference across divisions although results only come from games inside a division: a Division 3 side losing its games was promoted, and against the seed's hidden strengths the bands were no better than the league's guess (24 of 48 misplaced). Fixed by counting each division above as 2 goals a game stronger (docs/adr/0004): 16 of 48; validate now guards it.
- A band's export name could flip after one move (Band A exporting as "Division 3"). Fixed: names are fixed when the bands are proposed.
- Desktop CLS 0.845 returned after the deploy (E0079): the empty shell painted before the deferred script. Fixed (F-0006), CLS 0 twice on both profiles (E0082–E0085).

## Not fixed (reasons)
- Weeks are chosen one at a time: late in a season a plan can use a few more repeats than the best possible (16 teams with 3 unplayed rounds: 10 against 8). Listed under README Limitations.
- The 2.00 division gap is fixed, not a setting. Listed under Limitations; a setting is the next step.
- CSV is UTF-8 without a byte-order mark; Excel may garble accents. Not verified against the Full-Time uploader, which is what reads the file.
- Engineering nits left as they are: mulberry32 duplicated in seed and scheduler, unused `stats` parameter of `generateBlock`, unnamed slot-scoring weights, CI job permissions not split, `@types/node` 26 against Node 22, `public/404.html` hard-codes `/regrade/`.
- Venue removal has no undo.
