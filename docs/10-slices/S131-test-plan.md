# S131 — Test plan (handoff for `slice-test-author`)

Contract: `docs/10-slices/S131-progress.md` (RFC, Aprobado, decision A). This plan
pins the exact names/signatures so test author and implementer agree. Do not
re-decide the API. Style/format: `docs/10-slices/S130-test-plan.md`.

## 1. Scope

Prove: the `working_window` migration + repository round-trip, the pure effective-window
resolver, compaction math in net vs legacy-raw mode, preview/manifest parity with the
compaction estimate, `generate-summary` raw-window non-regression, export/import/branch/
template propagation, UI Apply/Detect/edit persistence, and NIT-4 override omission.

**NOT tested:** `send/continue/regenerate` adopting `workingWindow` (deferred, RFC
§Fuera de alcance — ChatEngine still reserves), the curated-catalog cost (deferred +
measured only; **no** build/perf assertion), real tokenizers, UI polish.

## 2. Contract to pin

### Shared helper — `packages/shared/src/lib/context-window.ts` (new)

```ts
export interface EffectiveWindow { window: number | null; outputReserve: number; net: boolean }
export const resolveEffectiveWindow = (params: {
  contextWindow: number | null
  workingWindow: number | null | undefined
  maxTokens: number | null | undefined
}): EffectiveWindow
// net = workingWindow != null && Number.isFinite(workingWindow)
//       && workingWindow > 0 && (contextWindow != null ? workingWindow <= contextWindow : false)
// if (net) return { window: workingWindow, outputReserve: 0, net: true }
// return { window: contextWindow ?? null, outputReserve: maxTokens ?? 2_048, net: false }
```

- Zero/negative/`NaN`/`> contextWindow`/`null`/`undefined` `workingWindow` → raw
  (falls back). `window` is `null` when `contextWindow` is null/`<=0` (compaction then
  bails exactly as today).
- **Pin the return to include `net`** (the RFC sketch said `{ window, outputReserve }`
  but compaction branches on `net`). Flag #1 below.
- Imported as `@workspace/shared/lib/context-window` (subpath, like
  `lib/compaction`); tested from backend vitest importing `@workspace/shared`.

### Schema / entity / DTO / Zod

- Migration `0018_*`: `ALTER TABLE conversations ADD working_window integer;`
  (nullable, **no default, no backfill**). Append one entry to `meta/_journal.json`
  (`version` `6`, tag `0018_*`, `breakpoints: true`) — copy the `0017` entry shape.
- `conversations.schema.ts`: `workingWindow: integer("working_window")`.
- `Conversation` entity: `ConversationProps.workingWindow?: number | null`, getter
  `get workingWindow(): number | null` (`props.workingWindow ?? null`). Do **not**
  run `workingWindow` through `clampContextWindow` (it would turn `0` into `1`);
  validity lives only in `resolveEffectiveWindow`. Flag #2.
- `ConversationDetail` + `ConversationSettingsUpdate` add `workingWindow?: number | null`.
- `conversation.routes.ts` `UpdateConversationSettingsSchema`:
  `workingWindow: z.number().int().min(1).max(MAX_CONTEXT_WINDOW).nullable().optional()`
  (identical to `contextWindow`). `character.routes.ts` `ExportSettingsSchema`:
  `workingWindow: z.number().int().min(1).nullable().optional()`.
- Cross-field `workingWindow <= contextWindow` **cannot** live in Zod; enforce it in
  `update-conversation-settings.use-case.ts` (reject with `INVALID_CONTEXT_BUDGET`
  or clear to `null`). Flag #3.

### Compaction (exact) — `context-compaction.service.ts`

`needsCompaction`: `threshold = window * compactionThreshold / 100` (float, unchanged);
`totalTokens` = estimate's `totalTokens` (net → `inputTokens`, raw → `inputTokens + reserve`).
Trigger when `totalTokens >= threshold`.
`compact`: `desiredOutput = maxTokens ?? 2_048`; `totalBudget = floor(threshold)`;
`fixedTokens = base.systemTokens + minimumKeptTokens`;
`preferredSummary = min(1_024, max(256, floor(window * 0.1)))`;
`thresholdBudget = net ? totalBudget : max(1, totalBudget - desiredOutput)`;
`targetBudget = net ? max(1, floor(window * targetRatio)) : max(1, floor(window * targetRatio) - desiredOutput)`;
`keepBudget = max(0, targetBudget - base.systemTokens - summaryBudget)`.
`outputTokens` counts **only in raw mode** (the two reduction checks, and
`thresholdBudget`/`targetBudget` subtract it only when `!net`).
`buildContext` calls `estimateContextTokens({ outputReserve: net ? 0 : maxTokens ?? 2048,
contextWindow: net ? workingWindow : contextWindow })`.

