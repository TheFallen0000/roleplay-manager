# S122 — Compactación automática del contexto

**Estado:** Completado (pendiente de release batched)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Segunda parte de PM.52: antes de enviar, la app estima el prompt completo y, si
llega al umbral configurado, resume los mensajes más antiguos para que la
conversación siga sin enviar un contexto que no cabe. El historial visible no
se borra: la compactación solo cambia lo que se envía al modelo.

También desaparecen de la UI `summaryFrequency` y `recentMessageCount`. Las
columnas siguen en la base de datos y en las exportaciones para no romper
conversaciones ni plantillas antiguas.

## Decisiones

- **Umbral por conversación.** `compactionThreshold` se guarda por chat (50-95 %,
  por defecto 80 %) junto a `contextWindow`, y viaja en exportaciones,
  plantillas y ramas.
- **Bajar al 60 %.** Al dispararse el umbral se resume hasta volver al 60 %
  (20 puntos menos). Así no se compacta en cada mensaje y quedan varios turnos
  de margen. El objetivo mínimo es 30 % si el umbral se configura muy bajo.
- **Compactar antes de enviar.** El mensaje del usuario se guarda primero; la
  compactación corre antes de construir el prompt definitivo y de llamar al
  proveedor. La UI muestra “Compactando contexto…” mientras dura.
- **Resumen acumulativo.** El nuevo resumen integra el anterior y los mensajes
  antiguos hasta el límite elegido. Su rango empieza en el primer mensaje del
  resumen previo (o en el primero de la conversación) y termina en el último
  mensaje resumido. Los mensajes posteriores se envían verbatim.
- **Se conserva el sufijo más reciente que cabe.** Se reserva espacio para el
  resumen y la respuesta, y se mantienen los mensajes más nuevos que entren.
  Siempre se conserva al menos un turno de usuario; si el sufijo empieza por un
  asistente, ese mensaje pasa al resumen para que el contexto empiece con el
  usuario.
- **Presupuesto del resumen.** El resumen usa como máximo
  `min(1024, max(256, 10 % de la ventana))` tokens de salida. La transcripción se
  trocea en varias llamadas secuenciales cuando no cabe; cada llamada recibe el
  resumen acumulado anterior. Si la ventana es desconocida se usa 8k solo para
  calcular los trozos, nunca para decidir la compactación.
- **Fallback a recorte.** Si el resumen falla, se recortan los mensajes más
  antiguos hasta que el contexto quepa y se avisa en el chat. Si ni siquiera el
  prompt de sistema y el último mensaje caben, se aborta con
  `CONTEXT_TOO_LARGE` y un mensaje claro.
- **Ventana desconocida.** Sin `contextWindow` no se compacta: no hay porcentaje
  fiable. La cabecera ya muestra el uso estimado y el compositor muestra un
  aviso descartable para configurar la ventana en Modelo.
- **Historial visible y resumen manual.** Los mensajes resumidos siguen en el
  chat. El botón “Generar resumen ahora” se mantiene; los resúmenes manuales
  dejan los dos mensajes más recientes sin resumir para que el siguiente envío
  tenga contexto literal.
- **Se retiran los controles de conteo.** `summaryFrequency` y
  `recentMessageCount` desaparecen de la UI. El motor usa el presupuesto de
  tokens, no un número fijo de mensajes. Las columnas y su serialización se
  mantienen por compatibilidad.
- **`maxTokens` dentro de la ventana.** Al guardar Modelo se bloquea una
  reserva de respuesta mayor o igual que la ventana; el backend también valida
  cuando cambia cualquiera de los dos campos.
- **Fuera de alcance:** `ChatEngine` interno (S123), borrado físico de mensajes,
  varios resúmenes simultáneos en el prompt y calibración real de tokens.

## Cambios

### Shared

- `compactionThreshold` en `ConversationDetail`, `ConversationSettingsUpdate` y
  `ExportSettings`; `compactionThreshold` en `PromptContextMetadataDTO`.
- `lib/compaction.ts` con el umbral por defecto, el rango permitido y el
  objetivo (umbral − 20, mínimo 30).
- Nuevas traducciones de compactación, avisos y errores.

### Backend

- Migración `0017_compaction_threshold.sql` y persistencia en Drizzle.
- `ContextCompactionService`: estima el contexto, elige el sufijo, resume el
  prefijo, recorta si hace falta y devuelve avisos o error.
- `GenerateSummaryUseCase`: resumen acumulativo con rango correcto, límite
  `upToMessageId`, presupuesto de salida y chunking secuencial.
- `send`, `continue` y `regenerate` compactan antes de llamar al proveedor y
  emiten `compacting`, `context-warning` y `summary-generated` por SSE.
- Se elimina el disparo de resumen por `summaryFrequency` después de la
  respuesta.
- Validación `maxTokens < contextWindow` cuando cambia alguno de los dos.
- `GET /api/conversations/:id/context` excluye los mensajes ya resumidos y
  devuelve el umbral de compactación.

### Frontend

- `CompactionStatus`: “Compactando contexto…”, aviso de recorte y aviso de
  ventana desconocida, ambos descartables.
- `CompactionSettingsCard` en Historia: umbral 50-95 % y aviso si falta la
  ventana.
- `summaryFrequency` y `recentMessageCount` fuera de la UI; el visor de
  resúmenes mantiene la generación manual.
- El indicador y la vista previa usan el umbral de la conversación y avisan de
  que se compactará al enviar.
- El diálogo de plantillas muestra el umbral incluido.

## Criterios de aceptación

- [x] La compactación se dispara antes del envío al llegar al umbral.
- [x] Se resume el prefijo más antiguo y se conservan los mensajes recientes.
- [x] El resumen es acumulativo y su rango empieza en el resumen anterior.
- [x] La transcripción larga se trocea en varias llamadas.
- [x] Si el resumen falla, se recorta y se avisa; si no cabe, se devuelve un
      error claro.
- [x] Sin ventana de contexto no se compacta y se muestra un aviso.
- [x] `summaryFrequency` y `recentMessageCount` ya no aparecen en la UI.
- [x] El umbral se guarda, exporta, importa y copia en ramas.
- [x] `maxTokens` no puede quedar por encima de la ventana al guardar.
- [x] Los mensajes resumidos siguen visibles y el resumen manual funciona.
- [x] Tests de servicio, resumen, SSE, repositorio y componentes.
- [x] `pnpm check`, build y suites en verde.
- [x] `[Unreleased]` y backlog actualizados.

## Verificación

- Backend: **696** tests (117 archivos).
- Frontend: **377** tests (65 archivos).
- `pnpm check` y `pnpm build` en verde.
- La prueba manual con un modelo real y una conversación larga queda para el
  release; el chunking y el fallback están cubiertos con proveedores simulados.

## Commits

1. `feat(shared): add compaction thresholds and context metadata`
2. `feat(backend): compact context before sending replies`
3. `feat(frontend): add compaction status and threshold settings`
4. `test(context): cover compaction, chunking and SSE events`
5. `docs(slice): document S122 context compaction`
