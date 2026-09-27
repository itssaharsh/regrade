---
id: F-0006
type: failure
title: Script-filled panels painted empty first: desktop CLS 0.85 returned after the fonts were fixed
status: active
scope: global-candidate
components: index.html, src/style.css, src/main.ts
triggers: CLS, layout shift, first paint, module script, deferred, empty shell, Lighthouse desktop
evidence: src/style.css#L43-44, src/main.ts, commit:e8c2ad6
verified_at: 2026-09-27@e8c2ad6
relates: F-0005
supersedes: 
helpful: 0
harmful: 0
cite_hash: c14f6bb3ba09b305
created: 2026-09-27
source: unknown
---

Attempted: after T08 (fonts self-hosted, CLS 0) the final-review commit grew the bundle and the side panels. Error signature: Lighthouse desktop CLS 0.845 on #stage again (E0079) while mobile stayed 0; a PerformanceObserver showed one shift at 220 ms with #slots, #bands, #log and the footer moving from their empty-shell positions. Root cause: type=module scripts are deferred, so the browser may paint the static shell (empty panels) before main.ts renders; once filled, everything below moves. Whether the early paint happens depends on timing, which is why it came and went. Fix (verified E0082-E0085, CLS 0 twice on both profiles): body:not(.ready) .workspace, .foot {visibility:hidden}; main.ts adds .ready after the first render; a noscript rule and message for no-JS. Content that appears is not a layout shift; content that moves is. Lesson: when a static page's panels are filled by a deferred script, hide the shell until the first render instead of guessing reserved heights. Early check: a PerformanceObserver for layout-shift during page load, before Lighthouse.