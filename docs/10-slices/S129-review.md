# S129 — Review

**Estado:** PASS WITH NOTES
**Revisor:** `slice-reviewer` (V4 Pro, contexto independiente)
**Fecha:** 2026-11-05

## Alcance revisado

- RFC, diff completo contra `master`, loader/compilador, builder por secciones,
  `ChatEngine`, use cases, container, componente de manifiesto, i18n y eval.
- Suites: backend **731** tests (123 archivos), eval **33** tests, frontend
  **393** tests (69 archivos).
- `pnpm check`, `pnpm build`, `pnpm audit --prod` y `pnpm check:arch` en verde.
- `streamReply`, tool loop, extracción de propuestas y resolución de proveedor
  sin cambios de comportamiento.

## Hallazgos

### Resuelto — versión de personaje fijada a la conversación

`ConversationContextLoader` resuelve `characterVersion` desde
`conversation.versionId`, no desde `currentVersion`. El envío antiguo usaba
`characterResult.currentVersion`, así que una conversación podía cambiar de
prompt al editar el personaje. La vista previa ya usaba la versión fijada.

**Decisión:** se mantiene la versión fijada. Es coherente con la regla de que
editar un personaje crea una versión nueva sin reescribir conversaciones. Se
añadió un test de regresión con `versionId !== currentVersion.id`.

**Impacto:** cambio deliberado de comportamiento para conversaciones cuyo
personaje se editó después de crearlas. Se documenta en el CHANGELOG.

### Nota — falta el snapshot pre-refactor

El plan de eval pedía capturar el prompt actual antes del refactor. No se
materializó como snapshot; la paridad se verificó comparando la salida plana
antigua con la nueva composición por secciones: byte a byte, incluyendo
separadores. El revisor lo confirma por inspección, pero no queda un artefacto
generado por la versión anterior.

**Deferred:** capturar un golden snapshot del builder anterior en una slice de
limpieza o al añadir el tokenizer real (S130/S133).

### Menor — eval de tokens reutiliza el estimador de producción

`context-assembly.eval.test.ts` y `context-compiler.service.test.ts` comparan el
manifiesto con `estimateTextTokens`/`estimateMessagesTokens`, las mismas
funciones que usa producción. Los valores son informativos y el tokenizer real
está diferido; el eval sí aporta aserciones no tautológicas de secciones,
conteos, frontera de resumen, pendientes y exclusión.

### Menor — construcción duplicada del loader/compilador

Los fallbacks de `send-message`, `continue-conversation` y `regenerate-reply`
crean su propio `ConversationContextLoader`/`ContextCompiler` cuando no reciben
un `ChatEngine`; el container ya los inyecta. Son stateless y no hay riesgo de
corrección; se mantiene por compatibilidad con los tests y el patrón existente.

### Nit — orden de secciones

El test de orden ya cubre `character`, `cards`, `player`, `memories`, `summary`,
`proposals`, `style`, `format` y `ooc`. No quedan secciones sin comprobar.

## Recomendación

**PASS WITH NOTES.** No hay bloqueantes. Antes del release queda registrar el
cambio de versión fijada en el CHANGELOG y dejar el golden snapshot como deuda
explícita.
