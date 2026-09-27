---
id: L-0001
type: lesson
title: Lighthouse under WSL writes C:\Users\... profile folders into the working directory
status: active
scope: global-candidate
components: .gitignore
triggers: lighthouse, WSL, chrome-launcher, temp dir, C:, git status
evidence: .gitignore#L13, .prod-build/state.md#L25
verified_at: 2026-09-27@e8c2ad6
relates: 
supersedes: 
helpful: 0
harmful: 0
cite_hash: bc39bbc5c83e94a2
created: 2026-09-27
source: unknown
---

Running npx lighthouse from the repo under WSL2 made chrome-launcher create folders literally named C:\Users\<user>\AppData\Local\lighthouse.<n> in the current directory (it resolved a Windows temp path but created it relative to the Linux cwd). They showed up as untracked files and blocked a clean revert. Fix: delete them, add C:* to .gitignore, and run Lighthouse from /tmp (sh -c 'cd /tmp && CHROME_PATH=<playwright chromium> npx lighthouse@12 ...'). Early check: git status after the first Lighthouse run on a WSL machine.