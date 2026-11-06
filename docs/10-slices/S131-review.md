# S131 — Review

**Estado:** PASS
**Revisor:** slice-reviewer
**Fecha:** 2026-11-06

## Hallazgos

### Revisión inicial — PASS WITH NOTES

The decision-A contract is implemented faithfully against the pinned test
plan; the migration, repository, entity, compaction math, preview/manifest
parity, UI apply/detect, and NIT-4 all match. One major safety-invariant gap
(reachable only via direct API/hand-edited data) plus several minor/nit
robustness issues.

**Limpio:**

- `resolveEffectiveWindow` (`packages/shared/src/lib/context-window.ts`):
  positive, finite, `<= contextWindow` net predicate and raw fallback match the
  pinned contract rows 3–5. Subpath export in `packages/shared/package.json`.
- Legacy S130 rows (`contextWindow` net, `workingWindow = NULL`): resolver
  falls back to raw → compaction is byte-identical to today (threshold
  `input+2048 ≥ 6553.6`, input budget 4505). No reinterpretation.
- Compaction math (`context-compaction.service.ts`): `outputCost = net ? 0 :
  outputTokens`, `thresholdBudget`/`targetBudget` subtract output only when
  `!net`, the summary-budget reduction branch is gated with `&& !net`, and
  `buildContext` uses the effective window/reserve. Matches rows 6–11.
- Preview / manifest / badge: `get-prompt-context` and `context-compiler`
  resolve the effective window; `manifest.estimatedTotalTokens =
  estimatedInputTokens` in net mode; the badge renders the net percentage.
- `generate-summary` still reads raw `contextWindow`; no change.
- `chat.tsx` under 500 lines and usage key includes `workingWindow`.
- Migration `0018_wet_absorbing_man.sql` + snapshot + journal: nullable
  integer, no default/backfill; `package.mjs` copies migrations.
- Architecture: pure shared helper, no layer violations, `check:arch` 7/7.
- No prompt/i18n/unrelated changes; NIT-4 guard is
  `typeof === "number" && finite && > 0`.

#### MAJOR (resuelto después)

1. **`workingWindow` guard was insufficient for the "net" invariant** —
   `update-conversation-settings.use-case.ts`. The guard only enforced
   `workingWindow <= contextWindow`, but compaction trusts any such value as
   already net of the reply reserve. A client could persist `workingWindow =
   8000` with `contextWindow = 8192`, `maxTokens = 2048`, and the prompt plus
   reply could exceed the model window. A genuine `computeWorkingWindow` always
   leaves the reserve, so this was reachable only via direct API or hand-edited
   data, but it was the over-budget failure this slice exists to prevent.

#### MINOR (resueltos después)

2. **Import persisted unvalidated `workingWindow`** —
   `import-character.use-case.ts`; a hand-edited export with an impossible pair
   was stored verbatim. Safe at resolution time but inconsistent state.
3. **`apply-settings-template` could abort the whole apply** — a template
   carrying a `workingWindow` that did not fit the target's raw window made
   `updateConversationSettings.execute` throw inside the loop.
4. **Lowering `contextWindow` without sending `workingWindow` left an
   inconsistent pair** — the stored net window could exceed the new raw window.

#### NIT

5. **`settings-panel.tsx`** — `nextWorkingWindow` nulls the working window when
   `(contextWindowChanged || modelChanged)` and the incoming value equals the
   current one; if a model/context change re-applies the same numeric working
   window it is falsely cleared. Extremely rare and conservative.
6. **Test description language** — some new `update-conversation-settings`
   test descriptions are in Spanish while the rest of the file is English.
7. **Dangling RFC references** — `S131-progress.md` refers to a
   `Plan de migración` and `Contrato y aritmética de compactación` section that
   do not exist. The decision and the test plan were used as the contract.

### Verificación post-review — PASS

Fixes applied in `80010e6` (production) and `3603a17` (tests):

- `resolveEffectiveWindow` now treats a working window as net only when
  `workingWindow + (maxTokens ?? 2048) <= contextWindow`. An unsafe pair falls
  back to raw + reserve, so compaction is conservative and cannot overflow. S130
  values whose output reserve was clamped below `conversation.maxTokens` fall
  back to raw instead of being rejected.
- `update-conversation-settings` clears a stored `workingWindow` when
  `contextWindow`/`maxTokens` changes and the stored value no longer fits; it
  still rejects `workingWindow > contextWindow` with `INVALID_CONTEXT_BUDGET`.
- `import-character` validates `workingWindow` against the clamped
  `contextWindow` and `maxTokens`; invalid pairs become null.
- `apply-settings-template` copies `workingWindow` only when model/provider
  match and the net window fits the target's final raw window/maxTokens;
  otherwise null. The apply loop can no longer abort.
- Tests added: resolver fallback for `8000/8192`; import invalid pair; template
  null-target; update clear on lowered raw window; net no-summary-reduce
  fixture adjusted to a valid `2048/768/1280` pair.

All four findings are resolved; no new blocker or major. Final verdict:
**PASS**.

Remaining nits moved to Deferred: comparator boundary equality between the
resolver (`+ maxTokens <= window`) and the update-clear (`+ maxTokens >=
window`), persisted-but-ignored explicit `workingWindow` values, and the
conservative fallback for clamped applies.

## Comandos

- `pnpm --filter @workspace/backend test` → 129 files / 798 tests.
- `pnpm --filter @workspace/frontend exec vitest run` → 70 files / 409 tests.
- `pnpm check` → arch 7/7, typecheck 5/5, lint 5/5.
- `pnpm build` → 4/4 tasks.
- `pnpm --filter @workspace/backend eval` → 1 file / 33 tests.
- `git diff --check` → clean.
