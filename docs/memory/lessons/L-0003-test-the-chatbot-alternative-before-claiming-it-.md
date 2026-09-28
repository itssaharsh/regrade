---
id: L-0003
type: lesson
title: Test the chatbot alternative before claiming it can't do the job
status: active
scope: global-candidate
components: scripts/assistant-baseline.ts, README.md
triggers: baseline, chatbot, general model, absorption, wrapper test, differentiation, claim
evidence: scripts/assistant-baseline.ts, scripts/recount.ts, README.md
verified_at: 2026-09-28@d785851
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: 8d1881e97bd907f3
created: 2026-09-28
source: unknown
---

The idea package and I expected a general model to fail a constraint-heavy fixture job. Measured (one run, E0146): Gemini 3.6 Flash, one prompt, no tools, produced a fully valid 96-fixture block in 149 s. Where it did fall short was the judgement part: its divisions were no better than the league's guess (24 of 48 misplaced vs Regrade's 16). Lesson: run the paste-into-a-chatbot test with a recount by the same rules as your own validator before writing any differentiation claim; the honest wedge is often judgement, repeatability and the workflow around the answer, not the core computation. Keep the prompt and raw answer in the repo.