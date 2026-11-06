## S130 — Model capabilities and safe working window

Replaces the ad-hoc S121 detection (Ollama-only, context window only) with a
deterministic capability resolver that reports provenance and confidence, a
local cache, manual overrides, and a safe working window. The Model dialog shows
where each value came from and how much room is actually available for input.

### Scope

- **Shared:** `ModelIdentity`, `CapabilityClaim`, `ModelCapabilities`,
  `WorkingWindow` and `CuratedModelEntry`; pure resolver
  (`resolveModelCapabilities`, `normalizeModelIdentity`, `matchCuratedEntry`,
  `inferModelCapabilitiesHeuristic`) and integer `workingWindow` math with
  `ok`/`degraded`/`infeasible`/`unknown` states.
- **Backend:** LiteLLM catalog vendored with alias expansion and a refresh
  script; `ModelCapabilitiesCache` (15-minute TTL, injectable clock, stale
  reads); `GetModelCapabilitiesUseCase` with app/provider/instance/conversation
  override layers; Ollama `/api/show`, OpenAI-compatible/vLLM `/v1/models` and
  OpenRouter probes; cache invalidation on provider-instance edit/delete.
- **API:** `GET /api/providers/:id/capabilities` with `model`, `instanceId`,
  `refresh`, `contextWindow` and `maxTokens`.
  `GET /api/providers/:id/model-context` keeps its contract via `probeOnly`.
- **Frontend:** `use-model-capabilities`, `model-capabilities-suggestion` and
  `context-window-card`; the suggestion shows resolved window, max output,
  source, confidence and safe working window, with an “Apply detected” action.
  A typed window survives a model change.
- **Post-review UX fixes:** “Apply detected” overwrites a manual window with
  `workingWindow.workingWindow`; “Detect” also updates when a manual value
  exists; the applied value is no longer the raw window or `maxOutputTokens`.

### Key decisions

- **`probeOnly` for the legacy route.** `/model-context` only trusts the live
  probe, so it still returns `null` when the provider cannot measure the window
  and never invents a value from the curated table.
- **Conversation override travels through `/capabilities`.** The UI sends only
  `maxTokens`; the saved context window is not sent as an override, so
  “Apply detected” can replace it.
- **Cache only probe claims.** Overrides, the curated table, the heuristic and
  defaults are recomputed; the cache never stores URLs or API keys.
- **Catalog is generated, not hand-edited.** LiteLLM (MIT outside
  `enterprise/`) is filtered to chat/completion/responses and expanded by
  provider/region prefix.
- **Conservative defaults and heuristic.** 4,096/2,048 fallbacks and a
  parameter-size heuristic with `low` confidence.
- **Manual vs auto in the UI.** Typing, choosing a preset or applying a detection
  marks the value as manual; changing the model only replaces automatic values.
  “Detect” refreshes the probe once and rereads the suggestion.
- **UI extracted** into small components/hooks to keep `model-selector.tsx`
  under the 500-line limit.

### Verification

- `pnpm --filter @workspace/backend test` → **128 files / 778 tests**.
- `pnpm --filter @workspace/frontend exec vitest run` → **70 files / 405 tests**.
- `pnpm check` → arch **7/7**, typecheck **5/5**, lint **5/5**.
- `pnpm build` → **4/4** tasks.
- `pnpm audit --prod` → no known vulnerabilities.
- `git diff --check` → clean.
- Manual test executed; the post-review re-test passed.
- No migrations, export/import changes, new dependencies or lockfile changes.

### Review

- Independent review: **PASS WITH NOTES**
  (`docs/10-slices/S130-review.md`).
- Resolved blockers: legacy `unknown → null` contract, conversation override
  over HTTP, cache invalidation on instance edit/delete, empty probe clearing the
  previous claim, “Detect” without a double probe or misleading toast, portable
  refresh script.
- Post-review fixes: manual Apply/Detect behavior and safe-window application,
  covered by regression tests.

### Deferred

- Real tokenizer per provider (the `chars/3` heuristic remains).
- Adopting `workingWindow` in the compaction/send path, including the documented
  conservative double-reserve follow-up.
- models.dev as an alternative curated source.
- Dedicated llama.cpp `/props` probe.
- On-disk/DB cache persistence and automatic remote catalog refresh.
- Dedicated UI/API for per-instance overrides.

### Release

No version bump or release: entries live under `[Unreleased]` in `CHANGELOG.md`
and will ship in the next batched `chore(release): vX.Y.Z`.
