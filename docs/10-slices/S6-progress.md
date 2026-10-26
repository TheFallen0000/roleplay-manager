# S6 — Memoria dinámica con modos Auto/Manual

**Estado:** completado.

## Objetivo
Implementar memoria dinámica persistente por conversación con dos modos de gestión de propuestas: `auto` (el sistema acepta automáticamente las propuestas del LLM) y `manual` (el usuario revisa y decide cada propuesta). El usuario siempre puede crear/editar/eliminar memorias manualmente, independientemente del modo.

## Decisiones clave
- **memoryProposalMode**: per-conversation, columna en `conversations`, default `auto`.
- **Modo auto**: propuestas generadas por LLM → auto-aceptadas (`processedBy: 'system'`) tras cada mensaje.
- **Modo manual**: propuestas quedan `pending` para que el usuario las revise y decida.
- **Formatos de propuestas**: bloque delimitado en la respuesta del LLM (` `` ```memory_proposals [...] ``` `` `) y formato tool call (`propose_memory_changes` con JSON schema).
- **UI**: 3 secciones en Accordion (multiple) en pestaña "historia" del SettingsPanel.
- **ChoiceCard**: se usa `RadioGroup` (no `Switch`) para el selector auto/manual por ser mutuamente excluyente.
- **Parser tolerante**: si el JSON está malformado, se descartan propuestas inválidas individualmente; no se aborta el flujo.
- **Tool calling**: se añadió soporte de tool calls con `propose_memory_changes` (`operation`, `targetMemoryId`, `actor`, `title`, `description`, `priority`) para adaptadores OpenAI-compatible y Ollama, con acumulación de tool call deltas y fallback a bloque regex.

## Sub-slices

### S6.1 — Backend: Data Layer (completado)
Schema, entidades de dominio, puertos (repositorios), implementación Drizzle, tipos compartidos.

**Archivos creados/modificados:**
- `packages/backend/src/infrastructure/.../schema/conversations.schema.ts` — añadir `memoryProposalMode`
- `packages/backend/src/domain/entities/memory.entity.ts`
- `packages/backend/src/domain/entities/memory-change-proposal.entity.ts`
- `packages/backend/src/domain/ports/memory.repository.ts` — completar interfaz
- `packages/backend/src/domain/ports/memory-change-proposal.repository.ts` — completar interfaz
- `packages/backend/src/infrastructure/.../drizzle-memory.repository.ts`
- `packages/backend/src/infrastructure/.../drizzle-memory-change-proposal.repository.ts`
- `packages/shared/src/types/memory.ts`
- `packages/shared/src/types/memory-change-proposal.ts`
- `packages/shared/src/types/conversation.ts` — añadir `memoryProposalMode`
- `packages/backend/src/domain/entities/conversation.entity.ts` — añadir `memoryProposalMode`

**Migración:** añadir columna `memory_proposal_mode text NOT NULL DEFAULT 'auto'`

### S6.2 — Backend: Business Logic (completado)
Casos de uso de memoria, modificación de PromptContextBuilder, integración en SendMessage, controladores y rutas.

**Archivos creados:**
- `packages/backend/src/application/use-cases/memory/apply-memory-changes.use-case.ts`
- `packages/backend/src/application/use-cases/memory/apply-all-memory-changes.use-case.ts`
- `packages/backend/src/application/use-cases/memory/create-memory.use-case.ts`
- `packages/backend/src/application/use-cases/memory/update-memory.use-case.ts`
- `packages/backend/src/application/use-cases/memory/delete-memory.use-case.ts`
- `packages/backend/src/application/use-cases/memory/list-memories.use-case.ts`
- `packages/backend/src/application/use-cases/memory/list-proposals.use-case.ts`
- `packages/backend/src/infrastructure/.../memory.routes.ts`
- `packages/backend/src/lib/memory-proposal-extractor.ts` — parser inline de bloques `` ```memory_proposals ``` ``
- `packages/backend/src/lib/propose-memory-changes.tool.ts` — builder del tool schema + `toolCallsToRawProposals`