### Preview / manifest

`get-prompt-context.use-case.ts`: `outputReserve = net ? 0 : maxTokens ?? 2048`,
`contextWindow = net ? workingWindow : contextWindow` for both the `estimateContextTokens`
call and the `compile` `outputReserve`. `context-compiler.service.ts` manifest:
`contextWindow = effective window`, `outputReserve` = same, `estimatedTotalTokens =
estimatedInputTokens + outputReserve` (so net → no extra reserve).

### NIT-4

`use-model-capabilities.ts` `buildOptions`: add `conversationOverride` **only** when
`typeof conversationMaxTokens === "number" && conversationMaxTokens > 0` (finite).
`null`/`undefined`/`0`/negative omit the key (single predicate covers all). API layer
`providers.ts` keeps filtering (defense in depth, no change).

### Export/import/branch/template

`EXPORT_SCHEMA_VERSION` stays `1`. `ExportSettings` adds `workingWindow?: number | null`.
`export-character` `toSettings`/`toSettingsUpdate` copy it; `import-character` writes
`workingWindow: settings.workingWindow ?? null` (old exports → null). `branch-conversation`
copies `workingWindow: origin.workingWindow`. `apply-settings-template` copies
`workingWindow` **only when** the template's `model`/`provider` equal the target's
resolved provider/model — otherwise `null` (avoid a stale net window).

## 3. Files + commands

| Area | File (existing or new) | Runner |
| --- | --- | --- |
| resolver (pure) | `packages/backend/src/application/services/context-window.resolver.test.ts` (new) | backend |
| compaction math | `packages/backend/src/application/services/context-compaction.service.test.ts` (extend) | backend |
| repository/migration | `packages/backend/src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-conversation.repository.test.ts` (extend) | backend |
| preview/manifest parity | `packages/backend/src/application/use-cases/conversation/get-prompt-context.parity.test.ts` (extend) + `.test.ts` | backend |
| generate-summary | `packages/backend/src/application/use-cases/summary/generate-summary.use-case.test.ts` (extend) | backend |
| export/import/branch/template | `.../character/export-character.use-case.test.ts`, `import-character.use-case.test.ts`, `apply-settings-template.use-case.test.ts`, `.../conversation/branch-conversation.use-case.test.ts` (extend) | backend |
| use-case guard | `packages/backend/src/application/use-cases/conversation/update-conversation-settings.use-case.test.ts` (extend, if it exists; else add) | backend |
| UI apply/detect/edit | `packages/frontend/src/components/conversation/model-selector.test.tsx` (extend) | frontend |
| settings save | `packages/frontend/src/components/conversation/settings-panel.test.tsx` (extend) | frontend |
| NIT-4 | `packages/frontend/src/components/conversation/model-selector.test.tsx` (extend) | frontend |

**Commands:** `pnpm --filter @workspace/backend test` · `pnpm --filter @workspace/frontend exec vitest run` · `pnpm check` (arch + typecheck + lint) · `pnpm build` · `pnpm eval` (root → `@workspace/backend eval`, `evals/context-assembly.eval.test.ts`; **relevant** — it snapshots the manifest/assembly path this slice touches; fixtures are legacy/raw so no numbers change).

**Mocking:** reuse the existing builders verbatim — compaction test's `conversation(overrides)` / `messages(count, length)` / `builder(systemLength)`, `get-prompt-context` repos, `branch`/`export`/`apply-template` repos. No new deps, no real `fetch`, no fake timers. Shared `resolveEffectiveWindow` is side-effect-free (pure) — import and call directly.

## 4. Fixture matrix (exact values)

