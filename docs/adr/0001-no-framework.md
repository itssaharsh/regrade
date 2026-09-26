# ADR 1: One page, vanilla DOM, no runtime dependencies

Status: accepted, 2026-09-26.

Context: the product is one workspace with a few regions and a deterministic core. A framework, a state library or a CSS framework would add setup and explanation without changing what a judge sees.

Decision: TypeScript with Vite for the build, plain DOM rendering from one state object, tokens in one CSS file. Zero runtime dependencies.

Consequence: rendering re-draws each region on state change (cheap at 96 fixtures); a much larger league would need per-week virtualisation, noted in UI-SPEC §11.
