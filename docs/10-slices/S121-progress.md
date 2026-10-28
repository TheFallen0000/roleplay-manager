# S121 — Ventana de contexto e indicador de uso

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Primera parte de PM.51: la app conoce la ventana de contexto del modelo, estima
cuántos tokens ocupa el prompt y muestra ese consumo antes de que la
conversación se rompa. No hay compactación automática todavía; eso es S122.

La ventana vive en cada conversación. Se rellena al elegir modelo en Ollama, se
puede sobrescribir a mano y viaja en exportaciones, plantillas de ajustes y
ramas. Las conversaciones antiguas conservan `null` hasta que se detecta o se
configura.

## Decisiones

- **Ventana por conversación, no por proveedor.** Evita un registro de modelos
  y permite un override por chat. El coste es que una conversación nueva con el
  modelo por defecto no la detecta hasta que se abre Modelo o se pulsa
  Detectar; se acepta para no meter una llamada de red en la creación.
- **Detección solo en Ollama.** `/api/show` devuelve `parameters` (con
  `num_ctx`) y `model_info` (con `*.context_length`). `num_ctx` manda porque es
  el valor efectivo del modelo. OpenAI-compatible no expone la ventana en
  `/models`, así que usa presets manuales.
- **Estimador conservador y sin dependencias.** `chars / 3` con un 10 % de
  margen y 4 tokens de sobrecarga por mensaje. La aritmética es entera
  (`chars * 11 / 30`) para que el `ceil` no baile por coma flotante. Se
  calibrará con `prompt_eval_count` / `usage` cuando haga falta.
- **El indicador incluye el borrador.** `MessageInput` reporta el texto
  persistido a `useContextUsage`, que estima sus tokens y los suma al contexto
  ya enviado. El denominador incluye la reserva de respuesta (`maxTokens`),
  porque entrada y salida comparten la ventana.
- **El porcentaje no bloquea.** Se avisa en ámbar al 80 % y en rojo al 100 %,
  pero el envío sigue permitido. La validación dura y la compactación llegan
  con S122.
- **El override manual se respeta.** Si la conversación ya tiene ventana, al
  abrir Modelo no se vuelve a detectar. Cambiar de modelo limpia el valor
  anterior y lanza la detección; pulsar Detectar en un proveedor que no la
  expone no borra el preset manual.
- **Avisos de configuración.** La tarjeta Modelo avisa si la ventana es menor
  de 8k y si `maxTokens` no deja espacio dentro de la ventana. Los ajustes
  rápidos son 4k, 8k, 16k, 32k y 128k; el campo manual acepta cualquier entero.
- **`summaryFrequency` y `recentMessageCount` siguen en la UI.** Se retiran en
  S122 junto con la compactación por porcentaje. Sus columnas de BD y export se
  mantienen.
- **Fuera de alcance:** compactación automática, resumen antes del envío,
  `ChatEngine` interno, calibración real de tokens y bloqueo de envíos.

## Cambios

### Shared

- `lib/token-estimate.ts`: estimadores de texto, mensajes y contexto completo.
- `PromptContextMetadataDTO` gana `systemTokens`, `messageTokens`,
  `inputTokens`, `outputReserve`, `totalTokens`, `contextWindow` y
  `contextPercent`.
- `ConversationDetail`, `ConversationSettingsUpdate` y `ExportSettings` ganan
  `contextWindow`.
- `ModelContextResult` para la detección por proveedor.

### Backend

- `Conversation` guarda `contextWindow`; Drizzle la persiste y
  `updateSettings` la actualiza. Migración `0016_context_window.sql`.
- `GetProviderModelContextUseCase` + `GET /api/providers/:id/model-context` y
  `OllamaAdapter.getModelContextWindow` (mejor esfuerzo: devuelve `null` si el
  proveedor no responde o no publica la ventana).
- `GET /api/conversations/:id/context/stats` reutiliza `GetPromptContext`
  sin borrador.
- Exportación, importación, plantilla de ajustes y ramas copian la ventana.

### Frontend

- `useContextUsage`: estadísticas, borrador y tokens en vivo.
- `ContextUsageBadge` en la cabecera del chat, con tooltip de desglose y aviso
  al 80 %.
- `ContextTokenBreakdown` en la vista previa del contexto (sistema, mensajes,
  reserva, total y porcentaje).
- `ModelSelector`: campo de ventana, detección, presets, aviso de ventana
  pequeña y respeto del override guardado.
- `InferenceParamsCard`: aviso cuando `maxTokens` no cabe en la ventana.
- El diálogo de plantillas de ajustes muestra la ventana incluida.

## Criterios de aceptación

- [x] `contextWindow` se guarda, actualiza, exporta, importa, copia en ramas y
      se migra.
- [x] Ollama detecta la ventana con `num_ctx` o `*.context_length`.
- [x] El endpoint de detección devuelve `null` sin romper si el proveedor no
      puede contestar.
- [x] El indicador de la cabecera incluye el borrador y la reserva de respuesta.
- [x] La vista previa muestra el desglose de tokens.
- [x] Modelo permite detectar, elegir preset o escribir la ventana a mano.
- [x] Avisos de ventana pequeña y de `maxTokens` que no cabe.
- [x] `summaryFrequency` y `recentMessageCount` siguen en la UI.
- [x] Tests de estimador, adaptador de Ollama, caso de uso, ruta, repositorio,
      badge y helper de resúmenes.
- [x] `pnpm check`, build y suites en verde.
- [x] `[Unreleased]` y backlog actualizados.

## Verificación

- Frontend: **369** tests (63 archivos).
- Backend: **689** tests (117 archivos).
- `pnpm check` y `pnpm build` en verde.
- Smoke test con un Ollama falso en `127.0.0.1:39114`: el endpoint devuelve
  `{"contextWindow":16384}` con `num_ctx 16384`; sin modelo responde 400 y con
  un proveedor desconocido 404.
- La aplicación real con un modelo Ollama y un proveedor OpenAI-compatible
  queda pendiente de la prueba manual del release.

## Commits

1. `feat(shared): estimate prompt tokens and expose context metadata`
2. `feat(backend): persist and detect conversation context windows`
3. `feat(frontend): show live context usage and window settings`
4. `test(context): cover estimator, detection and persistence`
5. `docs(slice): document S121 context window`
