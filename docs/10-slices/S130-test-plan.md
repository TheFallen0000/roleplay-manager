# S130 — Test plan (handoff for `slice-test-author`)

Contract: `docs/10-slices/S130-progress.md` (RFC, Aprobado). This plan fixes the exact
names/signatures so implementer and test author agree. Do not re-decide the API.

## 1. Scope

Tests prove: pure resolver precedence, identity normalization, deterministic
working-window math, the in-memory cache, the orchestration use case, the three
provider probes, the manual-override layering, and the frontend suggestion. Mapped
1:1 to the RFC acceptance criteria (each matrix row cites the AC).

**NOT tested (out of scope):** UI visual polish / real network / real tokenizers
(chars/3 heuristic stays the base), real LiteLLM data coverage (a 3-entry fixture
stands in for the vendored table), on-disk/DB cache persistence, runtime catalog
refresh, `workingWindow` adoption in the send/compact path (S130 only exposes it).

## 2. Contract to pin down

### Shared types — `packages/shared/src/types/model-capabilities.ts`

```ts
export type CapabilitySource =
  | "manual-override" | "runtime-introspection" | "provider-api"
  | "curated-table" | "heuristic" | "default"
export type Confidence = "high" | "medium" | "low"
export type CapabilitySpecificity = "exact" | "family" | "alias"

export interface ModelIdentity {
  provider: string
  instanceId: string | null
  normalizedModel: string
}

export interface CapabilityClaim {
  source: CapabilitySource
  confidence: Confidence
  /** normalized model this claim targets */
  model: string
  specificity: CapabilitySpecificity
  contextWindow?: number | null
  maxOutputTokens?: number | null
}

export type CapabilityWarningCode =
  | "PROBE_FAILED" | "STALE_CACHE" | "OUTPUT_RESERVE_CLAMPED"
  | "OUTPUT_RESERVE_TOO_LARGE" | "WORKING_WINDOW_NEGATIVE"

export interface ModelCapabilities {
  identity: ModelIdentity
  contextWindow: number | null
  contextWindowSource: CapabilitySource | null
  contextWindowConfidence: Confidence | null
  maxOutputTokens: number | null
  maxOutputTokensSource: CapabilitySource | null
  maxOutputTokensConfidence: Confidence | null
  /** = contextWindowConfidence (primary field) */
  confidence: Confidence | null
  warnings: CapabilityWarningCode[]
}

export type WorkingWindowStatus = "unknown" | "ok" | "degraded" | "infeasible"
export interface WorkingWindow {
  status: WorkingWindowStatus
  contextWindow: number | null
  outputReserve: number | null
  safetyMargin: number | null
  workingWindow: number | null   // 0 for infeasible, null for unknown
  warnings: CapabilityWarningCode[]
}

export interface CuratedModelEntry {
  model: string                      // canonical id, e.g. "gpt-4o-mini"
  contextWindow?: number             // LiteLLM max_input_tokens
  maxOutputTokens?: number           // LiteLLM max_output_tokens
}
```

Re-export from `src/index.ts` (`export * from "./types/model-capabilities"`).
**Primary import in tests is the subpath** `@workspace/shared/types/model-capabilities`
(matches existing code); the index re-export only satisfies the AC.

### Shared lib — `packages/shared/src/lib/model-capabilities.ts`

