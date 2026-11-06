## S130 — Resolución de capacidades de modelo y ventana de trabajo segura

Sustituye la detección puntual de S121 (solo Ollama, solo ventana) por un
resolvedor de capacidades con precedencia determinista, procedencia y confianza
por campo, caché local y override manual. A partir de la ventana de contexto y
del límite de salida del modelo calcula una **ventana de trabajo segura** y la
muestra en el diálogo Modelo.

### Alcance

- **Shared**: tipos `ModelIdentity`, `CapabilityClaim`, `ModelCapabilities`,
  `WorkingWindow` y `CuratedModelEntry`; resolvedor puro
  (`resolveModelCapabilities`, `normalizeModelIdentity`, `matchCuratedEntry`,
  `inferModelCapabilitiesHeuristic`) y aritmética entera de `workingWindow` con
  estados `ok/degraded/infeasible/unknown`.
- **Backend**: catálogo curado vendorizado desde LiteLLM y script
  `catalog:refresh`; `ModelCapabilitiesCache` en memoria (TTL 15 min, reloj
  inyectable, `getStale`); `GetModelCapabilitiesUseCase` con capas de override
  app < provider < instancia < conversación; sondeos de Ollama `/api/show`,
  OpenAI-compatible `/v1/models` (vLLM) y OpenRouter (`provider-api`);
  invalidación al editar/borrar una instancia.
- **API**: nuevo `GET /api/providers/:id/capabilities` con
  `model`, `instanceId`, `refresh`, `contextWindow` y `maxTokens`.
  `GET /api/providers/:id/model-context` conserva su contrato.
- **Frontend**: `use-model-capabilities`, `model-capabilities-suggestion` y
  `context-window-card`; la sugerencia muestra ventana resuelta, límite de
  salida, procedencia, confianza y ventana de trabajo, con «Aplicar detectado».
  Un valor escrito a mano ya no se borra al cambiar de modelo.

### Decisiones clave

- **Ruta legacy `probeOnly`.** `/model-context` solo resuelve el sondeo en vivo:
  sin tabla curada, heurística, defaults, overrides ni `stale`, así que sigue
  devolviendo `null` cuando el proveedor no puede medir la ventana.
- **El override de conversación viaja por `/capabilities`.** El caso de uso lo
  aplica después de las capas de `settings`; `maxTokens` es presupuesto de
  salida, no el máximo del modelo.
- **Caché solo de claims de sondeo.** Overrides, tabla, heurística y defaults
  se recalculan siempre; el caché nunca guarda URLs ni API keys.
- **Catálogo generado, no editado.** LiteLLM (MIT fuera de `enterprise/`) se
  filtra a chat/completion/responses y se expanden alias por prefijo de
  proveedor y región.
- **Heurística conservadora y defaults 4 096/2 048** como últimos recursos, con
  confianza `low`.
- **Manual frente a auto en la UI.** Teclear, elegir preset o aplicar lo
  detectado marca el valor como manual; cambiar de modelo solo reemplaza el
  valor automático. «Detectar» refresca el caché una sola vez y relee la
  sugerencia.
- **UI extraída** a componentes y hook propios para respetar el límite de 500
  líneas de `model-selector.tsx`.
- **Aplicar/Detectar corregidos:** «Aplicar detectado» sobrescribe una ventana
  manual con `workingWindow.workingWindow`; «Detectar» actualiza aunque haya un
  valor manual. Tests de regresión incluidos.

### Verificación

- `pnpm --filter @workspace/backend test` → **128 archivos / 778 tests** en
  verde.
- `pnpm --filter @workspace/frontend exec vitest run` → **70 archivos / 405
  tests** en verde.
- `pnpm check` → arch **7/7**, typecheck **5/5**, lint **5/5**.
- `pnpm build` → **4/4** tareas.
- `pnpm audit --prod` → sin vulnerabilidades conocidas.
- `git diff --check` → limpio.
- Prueba manual en la app: ejecutada; se corrigieron «Aplicar detectado» sobre
  ventana manual, «Detectar» con valor manual y el valor aplicado (ahora la
  ventana de trabajo segura). Re-test pendiente antes de publicar.
- Sin migraciones, sin cambios de export/import, sin dependencias nuevas ni
  cambios de lockfile.

### Review

- Independiente: **PASS WITH NOTES**
  (`docs/10-slices/S130-review.md`).
- Bloqueantes resueltos: contrato `unknown → null` de la ruta legacy, override
  de conversación por HTTP, invalidación del caché por instancia, sondeo vacío
  que limpia el claim previo, «Detectar» sin doble sondeo y script de refresco
  portable.
- Notas no bloqueantes: NIT-3 (con ventana guardada, «Aplicar detectado»
  reaplica el mismo valor; usar «Detectar» para reemplazarla) y NIT-4
  (el hook construye `conversationOverride` siempre; la capa de API filtra los
  nulos).

### Diferido

- Tokenizer real por proveedor (se mantiene la heurística `chars/3`).
- Adoptar `workingWindow` como denominador en compactación y envío.
- models.dev como fuente curada alternativa.
- Sondeo dedicado de llama.cpp `/props`.
- Persistencia on-disk/BD del caché y auto-refresco remoto del catálogo.
- UI/API dedicada para el override por instancia.
- NIT-3: flujo explícito para reemplazar una ventana guardada obsoleta.

### Release

Sin bump de versión ni release: las entradas van bajo `[Unreleased]` en
`CHANGELOG.md` y viajarán en el próximo `chore(release): vX.Y.Z` batched. No
toca empaquetado, módulos nativos ni el lockfile.
