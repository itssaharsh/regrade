# ADR 5: A model reads results written any way; code decides what is kept

Status: accepted, 2026-09-28.

Context: the parser only reads two CSV layouts, and no league-level results export from Full-Time was found, so a secretary with results in a message thread, an email or notes had to retype them into a table first. Turning free text into rows is the one step in Regrade where a model is the right tool; banding, scheduling and export must stay deterministic. A static page cannot hold an API key, which is why this wasn't built while the app was on GitHub Pages.

Decision:
- One server function, `api/read-results.ts` on Vercel, makes one structured-output call (Vercel AI SDK, Google Gemini through the learner's own key, `REGRADE_MODEL`, default a Flash model) with the pasted text, every line numbered.
- The model only extracts: each row cites a line number and copies the team names exactly as written. It never corrects spellings or invents rows.
- Code decides (`src/intake.ts`): a row is kept only if both names and both scores are in the line it cites; a division or date is kept only if it appears in the text; a line read twice is listed once. Short names are matched to known teams only when exactly one team contains all the written words ("Westcombe Golds" → Westcombe Wanderers Golds); otherwise the row is marked new or ambiguous. The combined results then go through the same parser as a pasted table (duplicates, formulas, self-play).
- The secretary sees every row beside its source line, plus what was held back, rejected or skipped, and confirms before anything is added.
- Caps: 8,000 characters or 150 lines in, 6,000 tokens out, a 25 s timeout, one retry, 6 reads a minute and 40 a day per address (per function instance). `AI_ENABLED=false` or a missing key turns it off; the button then doesn't appear and the CSV path works as before. The pasted text is not logged or stored; the UI says it goes to Google Gemini.

Consequences: results in any written form reach the same checks as a table; a hallucinated row cannot enter the league unless its names and scores are really in the cited line (tests/intake.test.ts, evals/read-results.jsonl); the rate limit is per instance, so a determined abuser could spread requests (acceptable for a demo; a shared store or the Vercel firewall would be the next step).
