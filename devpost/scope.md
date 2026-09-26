---
doc: scope
status: draft
---

# Regrade

One line: Regrade re-bands youth-league teams by results and refixtures them into your pitch slots, then exports the file FA Full-Time imports.

## The Unique Kernel
Re-grading by results, not just scheduling. The FA's own Full-Time system already schedules fixtures into venue timeslots and checks clashes; it does not sort teams into ability bands from a block's results or regenerate only the next block around a change. Regrade takes the results, proposes bands by goals-per-game, lets the secretary drag a team, regenerates the next four weeks inside the same slot capacity, and hands back the uploader's exact CSV. Delete the re-banding and it is a fixture generator like a dozen others.

## Who It's For
The volunteer fixtures secretary of a U7 to U11 mini-soccer league in England: dozens of teams per age group, shared central-venue pitches, results in every Saturday. Every four to six weeks they re-grade and re-make the fixtures in Excel, "around 4-5 hours per age group each time" (a Kent league secretary on the FA's support forum), then upload a spreadsheet to Full-Time.

## The Core Loop
Open Regrade, paste the block's results, see the proposed bands with each band's spread in goals per game, drag any team the secretary knows better than the numbers, click Generate, check the grid and the three counters (clashes, repeat pairings, home/away gap), download fixtureupload.csv, upload it to Full-Time. They come back every block.

## Inspiration & Identity
The world is a Saturday-morning central venue: the clubhouse whiteboard pitch plan, numbered pitch boards, training cones, the printed fixtures sheet, jersey numerals. The interface should feel like a well-kept pitch plan: white sheet, marker-black ink, one cone-orange action, the grid drawn like the pitches. References: the FA's Full-Time Fixtures guide v5.1 (https://www.thefa.com/-/media/cfa/sheffieldfa/files/technology/fixtures.ashx?la=en) for the uploader layout; the FA Grassroots Technology forum threads on how leagues schedule (https://grassrootstechnology.thefa.com/support/discussions/topics/48000566535 and https://grassrootstechnology.thefa.com/support/discussions/topics/48000559638). Direction detail in UI-SPEC.md.

## Why This Matters to the Learner
The learner asked for the best-evidenced idea from a research pass across four candidates; this one had a validated problem, a documented gap in the incumbent, and a visible before and after. The stake is a strong entry with a real user behind it.

## What "Working" Looks Like
Someone opens Regrade with the sample league loaded, sees 48 teams sorted into three bands with spread numbers, drags one team down a band, clicks Generate 4 weeks, watches the pitch-by-slot grid fill with the counters landing on 0, and downloads a CSV whose header matches the FA uploader's nine columns. The "oh, that's cool" beat: one drag, and the next four weeks regenerate around it.

## The POC Boundary
In: results paste (uploader layout with scores, or a simple table) and a synthetic sample league; banding by goals per game with drag and keyboard moves; slot setup (venues, pitches per venue, times, first Saturday); a four-week block with the constraints on screen; the unscheduled list when fixtures do not fit; fixtureupload.csv export and copy; a validate script that proves the constraints on the seeded league.

## Later
Postponement re-slotting; referee assignment; cup fixtures; multiple age groups in one workspace; saving a league between visits; a live deployment.

## Explicitly Cut
- Reading results directly from Full-Time: no league-level results export was evidenced, and no API exists; pasting keeps the tool usable today.
- Any AI or model call: the job is deterministic arithmetic and search; a model would add cost and doubt without adding value.
- Accounts and persistence: the artifact is a file the secretary uploads elsewhere; nothing needs to be stored.
