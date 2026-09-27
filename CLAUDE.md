# Regrade

AI use disclosure: this project was planned and built with a coding agent (Claude Code) through the Devpost Learn skill pack (`.claude/skills/1-start` to `6-ship`), with the planning documents in `devpost/`. Design spec: UI-SPEC.md. Build plan: BUILD-PLAN.md. Decisions: docs/adr/.

Commands: `npm run dev`, `npm test`, `npm run validate`, `npm run build`. No secrets, no API keys, no third-party network calls (fonts are self-hosted).

Rollback: revert code only, never the ledger: `git revert --no-commit <sha> && git checkout HEAD -- .prod-build && git commit` (see docs/memory/lessons/L-0002).
