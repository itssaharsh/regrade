# Regrade

AI use disclosure: this project was planned and built with a coding agent (Claude Code) through the Devpost Learn skill pack (`.claude/skills/1-start` to `6-ship`), with the planning documents in `devpost/`. Design spec: UI-SPEC.md. Build plan: BUILD-PLAN.md. Decisions: docs/adr/.

Commands: `npm run dev`, `npm test`, `npm run validate`, `npm run build`. Deploy: `npx vercel deploy --prod` (project lack-toes/regrade, https://regrade-app.vercel.app). One server function, `api/read-results.ts`, calls Google Gemini with `GOOGLE_GENERATIVE_AI_API_KEY` from Vercel's environment (never in the repo); `AI_ENABLED=false` switches it off and the CSV path still works. No other third-party calls (fonts are self-hosted).

Rollback: revert code only, never the ledger: `git revert --no-commit <sha> && git checkout HEAD -- .prod-build && git commit` (see docs/memory/lessons/L-0002).