```ts
export const SAFETY_MARGIN_NUM = 5
export const SAFETY_MARGIN_DEN = 100          // 5%
export const SAFETY_MARGIN_FLOOR = 128
export const MIN_WORKING_WINDOW = 256
export const DEFAULT_OUTPUT_RESERVE = 2_048

export function normalizeModelIdentity(
  provider: string, model: string, instanceId?: string | null,
): ModelIdentity
// rules: lowercase, trim, collapse internal whitespace to single space;
// strip leading "openrouter/" prefix (→ "vendor/model"); preserve ":" tags.

export function matchCuratedEntry(
  normalizedModel: string, entryModel: string,
): CapabilitySpecificity | null
// exact > family (prefix at word/tag boundary, e.g. "qwen2.5" vs "qwen2.5:14b")
// > alias (through a small alias map); null = no match.

export function resolveModelCapabilities(params: {
  target: { provider: string; model: string; instanceId?: string | null }
  claims?: readonly CapabilityClaim[]               // runtime-introspection + provider-api
  curatedTable?: readonly CuratedModelEntry[]       // → curated-table
  heuristic?: { contextWindow?: number; maxOutputTokens?: number } | null  // → heuristic
  defaults?: { contextWindow?: number; maxOutputTokens?: number }          // → default
  override?: { contextWindow?: number; maxOutputTokens?: number } | null   // → manual-override
}): ModelCapabilities

export function computeWorkingWindow(params: {
  contextWindow: number | null
  requestedMaxTokens: number        // conversation.maxTokens (clamped) ?? DEFAULT_OUTPUT_RESERVE
  modelMaxOutputTokens: number | null
}): WorkingWindow
// outputReserve = min(requestedMaxTokens, modelMaxOutputTokens ?? requestedMaxTokens)
// safetyMargin  = max(FLOOR, floor(contextWindow * NUM / DEN))   (integer math)
// workingWindow = contextWindow - outputReserve - safetyMargin
```

**Contract decisions (do not guess):**
- `computeWorkingWindow` **drops** the redundant `outputReserve` input from the RFC
  sketch (it is derived, and returned in the result).
- `resolveModelCapabilities` takes `override`/`heuristic`/`defaults` as plain
  `{contextWindow?, maxOutputTokens?}` and tags their source internally; only probe
  `claims` carry explicit `source`/`confidence`. Layering of conversation > model >
  app manual overrides happens in the **use case**, not the resolver.
- Per-field resolution; `confidence` global = `contextWindow` field's confidence.
- Same-source tie-break = highest `specificity` wins; equal specificity → earliest
  array index (stable order).

### Cache — `packages/backend/src/application/services/model-capabilities-cache.service.ts`

