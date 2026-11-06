# Curated model catalog

`curated-model-catalog.ts` is generated from LiteLLM's
[`model_prices_and_context_window.json`](https://github.com/BerriAI/litellm).

- **License:** LiteLLM is MIT outside the `enterprise/` directory. Keep the
  upstream notice when refreshing the snapshot.
- **Refresh:** `pnpm --filter @workspace/backend catalog:refresh`.
- **Selection:** only chat, completion and responses entries with a context
  window or an output limit are included. The generator also adds
  provider-prefix aliases (for example `azure/gpt-4o-mini` → `gpt-4o-mini`) so
  plain model ids from OpenAI-compatible servers match.
- **Do not edit the generated file by hand.** The resolver normalizes both
  sides and applies its own precedence, so this table only needs ids and the two
  numeric fields.
