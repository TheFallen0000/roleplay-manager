# S130 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-06

## Hallazgos

### Resueltos (segunda pasada confirmada)

- **M1 — contrato `unknown → null` de la ruta legacy.** `GetModelCapabilitiesUseCase`
  acepta `probeOnly`; con `true` resuelve solo el claim del sondeo (sin tabla,
  heurística, defaults ni overrides) y no sirve `stale` si el sondeo falla. La
  ruta `/model-context` pasa `probeOnly: true`, así que vuelve a devolver `null`
  para modelos no detectables. Cubierto por tests de caso de uso y de ruta.
- **m1 — override de conversación por HTTP.** `/capabilities` acepta
  `contextWindow`/`maxTokens`, los reenvía como `conversationOverride`, y el
  frontend los manda desde la conversación guardada. La sugerencia refleja
  `manual-override` y la ventana de trabajo usa el presupuesto real.
- **m2 — invalidación del caché por instancia.** `UpdateProviderInstanceUseCase`
  y `DeleteProviderInstanceUseCase` invalidan la instancia; cableado en el
  contenedor y cubierto con tests de éxito, no encontrado y fallo del repo.
- **m3 — sondeo vacío limpia el claim.** Un sondeo correcto sin claims invalida
  la entrada previa; cubierto por test.
- **m4/m5 — Detect sin doble sondeo y sin toast engañoso.** Ollama usa solo el
  sondeo legacy (que refresca el caché compartido) y luego relee la sugerencia;
  OpenAI-compatible usa solo `refreshCapabilities()` y no muestra el toast de
  "vacío".
- **n1 — script de refresco portable.** `catalog:refresh` deriva la ruta de
  salida de `import.meta.url`.
- **n3 — aviso de reemplazo condicionado.** Solo aparece cuando la ventana
  resuelta no es nula y el botón Apply está habilitado.
- **n2 — parámetro descartado documentado.** `handleApplyDetected` deja explícito
  que la conversación no guarda el límite de salida del modelo en este slice.

### Notas restantes (no bloquean)

- **NIT-1 (resuelto después):** al pulsar Detect en Ollama se relee la sugerencia
  tras el sondeo; sin llamadas paralelas.
- **NIT-2 (resuelto después):** `probeOnly` ya no hace la lectura de settings que
  descartaba.
- **NIT-3 (resuelto después):** «Aplicar detectado» ahora sobrescribe una
  ventana manual con la ventana de trabajo segura; «Detectar» también actualiza
  con un valor manual.
- **NIT-4:** `conversationOverride` se construye siempre en el hook, pero la capa
  de API filtra los nulos. Sin impacto funcional.

### Corrección post-review (prueba manual del usuario)

La prueba manual detectó tres fallos de UX que se corrigieron antes de commitear:

1. Con una ventana manual, «Aplicar detectado» no la sobrescribía.
2. «Detectar» no hacía nada cuando había un valor manual.
3. «Aplicar detectado» escribía la ventana bruta / `maxOutputTokens`, no
   `workingWindow.workingWindow`.

Corregido en `model-selector.tsx`, `context-window-card.tsx`,
`model-capabilities-suggestion.tsx` y `use-model-capabilities.ts`, con tests de
regresión en `model-selector.test.tsx`. El frontend pasa a **405 tests** y el
re-test manual queda pendiente.

## Verificación revisada

- Precedencia por campo, empates y confianza: correctos.
- Aritmética de `workingWindow`, clamp y estados: correctos, sin negativos.
- Caché: TTL con reloj inyectado, `get`/`getStale`, invalidaciones y ausencia de
  secretos.
- Sondeos Ollama/vLLM/OpenRouter: mapeo correcto y sin fugas de API key/URL.
- Frontera hexagonal, pureza de `shared/`, sin dependencias nuevas.
- Sin cambios de prompt/contexto; contrato legacy y tests existentes intactos.

## Comandos

- `pnpm --filter @workspace/backend test` → 128 archivos / 778 tests.
- `pnpm --filter @workspace/frontend exec vitest run` → 70 archivos / 405 tests.
- `pnpm check` → arch 7/7, typecheck 5/5, lint 5/5.
- `pnpm build` → 4/4 tareas.
- `pnpm audit --prod` → sin vulnerabilidades.
- `git diff --check` → limpio.
