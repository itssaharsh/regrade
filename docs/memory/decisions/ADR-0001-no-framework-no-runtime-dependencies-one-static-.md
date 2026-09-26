---
id: ADR-0001
type: decision
title: No framework, no runtime dependencies, one static page
status: active
scope: project
components: src/main.ts, index.html, vite.config.ts
triggers: framework, react, state library, dependency
evidence: docs/adr/0001-no-framework.md
verified_at: 2026-09-26@eb0866e
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: c8658dd8f1ad7418
created: 2026-09-26
source: unknown
---

See docs/adr/0001-no-framework.md: vanilla DOM rendering from one state object with Vite for the build; a framework would add setup and explanation without changing what a judge sees. Consequence: full region re-render on state change, fine at 96 fixtures.