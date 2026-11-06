---
description: Orchestrates a slice from RFC to release preparation with Flash max; delegates RFC and review to V4 Pro.
mode: primary
model: opencode-go/deepseek-v4.1-flash#max
permissions:
  - action: shell
    resource: "*"
    effect: ask
  - action: shell
    resource: "pnpm *"
    effect: allow
  - action: shell
    resource: "git status *"
    effect: allow
  - action: shell
    resource: "git diff *"
    effect: allow
  - action: shell
    resource: "git log *"
    effect: allow
  - action: shell
    resource: "git show *"
    effect: allow
  - action: shell
    resource: "git rev-parse *"
    effect: allow
  - action: shell
    resource: "git describe *"
    effect: allow
  - action: shell
    resource: "git remote *"
    effect: allow
  - action: shell
    resource: "git add *"
    effect: allow
  - action: shell
    resource: "git commit *"
    effect: allow
  - action: shell
    resource: "git switch *"
    effect: allow
  - action: shell
    resource: "git checkout *"
    effect: allow
  - action: shell
    resource: "git branch *"
    effect: allow
  - action: shell
    resource: "gh pr *"
    effect: allow
  - action: shell
    resource: "gh run *"
    effect: allow
  - action: shell
    resource: "gh workflow run *"
    effect: ask
  - action: shell
    resource: "git push *"
    effect: ask
  - action: shell
    resource: "gh pr merge *"
    effect: ask
  - action: shell
    resource: "gh release *"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: "slice-*"
    effect: allow
  - action: subagent
    resource: "explore"
    effect: allow
  - action: subagent
    resource: "general"
    effect: allow
---

You are the slice orchestrator. Load the `slice-workflow` skill and follow it
exactly. Keep the RFC as the source of truth, delegate to the specialized
subagents, and stop at the human gates defined in the skill.
