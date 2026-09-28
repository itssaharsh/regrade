---
id: F-0007
type: failure
title: Gemini structured output: array limits in the schema are rejected, and the free tier is often overloaded
status: active
scope: global-candidate
components: api/read-results.ts
triggers: gemini, structured output, zod max, HTTP 400, invalid argument, HTTP 503, high demand, 429, free tier, quota
evidence: api/read-results.ts, tests/intake.test.ts, test:npx vitest run tests/intake.test.ts
verified_at: 2026-09-28@0f01848
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: b6ac4c2e80a8f3d7
created: 2026-09-28
source: unknown
---

Attempted: AI SDK generateText with Output.object and a zod schema using .max() on arrays, against Gemini Flash models on a free-tier key. Error signature: HTTP 400 'Request contains an invalid argument' with the limits; without them, HTTP 503 'This model is currently experiencing high demand' on 3.5, 3.6, 3.7 and 3.8 Flash for over an hour at a time, 429 on 3.8 Flash after 20 requests in a day, and 'limit: 0' for 3.1 Pro. Root cause: Gemini's response schema doesn't accept array length limits; free-tier capacity is shared and newest models have tiny daily quotas. Fix (verified: live eval 6 of 6, E0120; tests 54): no array limits in the schema, trim in code; a model chain (3.1 Flash-Lite first, which was the most available and read the sample 23/23) tried in two rounds within a 26 s budget; the browser retries a busy answer twice and says so; the table path never depends on the model. Lesson: with Gemini, put limits in code, not the schema, and never let a demo depend on one free-tier model; make 'busy' a designed state. Early check: one structured call with the real schema on day 1, and a burst of 10 calls to see the 503/429 pattern.