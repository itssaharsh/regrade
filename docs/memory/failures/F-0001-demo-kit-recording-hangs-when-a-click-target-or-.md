---
id: F-0001
type: failure
title: Demo-kit recording hangs when a click target or scroll is below the fold
status: active
scope: global-candidate
components: regrade-demo/demokit/run.py
triggers: demokit, virtual time, page.evaluate, hang, scroll, record
evidence: url:https://itssaharsh.github.io/regrade/, .prod-build/state.md
verified_at: 2026-09-26@eb0866e
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: e3b0c44298fc1c14
created: 2026-09-26
source: unknown
---

Attempted: record the storyboard with product-demo-video's run.py (Chromium under a paused virtual clock). Error signature: the recorder stops producing frames after the first live scene, no warning, no traceback; SIGABRT shows the event loop waiting in selectors.select; a --scene run of the affected scene hangs while other scenes record fine. Root cause (verified): run.py's smooth_scroll and the scroll action call page.evaluate without the kit's pump(), so under Emulation.setVirtualTimePolicy pause the call never returns; any click target below the 720px fold (box() scrolls first) or any explicit scroll action triggers it. Fix (verified: the move scene then recorded 144 frames): wrap those page.evaluate calls in s.pump(...) (wall=False for the per-step scrollTo). Lesson: when a kit mixes Playwright calls with a paused virtual clock, every awaited page call must be pumped; the un-pumped ones are the ones that hang. Early check: run --scene on a scene whose target is below the fold before recording the whole storyboard. Not the cause: draggable elements (tested by stripping the attribute), memory (2.6 GB free).