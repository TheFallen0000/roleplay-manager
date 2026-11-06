---
name: Slice Workflow
description: Orchestrate a repo slice from RFC to release preparation with test-author, implementer, reviewer and docs subagents.
---

# Slice Workflow

Use this skill when the user runs `/slice` or asks to execute a slice end to
end. You are the orchestrator. The RFC is the contract; the tests are the
evidence; the subagents provide independent context.

## Input

`$ARGUMENTS` may be:

- `S129` or `docs/10-slices/S129-progress.md`
- `S129 --stage=rfc|tests|implement|review|docs|release`
- empty: pick the next pending slice from `docs/10-slices/`.

If `--stage` is present, run only that stage and stop. Otherwise run from the
current state to release preparation.

## Sources of truth

Read these before acting:

1. `AGENTS.md`
2. `docs/08-workflow.md`
3. `docs/10-slices/SX-progress.md`
4. The code, tests and `package.json` scripts.

Do not use this conversation as the source of truth. Re-read the files.

## Stage detection

Infer the stage from artifacts, not from what the user says:

| Stage       | Evidence                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------- |
| `rfc`       | The slice doc exists and contains a complete RFC. If `Estado` is `Draft`, stop for approval. |
| `tests`     | Red tests exist and fail for the expected reason; the failure is recorded in the slice doc.  |
| `implement` | The red tests exist; implementation is incomplete or failing.                                |
| `review`    | Tests and `pnpm check` pass; no review report yet.                                           |
| `docs`      | Review is `PASS` or `PASS WITH NOTES`; changelog and slice doc are incomplete.               |
| `release`   | Code, tests, review and docs are complete; release checks are not prepared.                  |

If the evidence is ambiguous, inspect `git status`, `git diff --stat`, the slice
doc and the test output before asking. Ask only when a human gate is hit.

## Branch

Before writing production code, check `git branch --show-current`. If you are on
`master`, create a short-lived branch:

- `feat/SX-slug` for features,
- `fix/SX-slug` for fixes,
- `docs/SX-slug` or `chore/SX-slug` otherwise.

Never commit to `master`. Do not push unless the human gate allows it. Keep
commits small and conventional (`feat(scope): ...`, `test(scope): ...`,
`docs(scope): ...`).

## Stage 1 — RFC

1. Delegate to `slice-architect` with the slice number and the known scope.
2. It reads `AGENTS.md`, `docs/08-workflow.md`, the template, the most recent
   slices and the relevant code, then creates or updates
   `docs/10-slices/SX-progress.md`.
3. It fills: problem, constraints, options, decision, out of scope, acceptance
   criteria, eval plan and risks; it sets `Estado: Draft`.
4. Read the RFC yourself and check it against the request. Fix only small
   omissions; send it back to the architect if the scope or eval plan is wrong.
5. Stop and ask the user to approve the RFC. Do not implement while it is
   `Draft`.

Do not mark the RFC as `Aprobado`. The user changes that field. If the
architect is unavailable, write the RFC yourself in the current session, but
keep it short and ask for approval.

## Stage 2 — Red tests

Default test authoring is Flash (`slice-test-author`). For delicate work, add a
short V4 Pro design pass first:

1. **Delicate slices:** memory/context selection, prompt parity, security,
   migrations, concurrency or anything with a high blast radius. Delegate to
   `slice-test-architect` to write `docs/10-slices/SX-test-plan.md` with the few
   cases that prove the contract, fixtures, assertions and commands.
2. Delegate to `slice-test-author` with:
   - the RFC path,
   - the test plan path if it exists,
   - the acceptance criteria,
   - the eval plan,
   - the exact test commands,
   - the files or modules involved.
3. The test author may edit tests, test utilities, test configs and `evals/`.
4. Run the tests yourself after it returns.
5. Record in the slice doc under `## Red tests`:
   - exact command,
   - expected failure,
   - relevant output.
6. If the tests pass unexpectedly, they are not red. Ask the test author to fix
   them or explain why the behaviour already exists.

Keep the matrix small: one test per acceptance criterion, plus the negative
cases that protect the contract. Do not ask for an exhaustive suite.

## Stage 3 — Implementation

Choose the smallest safe path:

- **Do it yourself** when the change touches five files or fewer and one layer.
- **Delegate to `slice-implementer`** when the change crosses layers, exceeds
  five files, or is well isolated by the RFC and tests.
- **Split by layer** (`shared` → `backend` → `frontend`) and run chunks
  sequentially. Never let two agents write the same files in parallel.

Give the implementer:

- the RFC path,
- the red-test command and output,
- the files it may touch,
- the architecture constraints from `AGENTS.md`,
- the required verification commands.

The implementer may edit production code only. After each chunk:

1. Run the relevant tests.
2. Run `pnpm check`.
3. If a test fails for the wrong reason, stop and fix the test or the RFC
   before continuing.

## Stage 4 — Review

Always delegate to `slice-reviewer` after the tests pass. Do not review your own
diff.

Give the reviewer:

- the RFC path,
- `git diff` (or the branch diff against `master`),
- the test and `pnpm check` output,
- the files changed.

The reviewer is read-only. It returns findings by severity. Write its report
verbatim to `docs/10-slices/SX-review.md` with:

```md
# SX — Review

**Estado:** PASS | PASS WITH NOTES | BLOCKED
**Revisor:** slice-reviewer
**Fecha:** YYYY-MM-DD

## Hallazgos

...
```

If there are blockers:

1. Fix them in the implementation.
2. Re-run the tests.
3. Request a second review.
4. Do not proceed to docs until the status is `PASS` or `PASS WITH NOTES`.