**Archivos modificados:**
- `packages/backend/src/infrastructure/.../prompt-context-builder.impl.ts` — añadir instrucción del bloque + instrucciones obligatorias de `targetMemoryId`
- `packages/backend/src/application/use-cases/conversation/send-message.use-case.ts` — invocar Propose+Apply según modo, extraer propuestas inline
- `packages/backend/src/application/use-cases/conversation/regenerate-reply.use-case.ts` — extraer propuestas inline
- `packages/backend/src/application/use-cases/conversation/continue-conversation.use-case.ts` — extraer propuestas inline
- `packages/backend/src/infrastructure/.../conversation.routes.ts` — añadir `memoryProposalMode` a PATCH settings
- `packages/backend/src/application/di.container.ts` — registrar nuevos casos de uso y repos

### S6.3 — Frontend (completado)
Cliente API, store, componentes UI necesarios, componentes de memoria, integración en SettingsPanel.

**Archivos creados:**
- `packages/frontend/src/lib/api/memories.ts`
- `packages/frontend/src/lib/stores/memory.store.ts`
- `packages/frontend/src/components/memory/memory-mode-card.tsx`
- `packages/frontend/src/components/memory/proposal-list.tsx`
- `packages/frontend/src/components/memory/memory-list.tsx`
- `packages/ui/src/components/radio-group.tsx`, `accordion.tsx`

**Archivos modificados:**
- `packages/frontend/src/components/conversation/settings-panel.tsx` — reemplazar Empty por Accordion con 3 secciones

## Extensiones alcanzadas dentro de S6

Además del objetivo original, S6 incluyó las siguientes funcionalidades:

- **Soporte de tool calling**: `propose_memory_changes` como tool JSON schema soportado por adaptadores OpenAI-compatible y Ollama, con acumulación de tool call deltas y propagación vía `propagateToolCalls`.
- **Parser OOC** (`//...//`): parser compartido en `@workspace/shared`, filtrado de OOC del historial, salvaguardas en system prompt y renderizado decorativo en frontend.
- **Badges en cabecera del chat**: indicador de estado de conexión del proveedor y contador de propuestas pendientes (filtrado por `status === "pending"`).
- **Configuración persistente del panel**: el estado de las pestañas y acordeones del SettingsPanel se persiste por conversación vía `usePersistedValue`.
- **Eliminación del campo `reason`**: columna `reason` eliminada de `memory_change_proposals` (no se usaba en UI, consumía tokens innecesariamente).
- **Defensive reads**: `Message.fromPersistence` como factory leniente, validación en `regenerate`/`withContent`.

## Cambios en schema (Drizzle)
- `conversations`: añadir `memoryProposalMode text NOT NULL DEFAULT 'auto'`
- `memory_change_proposals`: eliminar columna `reason`

## Nuevos endpoints
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/conversations/:id/memories` | Listar memorias activas |
| POST | `/api/conversations/:id/memories` | Crear memoria manual |
| PUT | `/api/conversations/:id/memories/:memoryId` | Editar memoria |
| DELETE | `/api/conversations/:id/memories/:memoryId` | Eliminar memoria |
| GET | `/api/conversations/:id/memories/proposals` | Listar propuestas |
| POST | `/api/conversations/:id/memories/proposals/apply` | Aplicar/descartar propuestas selectivamente |
| POST | `/api/conversations/:id/memories/proposals/apply-all` | Aceptar todas las pendientes |

## Cambios frontend
- `memory-mode-card.tsx`: ChoiceCard con RadioGroup auto/manual, conectado a `updateConversationSettings`
- `proposal-list.tsx`: lista de propuestas con acciones Aceptar/Editar/Descartar + "Aceptar todo"
- `memory-list.tsx`: lista de memorias con CRUD (Crear/Editar/Eliminar)
- `settings-panel.tsx`: reemplazar "Próximamente" por Accordion con las 3 secciones

## Pendientes para slices futuros
- **Auto-degradación de memorias**: resuelta en S10.
- **Parser de bloque memory_proposals más robusto**: resuelto en S76.
- **Tests unitarios de memoria**: siguen pendientes y se promovieron a **PM.34** (planificados para S85).
