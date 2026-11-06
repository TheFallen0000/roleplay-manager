---
name: Release Workflow
description: Prepare and publish a batched release with version bump, changelog roll, release PR, merge and verification.
---

# Release Workflow

Use this skill when the user runs `/release` or asks to publish a batched
release. You are the release operator. You only change the root version and the
changelog; you never touch feature code, tests, migrations or workflow files.

## Input

`$ARGUMENTS` may be:

- empty: propose the next version from `[Unreleased]`,
- `1.58.0`: use that exact version,
- `--prepare-only`: stop before push.

If no version is given, propose one and wait for approval before editing files.

## Sources of truth

1. `AGENTS.md` — release policy.
2. `CHANGELOG.md` — `[Unreleased]`.
3. `package.json` — current version.
4. `.github/workflows/release.yml` — what the workflow publishes.
5. `git log`, tags and GitHub releases.

## Stage 1 — Preflight

```sh
git status --short --branch
git switch master
git pull --ff-only
git log --oneline -5
git tag --list --sort=-v:refname | head -5
gh release list --limit 3
gh pr list --state open
```

Stop if:

- the working tree is dirty,
- `master` is not up to date,
- there are open PRs that should be part of the batch,
- `[Unreleased]` is empty.

Read `[Unreleased]` and propose the semver bump:

| Change                                   | Bump      |
| ---------------------------------------- | --------- |
| Breaking changes                         | **major** |
| New features (`Added`)                   | **minor** |
| Fixes/security only (`Fixed`, `Changed`) | **patch** |

State the current version, the proposed version and why. Wait for explicit
approval before continuing. Do not choose the version silently.

## Stage 2 — Release branch and files

```sh
git switch -c chore/release-vX.Y.Z
```

1. Bump the **root** `package.json` version only. Do not bump package versions
   under `packages/`.
2. Move the whole `[Unreleased]` content under:

   ```md
   ## [X.Y.Z] - YYYY-MM-DD
   ```

3. Leave `## [Unreleased]` empty.
4. Preserve the existing changelog format and section order. Do not invent link
   references or rewrite unrelated entries.
5. Review the diff before committing:

   ```sh
   git diff -- package.json CHANGELOG.md
   ```

## Stage 3 — Checks

Delegate the checklist to `slice-release` with the branch and version. It is
read-only and uses Flash. It must run:

```sh
pnpm check
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
pnpm build
pnpm audit --prod
git diff --check
```

Because the release changes `package.json`, always run the packaging dry-run on
the release branch:

```sh
gh workflow run release.yml --repo TheFallen0000/roleplay-manager --ref chore/release-vX.Y.Z -f publish=false
gh run watch <run-id> --repo TheFallen0000/roleplay-manager
```

Wait for `win-x64`, `linux-x64`, `linux-arm64`, `mac-arm64` and `mac-x64`.
If any target fails, stop. Do not publish.

## Stage 4 — Commit and release PR

```sh
git add package.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
```

Write the PR body to `/tmp/opencode/release-vX.Y.Z.md` with:

- version and date,
- the `[Unreleased]` summary,
- checks and dry-run result,
- the release workflow that will run after merge.

Then, after explicit approval:

```sh
git push -u origin chore/release-vX.Y.Z
gh pr create --base master --head chore/release-vX.Y.Z \
  --title "chore(release): vX.Y.Z" \
  --body-file /tmp/opencode/release-vX.Y.Z.md
gh pr checks <number> --watch
```

If `--prepare-only` was passed, stop here and leave the branch local.

## Stage 5 — Merge

After CI is green, request explicit approval, then:

```sh
gh pr merge <number> --squash --delete-branch
```

This merge is what triggers the publish: it pushes a `package.json` change to
`master`, and the release workflow builds and publishes `vX.Y.Z`. Do not create
a tag manually and do not run `gh release create`.

## Stage 6 — Verify the published release

Watch the workflow triggered by the merge:

```sh
gh run list --workflow release.yml --limit 3
gh run watch <run-id> --repo TheFallen0000/roleplay-manager
```

Then verify:

1. `gh release view vX.Y.Z` is published, not draft or prerelease.
2. The five assets are present, plus `SHA256SUMS` and `SHA256SUMS.sig`.
3. Download `SHA256SUMS`, `SHA256SUMS.sig` and the Linux x64 package.
4. Check the SHA-256 against `SHA256SUMS`.
5. Verify the Ed25519 signature with the release public key.
6. Run `node scripts/smoke-package.mjs <artifact>`.
7. Watch `deploy-website.yml` and confirm the download page shows `vX.Y.Z`.

If a step fails, report it with the run URL and stop. Do not delete the release,
force-push or retry blindly.

## Human gates

- Version choice.
- `git push`.
- `gh pr merge`.
- Any publish action.

Everything else — checks, dry-run, PR body, monitoring — is autonomous.

## Hard rules

- Never edit feature code, tests, migrations or workflows.
- Never run `git tag`.
- Never run `gh release create`, `gh release edit` or `gh release delete`.
- Never force-push.
- Never merge with a red CI or a failed dry-run.
- Never release with a dirty working tree or open PRs that belong in the batch.