Notes and nits may be deferred only if the slice doc records them under
`## Deferred`.

## Stage 5 — Docs

Delegate to `slice-docs` with:

- the RFC path,
- `git diff --stat`,
- test, check and review results,
- the commit list so far.

It updates:

- `docs/10-slices/SX-progress.md` (status, decisions, verification, commits),
- `CHANGELOG.md` under `[Unreleased]` (Spanish),
- the PR body draft in English.

It must not edit code, tests, migrations or configuration. Verify the diff after
it returns.

## Stage 6 — Release readiness

Delegate the checklist to `slice-release`. It is read-only and runs:

```sh
pnpm check
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm build
pnpm audit --prod
git diff --check
```

If the slice changes `package.json`, `pnpm-lock.yaml`, native modules or
packaging, it requests approval and runs the release dry-run on the branch:

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref <branch> -f publish=false
gh run watch <run-id> --repo TheFallen0000/roleplay-manager
```

Wait for `win-x64`, `linux-x64`, `linux-arm64`, `mac-arm64` and `mac-x64`.
Write its report to `docs/10-slices/SX-release.md` and prepare the PR body.
Do **not** bump the version or publish a release; that is `/release`'s job.

## Stage 7 — Ship the slice PR

This stage is optional and only after explicit approval. It ships the slice, not
a release:

```sh
git add <files>
git commit -m "<type>(<scope>): <summary>"
git push -u origin <branch>
gh pr create --base master --head <branch> --title "<type>(<scope>): <summary>" --body-file <body>
gh pr checks <number> --watch
```

After CI is green and the user approves:

```sh
gh pr merge <number> --squash --delete-branch
```

Do not bump the version, create a tag or publish a release. Those belong to
`/release` and the GitHub Actions release workflow.

## Subagent routing

| Stage          | Agent                       | Model  | May edit                | Must produce            |
| -------------- | --------------------------- | ------ | ----------------------- | ----------------------- |
| RFC            | `slice-architect`           | V4 Pro | slice doc               | RFC in `Draft`          |
| Test plan      | `slice-test-architect`      | V4 Pro | test plan only          | focused test matrix     |
| Red tests      | `slice-test-author`         | Flash  | tests/evals/config only | failing tests + command |
| Implementation | self or `slice-implementer` | Flash  | production code only    | green tests             |
| Review         | `slice-reviewer`            | V4 Pro | nothing                 | findings by severity    |
| Docs           | `slice-docs`                | Flash  | docs/CHANGELOG          | updated docs + PR body  |
| Release checks | `slice-release`             | Flash  | nothing                 | checklist + dry-run     |
| Ship           | self                        | Flash  | git/PR only             | merged slice PR         |

Decide from this table. Do not ask the user which subagent to use. V4 Pro is
reserved for RFC, delicate test design and review; everything else uses Flash.

## Sessions and context

Start a new session for each slice, and preferably for each stage (RFC,
implementation, review). The RFC and tests are files; they are the handoff, not
the chat history.

- Do not continue a very long session that already carries other slices.
- If a session accumulates a huge context (for example, more than ~20m cache
  reads), stop and continue in a new session from the RFC and the branch.
- Use `opencode stats --project . --days 0 --full` at stage boundaries when
  available.
- Keep tool outputs small: use `read` with offsets, `grep`, `glob` and
  `explore`; avoid dumping whole files, full diffs or long test logs into the
  main session.
- Summarize results in the slice doc or a subagent report instead of keeping
  them in the conversation.

## Permissions

Subagents have role-scoped edit permissions, not blanket edit. That is
intentional: the reviewer stays read-only and the test author cannot change
production code.

If a subagent reports a permission blocker:

1. Confirm the path is part of that role's job.
2. Update the agent permission in `.opencode/agents/<agent>.md`.
3. Re-run the task from the last artifact; do not ask the subagent to work
   around the permission with shell writes.

Do not grant edit access to the reviewer. Do not grant test/config access to the
implementer. If a task genuinely needs a broader role, split the task instead of
widening permissions.

## Autonomy and human gates

Autonomous:

- stage detection,
- test-plan, test-author, implementer, reviewer, docs and release-check
  deployment,
- retries after a failed test,
- small fixes that do not change the RFC,
- release checks and dry-run.

Human gates:

- RFC approval while `Estado: Draft`,
- scope changes that alter the RFC,
- architectural decisions not covered by the RFC,
- review blockers that require a design change,
- push and merge of the slice PR,
- version bump, tag and publish (delegate to `/release`).

Subagents have no fixed step limit. If one fails twice or the task keeps growing,
stop and split the task; do not loop or let it run unbounded.

## Failure handling

- **Wrong test failure:** fix the test or the RFC before touching production
  code.
- **Review blocker:** fix, rerun tests, re-review.
- **Scope creep:** update the RFC and ask for approval before continuing.
- **Flaky test:** record it; do not hide it with retries.
- **Unclear requirement:** ask one focused question, not a questionnaire.

## Output

At the end of each run, report:

- slice and branch,
- current stage,
- commands run and results,
- files changed,
- review status,
- open risks,
- next human action.

Keep the report short. Link to the artifacts instead of pasting them.

## SDK/API

The interactive workflow needs only the primary agent and the `subagent` tool.
The primary agent decides which subagent to launch from the table above.

Use the OpenCode SDK/API only when the workflow must run outside a TUI session:
CI, a cron job, another application, or a deterministic state machine that
enforces the stages without a human. For this repository, start with the command
and add the SDK only if the command proves insufficient.
