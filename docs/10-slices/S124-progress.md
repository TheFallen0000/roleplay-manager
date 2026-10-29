# S124 — Auditoría pre-release de S121–S123

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Barrido de los cambios acumulados desde v1.56.2 (ventana de contexto,
compactación automática y ChatEngine) antes de preparar el release. No añade
funcionalidad nueva: corrige riesgos de rendimiento, accesibilidad y límites de
configuración, y actualiza documentación obsoleta.

## Hallazgos y cambios

- **Accesibilidad del aviso de compactación.** El `Spinner` compartido ya tiene
  `role="status"`; dentro de otro `role="status"` duplicaba el anuncio. Se
  sustituye por un icono `Loader2` con `aria-hidden`.
- **Carrera en el indicador de contexto.** Varias peticiones de
  `/context/stats` podían resolverse fuera de orden y dejar metadatos viejos.
  `useContextUsage` usa un identificador de petición y descarta las respuestas
  que ya no son la última.
- **Vista previa con historiales largos.** El diálogo renderizaba todos los
  mensajes del contexto; ahora muestra los últimos 100 y avisa del total. El
  desglose de tokens sigue incluyendo todos.
- **Límites de configuración centralizados.**
  - `packages/shared/lib/inference.ts` define `MAX_OUTPUT_TOKENS` (200 000),
    `MAX_CONTEXT_WINDOW` (2 000 000) y sus clamps.
  - Se aplican en la ruta de ajustes, `UpdateConversationSettings`, importación,
    plantillas, entidad `Conversation` y en los inputs de la UI.
  - `contextWindow` también se normaliza al reconstruir conversaciones
    antiguas; `maxTokens` se recorta en todas las rutas que lo escriben.
- **Entrada de modelos acotada.** El parámetro `model` de
  `/api/providers/:id/model-context` y el campo `model` de ajustes tienen un
  máximo de 200 caracteres.
- **Limpieza del generador de resúmenes.** `selectMessages` es síncrono; no
  había ningún `await` real.
- **Documentación obsoleta.**
  - `07-technical-architecture.md` ya no menciona
    `GenerateCharacterResponse` ni un `?dryRun=true` inexistente; el diagrama y
    la nota de previsualización apuntan a `ChatEngine`/`GetPromptContext`.
  - `13-api-contract.md` documenta los límites de `maxTokens` y
    `contextWindow`.
- **Seguridad revisada.**
  - `pnpm audit --prod` limpio.
  - Las rutas de chat y ajustes mantienen la comprobación de `Origin` para
    peticiones que cambian estado.
  - `/model-context` solo devuelve la ventana detectada; no expone URLs, claves
    ni configuración del proveedor.
  - La compactación acota el presupuesto del resumen y la entrada por chunks;
    no ejecuta herramientas del modelo, solo convierte tool calls de memoria en
    propuestas normalizadas.
  - `pnpm audit` completo reporta avisos de herramientas de desarrollo
    (`shadcn`, `@shadcn/registry`, `systeminformation`); no forman parte del
    runtime ni del paquete publicado.

## Decisiones

- **La auditoría no cambia el contrato.** Se mantienen los eventos y payloads
  de S123; solo se añaden límites de configuración.
- **`maxTokens` 200 000.** Es un techo muy por encima de los modelos locales
  habituales, suficiente para evitar valores absurdos por API sin molestar a
  usuarios normales. `contextWindow` mantiene el techo de 2 000 000.
- **Vista previa limitada, tokens completos.** El objetivo del diálogo es
  inspeccionar el prompt, no renderizar miles de burbujas; el recuento sigue
  siendo fiel al contexto completo.
- **Sin cambios en el motor ni en la compactación.** La doble construcción de
  contexto de `needsCompaction` + `compact` se deja como optimización futura:
  el coste es local y el flujo es más claro de auditar ahora.
- **Sin release en esta slice.** El release se prepara después, en un PR
  `chore(release): v1.57.0`.

## Criterios de aceptación

- [x] El indicador de contexto no acepta respuestas de peticiones antiguas.
- [x] La vista previa limita los mensajes renderizados y avisa del total.
- [x] `maxTokens` y `contextWindow` tienen límites compartidos y se aplican en
      API, casos de uso, importación, plantillas, entidad y UI.
- [x] El parámetro `model` está acotado.
- [x] La documentación técnica ya no describe rutas o clases inexistentes.
- [x] `pnpm audit --prod` limpio.
- [x] `pnpm check`, build y suites en verde.
- [x] Sin cambios en el contrato SSE.

## Verificación

- Backend: **700** tests (118 archivos).
- Frontend: **379** tests (66 archivos).
- `pnpm check`, `pnpm build` y `pnpm check:arch` en verde.
- `pnpm audit --prod`: sin vulnerabilidades.
- `pnpm audit` completo: avisos de tooling de desarrollo, no del runtime.

## Commits

1. `fix(frontend): guard context stats and preview size`
2. `fix(settings): bound context and output tokens`
3. `docs(audit): record the pre-release sweep`
