# S137 — Review

**Estado:** PASS WITH NOTES
**Revisor:** slice-reviewer
**Fecha:** 2026-11-21
**Veredicto:** sin bloqueantes ni mayores. Seis hallazgos menores; los de
privacidad/consistencia y los funcionales quedan corregidos, y los de escala o
race inherente se aceptan documentados.

## Verificación

La review fue estática (sin shell). El orquestador ejecutó los gates sobre el
commit final:

- `pnpm check`: 5/5 (`check:arch` + typecheck + lint).
- Backend: 181 archivos / 1213 tests.
- Frontend: 96 archivos / 513 tests.
- `pnpm --filter @workspace/backend eval`: 3 archivos / 92 tests.
- `pnpm build`: 4/4.
- `pnpm audit --prod`: limpio.
- `git diff --check`: limpio.

## Hallazgos y resolución

### 1. La dimensión solo la escribía el reindex (resuelto)

- **Ubicación:** `containers/app-container.ts`, `memory-embedding.service.ts`.
- **Problema:** el embed eager persistía el vector pero no
  `embeddings_dimension`; hasta pulsar «Reindexar», la config seguía con
  `dimension: null` y el híbrido descartaba la señal semántica.
- **Resolución:** `dba2f5f` escribe `EMBEDDING_SETTINGS_KEYS.dimension` tras el
  primer `embedMemory` correcto, manteniendo el fire-and-forget y el fallback.
- **Validación:** backend tests/typecheck/eval verdes; el camino de reindex
  sigue cubriendo la primera escritura.

### 2. El reindex no validaba la longitud del vector (resuelto)

- **Ubicación:** `reindex-memory-embeddings.use-case.ts`.
- **Problema:** podía persistir `dimension` declarada distinta de la longitud
  real del BLOB si el proveedor cambiaba de dimensión a mitad de ejecución.
- **Resolución:** `dba2f5f` compara `vector.length` con la dimensión activa;
  cuenta `failed` y no persiste la fila incoherente.
- **Validación:** test de regresión en `reindex-memory-embeddings.use-case.test.ts`.

### 3. Provider/instancia y `hasApiKey` (resuelto)

- **Ubicación:** `configure-embedding.use-case.ts`, `memory-embedding.service.ts`,
  `get-embedding-config.use-case.ts`.
- **Problema:** un PUT construido a mano podía emparejar `provider: "ollama"`
  con una instancia OpenAI-compatible y enviar texto de memoria a red con
  etiqueta local; además, `hasApiKey` no miraba la clave global heredada
  `provider_openai_compatible_api_key`.
- **Resolución:** `dba2f5f` valida `instance.kind === provider`
  (`INVALID_EMBEDDING_INSTANCE`, 400), añade la misma defensa en el servicio y
  consulta la clave global cuando no hay instancia. El DTO nunca expone la
  clave.
- **Validación:** tests de `configure-embedding`, `get-embedding-config` y
  `memory-embedding.service`.

### 4. `aggregateStatus` hace 2N consultas (aceptado)

- **Ubicación:** `get-embedding-config.use-case.ts` +
  `drizzle-memory-embedding.repository.ts`.
- **Impacto:** pantalla de ajustes, no path de envío. El path de envío sigue con
  1 embed + 1 `findByMemoryIds` + 1 `countStatus`.
- **Decisión:** aceptado para el volumen actual; una consulta agregada queda como
  mejora futura si el número de conversaciones crece.

### 5. Formato en `get-prompt-context.use-case.ts` (resuelto)

- **Problema:** dos propiedades en una línea.
- **Resolución:** `dba2f5f` las separa; `pnpm check` sigue verde.

### 6. Race fire-and-forget al crear/editar (aceptado)

- **Ubicación:** `app-container.ts` (`embedMemoryBestEffort`).
- **Problema:** un create seguido de un edit inmediato puede persistir el vector
  de la versión anterior.
- **Impacto:** se auto-cura en retrieval (`textHash`) y en el reindex.
- **Decisión:** inherente al diseño best-effort; se documenta y no se serializa
  en S137.

## Verificado sin hallazgos

- `ProviderPort.embed?` opcional, Ollama/OpenAI-compatible con L2 y errores de
  dominio; adaptadores existentes intactos.
- Migración 0022 con PK/FK cascade, BLOB LE, `text_hash`; repositorio sin
  comparación de hash; cascade y round-trip.
- Servicio de embeddings con config/instancia, hash `title+description`,
  invalidación por provider/model/dimension y fallo → `null`.
- Híbrido asíncrono + selector S136 síncrono; motivos `semantic`/`hybrid`;
  umbral 0.55 y peso 2.0; fallback bit-igual a S136; orden/presupuesto.
- Manifiesto `memories.embedding` solo con config; loader sin regresión.
- GET/PUT/reindex sin secretos; reindex global por lotes de 16; dimensión
  limpiada al cambiar provider/model/instancia.
- UI Embeddings en proveedores, aviso remoto, estado, reindexado, i18n y
  accesibilidad; 371 líneas.
- Privacidad: desactivado por defecto, remoto opt-in, sin texto/vectores en logs.
- Eval no tautológica con fake determinista, baseline S136 y umbrales.

## Conclusión

El contrato S137 se cumple, no hay regresión de S136 y la privacidad del camino
remoto queda protegida por validación de servidor. Los hallazgos 1–3 y 5 están
corregidos con tests; 4 y 6 quedan aceptados y documentados.