```ts
export function buildCapabilitiesCacheKey(
  provider: string, instanceId: string | null, normalizedModel: string,
): string   // `${provider}:${instanceId ?? ""}:${normalizedModel}`

export class ModelCapabilitiesCache {
  constructor(options: { ttlMs?: number; now?: () => number })  // ttlMs default 15*60_000
  get(key: string): { claim: CapabilityClaim; cachedAt: number } | null
  getStale(key: string): { claim: CapabilityClaim; cachedAt: number } | null
  set(key: string, claim: CapabilityClaim): void
  invalidate(key: string): void
  invalidateInstance(instanceId: string): void   // purges keys containing that instanceId
  invalidateProvider(provider: string): void
}
```
Clock injected via `now` (fake closure). No `vi.useFakeTimers`, no real timers.
Only probe claims (`runtime-introspection`/`provider-api`) are cached; the use case
decides what to `set`. `getStale` returns an expired entry (for the "serve stale
when re-probe fails" path) while `get` returns `null` once `ttlMs` has elapsed.

### Backend use case — `packages/backend/src/application/use-cases/provider/get-model-capabilities.use-case.ts`

```ts
export interface ModelCapabilitiesResult {
  id: ProviderId
  model: string
  capabilities: ModelCapabilities
  workingWindow: WorkingWindow
}

export class GetModelCapabilitiesUseCase {
  constructor(deps: {
    registry: ProviderRegistry
    providerInstanceRepository: ProviderInstanceRepository
    settings: SettingsRepository
    cache: ModelCapabilitiesCache
    curatedTable: CuratedModelEntry[]
    logger: Logger
  })
  async execute(params: {
    id: ProviderId
    model: string
    providerInstanceId?: string
    conversationOverride?: { contextWindow?: number | null; maxTokens?: number | null }
    refresh?: boolean                 // bypass cache and re-probe
  }): Promise<ModelCapabilitiesResult>
}
```
- Manual override layering (app `<` model `<` conversation) reads settings keys:
  `model_capabilities.override.default` and
  `model_capabilities.override.model.<provider>[:<instanceId>]:<normalizedModel>`,
  JSON value `{"contextWindow":number|null,"maxOutputTokens":number|null}`.
- `ProviderPort` gains optional `resolveCapabilities?(model: string): Promise<CapabilityClaim[]>`.
- The legacy route `GET /api/providers/:id/model-context` keeps its shape by mapping
  `{ id, model, contextWindow: result.capabilities.contextWindow }`. The old
  `GetProviderModelContextUseCase` class is **removed** (renamed); delete or repoint
  `get-provider-model-context.use-case.test.ts`. New endpoint
  `GET /api/providers/:id/capabilities?model=&instanceId=` returns `ModelCapabilitiesResult`.

### Frontend

- API fn `getModelCapabilities(id, model, instanceId?): Promise<ModelCapabilitiesResult>`
  in `packages/frontend/src/lib/api/providers.ts` (pure, no React).
- Component `packages/frontend/src/components/conversation/model-capabilities-suggestion.tsx`:
  ```ts
  export interface ModelCapabilitiesSuggestionProps {
    capabilities: ModelCapabilitiesResult | null
    loading: boolean
    typedContextWindow: number | null          // value currently in the input
    onApply: (contextWindow: number | null, maxOutputTokens: number | null) => void
  }
  ```
  Renders resolved window, `maxOutputTokens`, `source`, `confidence`, and the safe
  `workingWindow` with an "Apply detected" button. The hook that fetches
  `getModelCapabilities` lives in `use-model-capabilities.ts` (same folder); tests
  mock the API module and assert the store/`onChange` path, never `fetch`.

## 3. File locations + commands

| Area | File | Runner |
| --- | --- | --- |
| resolver (pure) | `packages/backend/src/application/use-cases/provider/model-capabilities.resolver.test.ts` | backend |
| budget math (pure) | `packages/backend/src/application/use-cases/provider/compute-working-window.test.ts` | backend |
| cache | `packages/backend/src/application/services/model-capabilities-cache.service.test.ts` | backend |
| orchestration | `packages/backend/src/application/use-cases/provider/get-model-capabilities.use-case.test.ts` | backend |
| Ollama probe | extend `.../secondary/providers/ollama.adapter.test.ts` (`resolveCapabilities` block) | backend |
| OpenAI/vLLM/OpenRouter probe | extend `.../secondary/providers/openai-compatible.adapter.test.ts` | backend |
| suggestion UI | `packages/frontend/src/components/conversation/model-capabilities-suggestion.test.tsx` | frontend |
| model-selector state | extend `packages/frontend/src/components/conversation/model-selector.test.tsx` | frontend |

**Commands:** `pnpm --filter @workspace/backend test` and
`pnpm --filter @workspace/frontend exec vitest run` (never `@workspace/shared test`;
shared resolver tests run from backend vitest importing `@workspace/shared`).
`pnpm check` for arch/typecheck/lint.

**Mocking:** adapters stub `globalThis.fetch = vi.fn(...)` (existing pattern; reuse
`mockShow` in ollama and the `openai` `vi.mock` in openai-compatible). Resolver/budget
tests are pure — no `fetch` stub, and no test may call real `fetch`. Use case tests
inject a fake `now` closure into the cache and mock `adapter.resolveCapabilities` with
`vi.fn`; assert call counts. Frontend mocks `@/lib/api/providers` via `vi.hoisted`
(existing pattern).

## 4. Fixture matrix (one row ≈ one behavior)

| # | AC | File | Scenario / input | Expected | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | resolve precedence | resolver | claims: `provider-api`{cw 128k, out 16k}, `runtime-introspection`{cw 32k, out null}, curated{gpt-4o-mini cw 128k out 16384}, heuristic{cw 32k}, defaults{cw 8192, out 4096}; target `gpt-4o-mini` | cw=32k src=runtime-introspection; maxOutputTokens=16k src=provider-api; both confidences correct | **per-field** precedence: output uses provider-api while cw uses runtime; proves independence |
| 2 | manual > all | resolver | override{cw 65536} + runtime{cw 32768, out 8192} | cw=65536 src=manual-override conf=high; maxOutputTokens=8192 src=runtime | manual (conversation/model/app) beats every source |
| 3 | tie-break | resolver | curated: [`qwen2.5`{cw 32k}, `qwen2.5:14b`{cw 8k}] target `qwen2.5:14b` | cw=8k (exact beats family) | specificity |
| 4 | tie-break stable | resolver | two curated entries both `exact` for target, cw 32k then 16k | cw=32k (first in array wins) | stable order |
| 5 | identity | resolver | `normalizeModelIdentity("ollama","Qwen2.5:14B")` → `qwen2.5:14b`; `("openai-compatible","gpt-4o-mini","i1")` → `gpt-4o-mini`; `("openai-compatible","openrouter/anthropic/claude-3.5-sonnet")` → `anthropic/claude-3.5-sonnet`; `("ollama","  LLaMA  3  70B ")` → `llama 3 70b` | exact normalized strings | aliases/prefix/case/spaces |
| 6 | probe fallback | resolver | claims=[] ; curated absent; heuristic null; defaults{cw 8192}; plus a `PROBE_FAILED` path exercised in use case (below) | cw=8192 src=default, no throw | non-blocking fallback |
| 7 | budget normal | working-window | cw 8192, req 2048, modelMax 4096 | reserve 2048, margin 409 (`floor(8192*5/100)`), ww 5735, `ok`, warnings [] | RFC formula exact |
| 8 | budget small | working-window | cw 4096, req 2048, modelMax null | reserve 2048, margin 204, ww 1844, `ok` | unknown model max → reserve=requested |
| 9 | clamp | working-window | cw 8192, req 8192, modelMax 2048 | reserve 2048, ww 5735, `ok`, warnings [`OUTPUT_RESERVE_CLAMPED`] | requested > model max → clamp + warning |
| 10 | null window | working-window | cw null, req 2048, modelMax 4096 | status `unknown`, ww null, reserve null, warnings [] | no window → unknown |
| 11 | infeasible | working-window | cw 256, req 2048, modelMax 4096 | ww 0 (not negative), status `infeasible`, warnings [`WORKING_WINDOW_NEGATIVE`,`OUTPUT_RESERVE_TOO_LARGE`] | never negative |
| 12 | degraded | working-window | cw 2304, req 2048, modelMax 4096 | ww 128, status `degraded` | 0 ≤ ww < 256 boundary |
| 13 | cache hit | cache | two `get` with injected `now` within TTL after one `set` | 2nd returns same claim, `set`/probe not re-run (use case: `resolveCapabilities` called once) | no re-probe |
| 14 | TTL expiry | cache | advance `now` past `ttlMs` | `get` returns null → miss | expiry via injected clock |
| 15 | stale | cache | claim expired, probe now rejects | stale claim served with `STALE_CACHE` warning, resolution completes | non-blocking on network loss |
| 16 | invalidate | cache | `set` then `invalidateInstance(instanceId)` / `invalidateProvider` | `get` returns null for purged key | instance/model change purge |
| 17 | no secrets | use case | spy on `cache.set` after execute with an instance carrying `apiKey`/url | stored value keys ⊆ `{claim, cachedAt}`; claim has no `url`/`apiKey`/`api_key` | privacy |
| 18 | manual override layering | use case | settings app cw 8192, model cw 16384, conversation cw 32768 (same provider/model) | conversation 32768 wins; conversation override beats runtime probe; app beats resolver when model/conversation absent | conv > model > app > resolver |
| 19 | S121 compat | use case | conversation already has `contextWindow`, `refresh` unset | returned `capabilities.contextWindow` = conversation override; route shape `{id,model,contextWindow}` preserved | legacy contract |
| 20 | Ollama probe | ollama | `/api/show` `num_ctx 8192` + `context_length 131072` | claim src runtime-introspection, cw 8192 (num_ctx wins), conf high | reuses S121, richer claim |
| 21 | vLLM probe | openai-compatible | `/v1/models` with per-model `max_model_len`/`context_length` | claim src runtime-introspection, cw = that value, out null | opportunistic introspection |
| 22 | OpenRouter probe | openai-compatible | baseUrl `...openrouter.ai...`; `/v1/models` items with `context_length` + `top_provider.max_completion_tokens` | claim src provider-api conf medium, cw + maxOutputTokens mapped | provider-api catalog |
| 23 | no claim | openai-compatible | `/v1/models` without `context_length`/`max_model_len` | `resolveCapabilities` returns `[]` | absent → fall to table |
| 24 | suggestion UI | frontend suggestion | fixture `ModelCapabilitiesResult` (source `curated-table`, conf medium, ww `ok`) | renders source label, confidence, working window; "Apply" calls `onApply(detectedCw, detectedOut)` | provenance + apply |
| 25 | typed survives | frontend model-selector | typed `contextWindow` set, then model changes with a mock `getModelCapabilities` | typed value NOT overwritten; a detected (auto) value IS replaced | RFC "changing model does not clobber a typed value" |

## 5. Ordering for red tests (first → last) + expected failure signature

1. **resolver + working-window tests** (import shared) → `Cannot find module '@workspace/shared/types/model-capabilities'` / `'@workspace/shared/lib/model-capabilities'` (module-not-found). Verify each fails for **missing module**, not assertion.
2. **cache test** → `Cannot find module './model-capabilities-cache.service'`.
3. **use case test** → module-not-found for `get-model-capabilities.use-case`; after module exists but before impl: `TS2339` (`resolveCapabilities` not on `ProviderPort`), `TS2554` (constructor args).
4. **adapter tests** → `TS2339` (`resolveCapabilities` missing on `OllamaAdapter`/`OpenAICompatibleAdapter`).
5. **frontend suggestion test** → `Cannot find module './model-capabilities-suggestion'`; model-selector extension → `TS2307` for `getModelCapabilities`.
Import failures are acceptable red for new modules; assert the intended reason by reading the error, then proceed.

## 6. Out-of-scope tests (deferred)

Real-tokenizer parity, on-disk/DB cache persistence, runtime catalog auto-refresh,
`workingWindow` adoption in compaction/send, models.dev source, llama.cpp `/props`
dedicated probe, provider-instance-dedicated override key.

## 7. Risk notes

- **Fake timers:** use the injected `now` closure; do not mix `vi.useFakeTimers` with
  the adapters' `setTimeout`/`AbortController` (flaky). Probe-timeout tests reject
  `fetch` instead of awaiting real timers.
- **Environment:** backend = `node`, frontend = `jsdom` (configs already set). Shared
  modules must stay side-effect-free (no `fetch`, no `Date.now()` at import).
- **500-line frontend rule:** `model-selector.tsx` is 436 lines; suggestion must be a
  separate component/hook or `pnpm check:arch` fails.
- **No new dependencies:** reject any test needing a fake-timer lib, a tokenizer, or a
  network recorder. Vendor a 3-entry curated fixture; do not snapshot the full catalog.
- **Legacy route guard:** repoint `get-provider-model-context.use-case.test.ts` to the
  new class or delete it; keep one assertion of the `{id,model,contextWindow}` shape so
  S121 consumers stay green.