Uniform token fixture: `builder(300)` → `systemTokens = 110` (ceil(300·11/30)).
Uniform 300-char messages (`"x".repeat(300)`, roles alternating) → **114 tokens/message**
(110 + 4 overhead). Canonical: `contextWindow = 8192`, `workingWindow = 5735`,
`maxTokens = 2048`, `compactionThreshold = 80` ⇒ `threshold = 4588.0`,
`targetRatio = 0.6`, `preferredSummary = 573` (net) / `819` (raw).

| # | AC | File | Scenario / input | Expected (exact) | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | migration round-trip | drizzle-conversation.repository.test | `create` w/ `workingWindow: 5735, contextWindow: 8192` → `findById` | `.workingWindow === 5735` and `.contextWindow === 8192` | both columns mapped |
| 2 | legacy NULL | drizzle-conversation.repository.test | `create` without `workingWindow`; `updateSettings(id, { workingWindow: 5735 })` then `{ workingWindow: null }` | read `null` → `5735` → `null` | nullable, no default/backfill |
| 3 | resolver net | context-window.resolver.test | `{8192, 5735, 2048}` / `{8192, 128, 2048}` | `{window:5735,outputReserve:0,net:true}` / `{window:128,outputReserve:0,net:true}` | net = no reserve |
| 4 | resolver fallback | context-window.resolver.test | `workingWindow ∈ {null, undefined, 0, -5, NaN, 9000}` w/ `{8192, 2048}` | every → `{window:8192,outputReserve:2048,net:false}` | 0/neg/NaN/`>window`/null → raw |
| 5 | resolver null window | context-window.resolver.test | `{null, 5735, 2048}` and `{0, 5735, 2048}` | `{window:null,outputReserve:2048,net:false}` | no window → raw/null |
| 6 | needsCompaction net | context-compaction.service.test | `{8192, 5735}` 39 msgs → `input = 4556`; 40 msgs → `4670` | `false` at 39; `true` at 40 | net: `totalTokens = input` vs `4588` |
| 7 | needsCompaction raw | context-compaction.service.test | `{8192, null}` 39 msgs (`input 4556 + 2048 = 6604`) | `true` at 39 (vs **false** net) | raw keeps the reserve → distinguishes |
| 8 | compact net | context-compaction.service.test | `{8192, 5735}`, 40 msgs, summary ok | `ok`, `outputTokens === 2048`, `execute` called w/ `maxTokens: 573` (summaryBudget) | no output subtraction |
| 9 | compact raw (non-regression) | context-compaction.service.test | `{8192, null}`, 40 msgs | `outputTokens === 2048`, `execute` w/ `maxTokens: 819`, `thresholdBudget = 4505` | identical to today |
| 10 | compact net no-summary-reduce | context-compaction.service.test | `{2048, 2048}` (net) w/ 40 msgs | `execute` w/ `maxTokens: 256` (preferred), **not** reduced to `128`/`0` | raw would reduce; net doesn't |
| 11 | compact robust tiny | context-compaction.service.test | `{8192, 128}` net | `compact` returns a valid union member (ok or `CONTEXT_TOO_LARGE`), never throws, `outputTokens >= 0` | degraded never persists; still robust |
| 12 | preview/manifest parity | get-prompt-context.parity.test | `{8192, 5735}`, `input = 4600` | `metadata.contextWindow === 5735`, `outputReserve === 0`, `contextPercent === 80`, `manifest.contextWindow === 5735`, `manifest.outputReserve === 0`, `manifest.estimatedTotalTokens === manifest.estimatedInputTokens` | no double reserve; badge correct |
| 13 | generate-summary raw | generate-summary.use-case.test | `findById` returns `{contextWindow: 2500, maxTokens: 2048, workingWindow: 5735}` | chunking identical to `workingWindow` absent (budget `512`); assert `capturedContexts.length` unchanged | reads raw `contextWindow` only |
| 14 | export→import | export + import tests | conversation `workingWindow: 5735` | `exported.settings.workingWindow === 5735`; import creates `workingWindow === 5735`; old export (no key) → `null` | optional field, schema v1 |
| 15 | branch | branch test | origin `workingWindow: 5735` | created conversation `workingWindow === 5735` (spy `conversationCreate`) | branches copy both |
| 16 | template | apply-settings-template.test | template `{model:"gpt-4o-mini", provider:"ollama", workingWindow: 5735}` matching target | `updateSettings` receives `workingWindow: 5735`; template `{model:"gpt-4o", …}` non-matching → `workingWindow: null` (or omitted → null) | stale net window avoided |
| 17 | UI apply | model-selector.test | manualConversation, click Apply (capabilities cw `32768`, ww `29082`) | `onChange` called w/ `{contextWindow: 32768, workingWindow: 29082}` | raw + working, not net into `contextWindow` |
| 18 | UI detect/edit | model-selector.test | Detect; type `16384`; preset `8k`; model change | each → `workingWindow: null` in `onChange` | manual edit clears net |
| 19 | settings save | settings-panel.test | mock `ModelSelector` calls `onChange({contextWindow: 32768, workingWindow: 29082})` | `updateConversationSettings("conv-1", {contextWindow: 32768, workingWindow: 29082})`; second run `{workingWindow: null}` when cleared | `handleSaveModelo` sends `workingWindow` |
| 20 | NIT-4 positive | model-selector.test | openaiConversation (`maxTokens: 4096`) | `getModelCapabilities` w/ `{conversationOverride:{maxTokens:4096}}` (unchanged) | valid stays |
| 21 | NIT-4 null/0 | model-selector.test | `current` with `maxTokens: null` and `maxTokens: 0` | `getModelCapabilities` called **without** `conversationOverride` (assert no 4th options arg / `not.objectContaining`) | omit empty override |

