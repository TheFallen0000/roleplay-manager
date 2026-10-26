# S8 — Inspección de contexto y título

**Estado:** ✅ Completo  
**Inicio:** 2026-07-27  
**Fin:** 2026-07-28  

## Decisiones de diseño

| Aspecto | Decisión |
|---|---|
| **Context preview** | `GET /api/conversations/:id/context?pendingMessage=...` devuelve el `PromptContextDTO` completo (system prompt + mensajes + metadatos). Sirve para previsualizar qué se enviará al modelo antes de generar. |
| **Title generation** | `GenerateConversationTitleUseCase` construye un transcript de la conversación y pide al LLM un título corto (3-8 palabras en español). Se dispara automáticamente tras el primer envío de mensaje y tras cada nuevo resumen. |
| **Title source** | columna `title_source` en `conversations` con valores `"auto"` (generado por LLM) o `"manual"` (definido por el usuario). El sistema nunca sobrescribe un título manual. |
| **Title regeneration** | `POST /api/conversations/:id/title` acepta body opcional `{ title }`. Si se omite, el backend auto-genera; si se provee, se guarda como manual. |
| **SSE sync** | El evento `title-generated` se emite vía SSE tras la generación automática, y el frontend actualiza el título en tiempo real. |
| **Context preview dialog** | Dialog a pantalla completa con metadatos (nombre del personaje, versión, conteo de mensajes/caracteres), system prompt completo y lista de mensajes coloreados por rol. Botones "Cancelar" y "Enviar". |
| **Right-click preview** | El botón de previsualizar está disponible en el `MessageInput` y se dispara también con clic derecho sobre el botón de enviar. |

> **Nota de revisión (2026-10-26):** el código actual genera el título solo
> cuando `conversation.title === null` (primer envío), no tras cada resumen.
> La discrepancia queda en **PM.44** para decidir si se implementa o se corrige
> esta nota.

## Archivos creados

### Shared
- `packages/shared/src/types/context.ts` — DTOs (`PromptContextDTO`, `PromptContextMessageDTO`, `PromptContextMetadataDTO`)

### Backend — Domain
- `packages/backend/src/domain/entities/conversation.entity.ts` — añadido `withTitle(title, source)` factory method y getter `titleSource`

### Backend — Use Cases
- `packages/backend/src/application/use-cases/conversation/get-prompt-context.use-case.ts`
- `packages/backend/src/application/use-cases/conversation/generate-conversation-title.use-case.ts`

### Backend — Tests
- `packages/backend/src/application/use-cases/conversation/get-prompt-context.use-case.test.ts` — 239 líneas
- `packages/backend/src/application/use-cases/conversation/generate-conversation-title.use-case.test.ts` — 251 líneas

### Backend — Routes
- `packages/backend/src/infrastructure/adapters/primary/routes/context.routes.ts` — GET /api/conversations/:id/context
- `packages/backend/src/infrastructure/adapters/primary/routes/conversation.routes.ts` — añadido POST /api/conversations/:id/title

### Backend — Infrastructure
- `packages/backend/src/infrastructure/database/migrations/0005_woozy_emma_frost.sql` — añade columna `title_source`

### Frontend
- `packages/frontend/src/lib/api/context.ts` — API client (`getPromptContext`)
- `packages/frontend/src/components/conversation/context-preview-dialog.tsx` — componente de previsualización

## Archivos modificados

- `packages/backend/src/containers/app-container.ts` — registro de `GetPromptContextUseCase`, `GenerateConversationTitleUseCase`; inyección de `generateConversationTitle` en `SendMessageUseCase`
- `packages/backend/src/application/use-cases/conversation/send-message.use-case.ts` — invoca `GenerateConversationTitle` tras primer envío
- `packages/backend/src/infrastructure/adapters/primary/server.ts` — montaje de `buildContextRouter`
- `packages/backend/src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-conversation.repository.ts` — soporte para `titleSource`
- `packages/backend/src/infrastructure/adapters/secondary/drizzle/schema/conversations.schema.ts` — columna `title_source`
- `packages/frontend/src/components/conversation/chat.tsx` — integración de `ContextPreviewDialog`, edición inline del título, regeneración y título manual
- `packages/frontend/src/components/conversation/message-input.tsx` — botón de preview + clic derecho
- `packages/frontend/src/lib/api/conversations.ts` — añadido `setConversationTitle(id, title?)`
- `packages/shared/src/types/conversation.ts` — añadido `titleSource: "auto" | "manual"`
- Varios tests de casos de uso existentes — añadidos métodos faltantes a mocks

## Estado de tests

- **Total backend tests:** 192 (36 test files)
- **Tests nuevos:** 2 (get-prompt-context, generate-conversation-title)
- **Nuevos test files:** 2
- **Typecheck:** ✅ pasa en todos los paquetes

## Pendiente para S9

- Timeouts de proveedores configurables
- Manejo unificado de errores en frontend
- Estados de carga y error consistentes
- Revisión de accesibilidad básica
- Optimización de queries Drizzle
- Revisión de documentación

> **Revisión (2026-10-26):** los timeouts se resolvieron con
> `PROVIDER_TIMEOUT_MS`; errores/carga y accesibilidad quedan en **PM.35**; la
> optimización Drizzle se descartó a favor de medir primero; la revisión de
> documentación es continua.
