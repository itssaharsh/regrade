---
id: F-0005
type: failure
title: Web-font swap shifted the stage: desktop CLS 0.854, and non-blocking font CSS made it worse
status: active
scope: global-candidate
components: index.html, src/style.css, public/fonts
triggers: CLS, layout shift, Lighthouse, Google Fonts, font-display swap, preload, web font
evidence: index.html#L10-11, src/style.css#L1-4, commit:36ed975
verified_at: 2026-09-28@0f01848
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: c00f0ada3cbaaf0a
created: 2026-09-27
source: unknown
---

Attempted: Google Fonts stylesheet with display=swap (desktop Lighthouse perf 73, CLS 0.854), then T07 loaded that stylesheet without blocking first paint (media=print onload swap). Error signature: T07 raised CLS to 0.71-0.85 on both profiles (E0045 FAIL) and was reverted; with the blocking stylesheet desktop CLS stayed 0.854 while mobile read 0. Root cause: the condensed display face and the body face have very different metrics from their fallbacks, so the swap re-flowed the header and pushed #stage down after first paint; the third-party round trip (fonts.googleapis.com then fonts.gstatic.com) made the swap land late, after the layout was already painted. Fix (verified E0054, E0055, E0056 on the live URL): self-host the three latin woff2 subsets under public/fonts (61 KB total), declare @font-face in the first lines of style.css, and preload the two faces used above the fold; result desktop perf 100 CLS 0, mobile perf 99 CLS 0, no third-party requests. Lesson: a web-font CLS is fixed by making the font arrive before first layout (same-origin plus preload), not by deferring the font CSS, which only moves the swap later. Early check: run Lighthouse desktop as well as mobile before calling performance done; the desktop profile's faster first paint exposes a late swap that the mobile profile hides.