## 5. Ordering for red tests

1. `context-window.resolver.test` → `Cannot find module '@workspace/shared/lib/context-window'`.
2. compaction + repository + preview + generate-summary + export/import/branch/template
   extensions → `TS2339` (`workingWindow` missing on `Conversation`/`ConversationDetail`/
   `ConversationSettingsUpdate`/`ExportSettings`).
3. frontend model-selector/settings-panel → `TS2339` (`workingWindow` missing on `ConversationDetail`/`ModelUpdate`) and NIT-4 still sends override for `null`.
Import failures are acceptable red; verify the reason is the missing property/module, not an assertion.

## 6. Ambiguities the author must NOT guess

1. **`resolveEffectiveWindow` return shape.** RFC text says `{ window, outputReserve }` but
   compaction branches on `net`. Pin: return `{ window, outputReserve, net }` (net ≡ the
   net-mode branch was taken). Do not derive `net` from `outputReserve === 0`.
2. **Entity clamp.** RFC AC says "clamp" for `workingWindow`, but `clampContextWindow`
   turns `0`/negative into `1` (a spurious net window). Pin: entity stores `workingWindow`
   as nullable passthrough (`?? null`), **no** `clampContextWindow`; validity is only in
   `resolveEffectiveWindow`. If implementer disagrees, the resolver tests (rows 3–5) are the
   source of truth and must still pass.
3. **`workingWindow > contextWindow` at the API.** Zod can't cross-field validate. Pin: the
   `update-conversation-settings` use case rejects it (`INVALID_CONTEXT_BUDGET`) or clears to
   `null` — pick one and assert it. Row 4's fallback covers the defensive case either way.
4. **Preview vs send parity.** The existing `.parity.test.ts` compares `get-prompt-context`
   against `ChatEngine` (`send`), and `send` is **out of scope** (still reserves). Do **not**
   extend that comparison to net conversations (they would legitimately differ). Row 12 asserts
   preview-vs-own-manifest/estimate parity only; keep the existing send-parity fixtures legacy.
5. **Settings save without over-mocking.** `settings-panel.test.tsx` mocks `ModelSelector` to a
   static div, so `modelUpdate` never changes. For row 19, change the mock to accept `onChange`
   and invoke it in an effect with a fixed `ModelUpdate` (least-mocked path that still exercises
   the real `handleSaveModelo` diff). Do not re-mount the real `ModelSelector` (drag in provider
   store mocks).
6. **Representing a legacy row.** In the repository test, a legacy row = a conversation created
   via `Conversation.create` **without** `workingWindow` (maps to `working_window` NULL). There is
   no in-band way to distinguish a legacy net `context_window` from a typed raw one — by design
   (RFC §Riesgos); do not invent a discriminator.

## 7. Out of scope (deferred)

`send/continue/regenerate` adopting `workingWindow`; curated-catalog cost (measured only, no
perf assertion); real per-provider tokenizers; `conversationOverride` type narrowing in
`providers.ts` (optional).
