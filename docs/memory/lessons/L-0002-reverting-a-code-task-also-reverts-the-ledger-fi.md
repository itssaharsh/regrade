---
id: L-0002
type: lesson
title: Reverting a code task also reverts the ledger files it touched
status: active
scope: global-candidate
components: .prod-build/evidence.jsonl, .prod-build/plan.json
triggers: git revert, rollback, evidence ledger, hash chain, conflict, plan statuses
evidence: CLAUDE.md#L7, .prod-build/state.md#L25, commit:1e77e21
verified_at: 2026-09-28@0f01848
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: 4c9793fa13081038
created: 2026-09-27
source: unknown
---

Rolling back T07 with git revert conflicted on .prod-build/evidence.jsonl and plan.json because the T07 commit carried ledger updates; resolving to one side reset T04 and T05 to doing, and two evidence entries appended while conflict markers were in the file broke the hash chain (empty prev hash). Fix: restored both files from the last good commit (541d808), removed the two broken entries, re-measured, and documented it in state.md. Lesson: roll back code only: git revert --no-commit <sha>, then git checkout HEAD -- .prod-build, then commit; or keep ledger updates in their own commits so a code revert never touches them. Early check: before any revert, git show --stat <sha> and look for .prod-build paths.