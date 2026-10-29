# Arquitectura Técnica

## Propósito

Definir la estructura del proyecto, la organización de capas, los flujos de datos y las decisiones técnicas que guiarán la implementación de la primera versión, garantizando una arquitectura hexagonal que mantenga el dominio independiente de frameworks, bases de datos y proveedores externos.

---

## Stack tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| Backend | Express.js | Framework HTTP (adaptador primario) |
| ORM | Drizzle ORM | Adaptador de persistencia |
| Base de datos | SQLite | Almacenamiento local (Offline First) |
| Frontend | Astro + React | SSR con componentes interactivos |
| UI | shadcn/ui (preset `base-nova`, `@base-ui/react`) | Librería de componentes de interfaz |
| Estilos | Tailwind CSS v4 | Utilidades de estilos (config-less, vía `@tailwindcss/vite` + `@import`) |
| Estado (frontend) | Zustand | Gestión de estado de UI y servidor |
| Validación | Zod | Schemas declarativos en adaptadores primarios |
| Identificadores | UUID v7 (`uuid`) | Generación de IDs en la capa de aplicación |
| Paquete | pnpm workspaces | Monorepo |
| Orquestación | Turborepo | Gestión de tareas del monorepo (`turbo.json`) |

---

## Estructura del monorepo

```
roleplay-manager/
  packages/
    backend/
      src/
        domain/
          entities/
            character.entity.ts
            character-version.entity.ts
            character-card.entity.ts
            conversation.entity.ts
            message.entity.ts
            memory.entity.ts
            summary.entity.ts
          value-objects/
            prompt-context.ts
            generated-response.ts
            inference-config.ts
            memory-change-proposal.ts
          ports/
            character.repository.ts
            conversation.repository.ts
            memory.repository.ts
            summary.repository.ts
            provider.port.ts

        application/
          use-cases/
            character/
              create-character.use-case.ts
              create-character-version.use-case.ts
              update-character.use-case.ts
              delete-character.use-case.ts
            conversation/
              create-conversation.use-case.ts
              send-message.use-case.ts
              regenerate-reply.use-case.ts
              edit-message.use-case.ts
              rewind-conversation.use-case.ts
              archive-conversation.use-case.ts
              update-conversation-settings.use-case.ts
              generate-conversation-title.use-case.ts
            memory/
              propose-memory-changes.use-case.ts
              apply-memory-changes.use-case.ts
              create-memory.use-case.ts
              update-memory.use-case.ts
              delete-memory.use-case.ts
            summary/
              generate-summary.use-case.ts
              update-summary.use-case.ts
              delete-summary.use-case.ts
            provider/
              prompt-context-builder.use-case.ts
              generate-character-response.use-case.ts
              configure-default-provider.use-case.ts

        infrastructure/
          adapters/
            primary/
              routes/
                character.routes.ts
                conversation.routes.ts
                memory.routes.ts
              controllers/
                character.controller.ts
                conversation.controller.ts
                memory.controller.ts
              middlewares/
                error-handler.ts
                validation.ts
            secondary/
              drizzle/
                schema/
                  character.schema.ts
                  conversation.schema.ts
                  memory.schema.ts
                  summary.schema.ts
                repositories/
                  drizzle-character.repository.ts
                  drizzle-conversation.repository.ts
                  drizzle-memory.repository.ts
                  drizzle-summary.repository.ts
              providers/
                ollama.adapter.ts
                openai-compatible.adapter.ts
                provider-registry.ts
          config/
            env.ts
            database.ts
            provider.config.ts
          database/
            migrations/
            index.ts

        containers/
          use-case.container.ts
          repository.container.ts
          provider.container.ts

      drizzle.config.ts
      package.json
      tsconfig.json

    frontend/
      src/
        pages/
          index.astro
          characters/
            index.astro
            [id].astro
            new.astro
            [id]/edit.astro
          conversations/
            [id].astro
          settings/
            providers.astro
        components/
          provider/
            provider-manager.tsx
          character/
            character-form.tsx
            character-card.tsx
            version-history.tsx
          conversation/
            chat.tsx
            message.tsx
            message-input.tsx
            settings-panel.tsx
          memory/
            memory-list.tsx
            proposal-review.tsx
          summary/
            summary-viewer.tsx
        lib/
          api/
            client.ts
            characters.ts
            conversations.ts
            messages.ts
            memories.ts
            summaries.ts
            providers.ts
          stores/
            chat.store.ts
        layouts/
          base.astro
          sidebar.astro

      astro.config.mjs
      components.json
      package.json
      tsconfig.json

    ui/                      (paquete compartido de componentes shadcn)
      src/
        components/          (button.tsx, dialog.tsx, ...)
        lib/
          utils.ts           (cn())
        hooks/
        styles/
          globals.css        (Tailwind v4 + design tokens shadcn)

      components.json        (preset base-nova, @base-ui/react)
      package.json           (name: @workspace/ui)
      tsconfig.json

    shared/
      src/
        types/
          character.ts
          conversation.ts
          message.ts
          memory.ts
          memory-change-proposal.ts
          summary.ts
          provider.ts
          context-preview.ts
      package.json
      tsconfig.json

  pnpm-workspace.yaml
  package.json
  turbo.json
```

---

## Arquitectura hexagonal (backend)

La arquitectura sigue el modelo de puertos y adaptadores, organizado en tres capas.

### Capa de dominio

Es el núcleo del sistema. No depende de ninguna tecnología externa.

Contiene:
* **Entidades**: representan los conceptos del dominio con sus invariantes.
* **Value Objects**: objetos inmutables que transportan información entre capas.
* **Puertos (interfaces)**: contratos que la capa de aplicación necesita, implementados por los adaptadores.

Reglas:
* El dominio no importa nada de `infrastructure` ni de `application`.
* Las entidades solo dependen de otras entidades del dominio.
* Los puertos se definen como interfaces TypeScript.

### Capa de aplicación

Contiene los casos de uso. Cada caso de uso:
1. Recibe una solicitud desde un adaptador primario.
2. Coordina las entidades del dominio.
3. Se comunica con el exterior mediante los puertos definidos en el dominio.
4. Devuelve un resultado.

Reglas:
* Los casos de uso dependen del dominio (entidades y puertos), nunca de la infraestructura.
* La inyección de dependencias conecta los casos de uso con sus adaptadores.

### Capa de infraestructura

Contiene las implementaciones concretas de los puertos y los adaptadores de entrada/salida.

* **Adaptadores primarios (driving)**: Express routes y controllers. Traducen peticiones HTTP a llamadas a casos de uso y viceversa.
* **Adaptadores secundarios (driven)**: Repositorios Drizzle, adaptadores de proveedores de IA. Implementan los puertos del dominio.

---

## Flujo de datos end-to-end

### Ejemplo: SendMessage

```
[Frontend]
  Petición POST /api/conversations/:id/messages
       |
[Express Router]
       |
[Controller]  (traduce HTTP → parámetros del caso de uso)
       |
[SendMessage Use Case]  (coordina el flujo)
       |---> [ConversationRepository] (puerto)
       |         └──> [DrizzleConversationRepository] (SQLite)
       |              · valida que la conversación exista y esté activa
       |              · registra el mensaje del usuario
       |
       |---> [PromptContextBuilder Use Case]
       |         |---> [CharacterRepository] (puerto)
       |         |         └──> [DrizzleCharacterRepository] (SQLite)
       |         |---> [SummaryRepository] (puerto)
       |         |         └──> [DrizzleSummaryRepository] (SQLite)
       |         |---> [MemoryRepository] (puerto)
       |         |         └──> [DrizzleMemoryRepository] (SQLite)
       |         └──> construye el PromptContext
       |
       |---> [SendMessage / ContinueConversation / RegenerateReply]
       |         |---> [ChatEngine] (contexto, compactación, proveedor, tools)
       |         |         |---> [ProviderPort] (puerto)
       |         |         |         └──> [OllamaAdapter] (API HTTP a Ollama)
       |         |         └──> [PromptContextBuilder] (prompt)
       |         └──> [MessageRepository] (puerto)
       |                   └──> [DrizzleMessageRepository] (SQLite)
       |                        · almacena la respuesta del asistente
       |
       |---> [GenerateConversationTitle Use Case]  (solo en la primera interacción)
       |         |---> [ProviderPort] (puerto)
       |         |         └──> [OllamaAdapter] (API HTTP a Ollama)
       |         └──> actualiza el título de la conversación
       |
       |---> [GenerateSummary Use Case]  (si corresponde según summaryFrequency)
       |         |---> [ProviderPort] (puerto)
       |         |         └──> [OllamaAdapter] (API HTTP a Ollama)
       |         |---> [SummaryRepository] (puerto)
       |         |         └──> [DrizzleSummaryRepository] (SQLite)
       |         └──> [GenerateConversationTitle Use Case]  (actualiza título con el nuevo estado)
       |
       |---> [ProposeMemoryChanges Use Case]
       |         |---> [ProviderPort] (puerto)
       |         |         └──> [OllamaAdapter] (API HTTP a Ollama)
       |         └──> [MemoryChangeProposalRepository] (puerto)
       |                   └──> [DrizzleMemoryChangeProposalRepository] (SQLite)
       |                        · almacena las propuestas en estado `pending`
       |
[Controller]  (traduce resultado → HTTP response / SSE stream)
       |
[Frontend]
  Recibe el mensaje generado (streaming) y las propuestas pendientes
```

> **Notas sobre el orden de invocación**:
>
> 1. `GenerateConversationTitle` se ejecuta **dos veces** dentro del flujo: primero tras la primera interacción del usuario (para proponer un título inicial) y de nuevo tras generar un resumen, para refrescar el título con el estado narrativo actualizado. En ambos casos la propuesta de título se aplica directamente sobre la conversación, sin requerir revisión explícita del usuario, quien podrá editarla manualmente en cualquier momento.
> 2. Las propuestas de memoria generadas por `ProposeMemoryChanges` se almacenan en estado `pending` y no se aplican durante este caso de uso; quedan a la espera de revisión por parte del usuario mediante `ApplyMemoryChanges`.
> 3. Si el proveedor no soporta streaming, el controlador espera la respuesta completa antes de enviarla al frontend en un único payload.

---

### Ejemplo: CreateConversation

```
[Frontend]
  Petición POST /api/conversations
       |
[Express Router]
       |
[Controller]  (traduce HTTP → parámetros del caso de uso)
       |
[CreateConversation Use Case]  (coordina el flujo)
       |---> [CharacterRepository] (puerto)
       |         └──> [DrizzleCharacterRepository] (SQLite)
       |              · obtiene la CharacterVersion asociada al personaje
       |
       |---> [ConversationRepository] (puerto)
       |         └──> [DrizzleConversationRepository] (SQLite)
       |              · crea la conversación con estado `active`
       |              · asocia la conversación a la versión del personaje
       |
       |---> [MessageRepository] (puerto)
       |         └──> [DrizzleMessageRepository] (SQLite)
       |              · inserta el greeting de la versión como primer mensaje (rol `assistant`, posición 0)
       |
[Controller]  (traduce resultado → HTTP response)
       |
[Frontend]
  Recibe la conversación creada y redirige a la vista de chat
```

> **Notas sobre CreateConversation**:
>
> 1. La conversación se crea en estado `active` e incluye automáticamente el `greeting` de la `CharacterVersion` como primer mensaje con rol `assistant`.
> 2. La conversación no tiene título al crearse. El título se propondrá automáticamente durante el primer `SendMessage` mediante `GenerateConversationTitle`.
> 3. El `GET /api/conversations` devuelve el listado de conversaciones activas (opcionalmente archivadas) con paginación.

---

## Contenedores e inyección de dependencias

El sistema utiliza un mecanismo simple de contenedores (sin librería externa en v1) para ensamblar las dependencias.

```
containers/
  repository.container.ts   → instancia todos los repositorios Drizzle
  use-case.container.ts     → instancia todos los casos de uso con sus dependencias
  provider.container.ts     → registra los adaptadores de proveedores disponibles
```

Cada controlador obtiene los casos de uso que necesita desde el contenedor y los invoca sin conocer sus dependencias internas.

---

## API REST

El contrato detallado para consumidores externos (payloads, SSE y
límites de confianza) vive en `13-api-contract.md`. Esta tabla es el mapa de
rutas del backend.

| Método | Ruta | Caso de uso | Notas |
|---|---|---|---|---|
| `POST` | `/api/characters` | CreateCharacter | |
| `GET` | `/api/characters` | ListCharacters | Lista todos los personajes |
| `GET` | `/api/characters/:id` | — (consulta) | |
| `PUT` | `/api/characters/:id` | UpdateCharacter | Crea nueva version inmutable |
| `DELETE` | `/api/characters/:id` | DeleteCharacter | |
| `GET` | `/api/characters/:id/versions` | — (consulta) | Lista historico de versiones |
| `POST` | `/api/characters/:id/versions` | CreateCharacterVersion | |
| `GET` | `/api/characters/:id/versions` | — (consulta) | |
| `POST` | `/api/conversations` | CreateConversation | |
| `GET` | `/api/conversations` | — (listado) | Filtrable por estado activo/archivado |
| `GET` | `/api/conversations/:id` | — (consulta) | |
| `GET` | `/api/conversations/:id/context` | — (previsualización) | Devuelve el `PromptContext` sin invocar al proveedor |
| `GET` | `/api/conversations/:id/context/stats` | — (previsualización) | Metadatos y estimación de tokens |
| `POST` | `/api/conversations/:id/messages` | SendMessage | Respuesta por SSE |
| `GET` | `/api/conversations/:id/messages` | — (consulta) | |
| `PUT` | `/api/conversations/:id/messages/:messageId` | EditMessage | |
| `POST` | `/api/conversations/:id/continue` | ContinueConversation | Respuesta por SSE |
| `POST` | `/api/conversations/:id/messages/:messageId/regenerate` | RegenerateReply | Respuesta por SSE |
| `POST` | `/api/conversations/:id/rewind` | RewindConversation | |
| `POST` | `/api/conversations/:id/title` | GenerateConversationTitle | Genera/aplica título automáticamente |
| `PATCH` | `/api/conversations/:id/settings` | UpdateConversationSettings | |
| `POST` | `/api/conversations/:id/archive` | ArchiveConversation | Transición `active → archived` |
| `POST` | `/api/conversations/:id/unarchive` | ArchiveConversation | Transición `archived → active` (mismo caso de uso, dirección opuesta) |
| `GET` | `/api/conversations/:id/memories` | — (consulta) | |
| `POST` | `/api/conversations/:id/memories` | CreateMemory | Creación manual de memoria |
| `PUT` | `/api/conversations/:id/memories/:memoryId` | UpdateMemory | Edición manual de memoria |
| `DELETE` | `/api/conversations/:id/memories/:memoryId` | DeleteMemory | Eliminación manual de memoria |
| `GET` | `/api/conversations/:id/memories/proposals` | — (consulta) | |
| `POST` | `/api/conversations/:id/memories/proposals/:proposalId/apply` | ApplyMemoryChanges | |
| `GET` | `/api/conversations/:id/summaries` | — (consulta) | |
| `POST` | `/api/conversations/:id/summaries/generate` | GenerateSummary | Resumen manual |
| `PUT` | `/api/conversations/:id/summaries/:summaryId` | UpdateSummary | Edición manual de resumen |
| `DELETE` | `/api/conversations/:id/summaries/:summaryId` | DeleteSummary | Eliminación manual de resumen |
| `GET` | `/api/providers` | — (lista proveedores disponibles) | |
| `GET` | `/api/providers/:id/status` | ValidateProviderConnection | Verifica que el proveedor esté accesible; no modifica estado |
| `GET` | `/api/providers/:id/models` | ListProviderModels | Lista modelos disponibles; vacío con `manualEntryRequired` si no soporta descubrimiento |
| `GET` | `/api/providers/:id/model-context` | GetProviderModelContext | Ventana de contexto detectada para un modelo |
| `GET` | `/api/settings/default-provider` | — (consulta proveedor por defecto) | |
| `PUT` | `/api/settings/default-provider` | ConfigureDefaultProvider | Establece proveedor y modelo por defecto |

> **ArchiveConversation**: ambos endpoints (`/archive` y `/unarchive`) resuelven al mismo caso de uso, que internamente decide la transición de estado en función del estado actual de la conversación y la ruta invocada. Se mantiene un único caso de uso para preservar la coherencia de las reglas de negocio (no archivar lo ya archivado, no reactivar lo ya activo) en un solo lugar.

> **Previsualización de contexto** (`GET /api/conversations/:id/context`): ejecuta `GetPromptContextUseCase` con el estado actual de la conversación y devuelve el `PromptContext` serializado en JSON **sin invocar al proveedor**. Acepta `?pendingMessage=` para simular el siguiente mensaje del usuario. `GET /api/conversations/:id/context/stats` devuelve solo los metadatos y la estimación de tokens. El `PromptContextBuilder` es un adaptador secundario que coordina el personaje, la memoria, el resumen y los mensajes; el controlador no llama al proveedor.

> **GenerateConversationTitle** (`POST /api/conversations/:id/title`): el título se genera invocando al proveedor con un contexto reducido (no incluye el `PromptContextBuilder` completo) y se **aplica automáticamente** sobre la conversación tras la generación. No constituye una propuesta pendiente —el usuario puede editarlo manualmente en cualquier momento, pero no hay un paso de aprobación intermedio. Durante `SendMessage`, este caso de uso se invoca automáticamente en la primera interacción y tras cada generación de resumen. El endpoint manual permite regenerar el título bajo demanda.

> **CRUD de Memory**: los endpoints `POST`, `PUT` y `DELETE` sobre `/api/conversations/:id/memories` permiten al usuario crear, editar y eliminar memorias dinámicas manualmente, sin pasar por el flujo de propuestas de la IA. Esto cumple el principio de que el usuario mantiene control directo sobre la memoria dinámica en todo momento. Cada operación actualiza el campo `updatedBy` con el valor `user`.

> **Edición y eliminación de Summary**: los endpoints `PUT` y `DELETE` sobre `/api/conversations/:id/summaries/:summaryId` permiten al usuario editar manualmente el contenido de cualquier resumen o eliminarlo. Si se elimina el resumen más reciente, el `PromptContextBuilder` utilizará automáticamente el resumen cronológicamente anterior en la siguiente construcción de contexto.

---

## Esquema de base de datos (Drizzle)

### Entidades principales

```typescript
// characters
export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// character_versions
export const characterVersions = sqliteTable('character_versions', {
  id: text('id').primaryKey(),
  characterId: text('character_id').notNull().references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subtitle: text('subtitle'),
  profileImage: text('profile_image').notNull(),
  description: text('description').notNull(),
  instructions: text('instructions'),
  greeting: text('greeting').notNull(),
  versionNumber: integer('version_number').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// character_cards
export const characterCards = sqliteTable('character_cards', {
  id: text('id').primaryKey(),
  versionId: text('version_id').notNull().references(() => characterVersions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  position: integer('position').notNull(), // índice 0 = mayor prioridad visual y de contexto
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

// conversations
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  versionId: text('version_id').notNull().references(() => characterVersions.id, { onDelete: 'cascade' }),
  title: text('title'),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  model: text('model'),
  provider: text('provider'),
  recentMessageCount: integer('recent_message_count').default(15),
  summaryFrequency: integer('summary_frequency').default(15),
  temperature: real('temperature').default(0.7),
  maxTokens: integer('max_tokens').default(2048),
  topP: real('top_p').default(0.9),
  frequencyPenalty: real('frequency_penalty').default(0),
  presencePenalty: real('presence_penalty').default(0),
  stopSequences: text('stop_sequences', { mode: 'json' }).$type<string[]>().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  position: integer('position').notNull(),
  alternatives: text('alternatives', { mode: 'json' }).$type<string[]>().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
});

// memories
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  actor: text('actor').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: integer('priority').notNull().default(5),
  createdBy: text('created_by', { enum: ['user', 'assistant'] }).notNull(),
  updatedBy: text('updated_by', { enum: ['user', 'assistant', 'system'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  titleUnique: unique('memories_title_unique').on(table.conversationId, table.title),
}));

// summaries
export const summaries = sqliteTable('summaries', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  firstMessageId: text('first_message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  lastMessageId: text('last_message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  model: text('model'),
  provider: text('provider'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
});

// memory_change_proposals
export const memoryChangeProposals = sqliteTable('memory_change_proposals', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  operation: text('operation', { enum: ['CREATE', 'UPDATE', 'DELETE'] }).notNull(),
  targetMemoryId: text('target_memory_id').references(() => memories.id, { onDelete: 'set null' }),
  actor: text('actor').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: integer('priority').notNull().default(5),
  reason: text('reason'),
  status: text('status', { enum: ['pending', 'applied', 'discarded'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  processedBy: text('processed_by', { enum: ['user', 'system'] }).notNull().default('user'),
});

// settings (configuración global del sistema)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

> **Tabla `settings`**: almacena pares clave-valor para la configuración global del sistema. En la versión 1.0 se utiliza principalmente para persistir el proveedor y modelo por defecto seleccionados por el usuario (claves `default_provider` y `default_model`). Esta tabla permite añadir nuevas configuraciones globales en el futuro sin modificar el esquema.

### Relaciones y reglas de integridad

* `character_versions` y `conversations` usan `onDelete: 'cascade'` para garantizar la eliminación en cascada desde `characters`. La cascada `character_versions → conversations` también usa `onDelete: 'cascade'`, de modo que eliminar un personaje borra recursivamente sus versiones y todas las conversaciones, mensajes, memorias, resúmenes y propuestas asociadas sin dejar referencias huérfanas.
* `messages`, `memories`, `summaries` y `memory_change_proposals` usan `onDelete: 'cascade'` desde `conversations`.
* `character_cards` usa `onDelete: 'cascade'` desde `character_versions`.
* `summaries.firstMessageId` y `summaries.lastMessageId` usan `onDelete: 'cascade'` desde `messages`: si un mensaje referenciado por un resumen es eliminado (por ejemplo durante un `RewindConversation`), el resumen completo se elimina automáticamente, ya que su rango narrativo queda invalidado. Esta operación es irreversible y coherente con la naturaleza destructiva del retroceso.
* `memory_change_proposals.targetMemoryId` usa `onDelete: 'set null'`: si la memoria objetivo de una propuesta UPDATE/DELETE desaparece por una edición manual, la propuesta conserva su contenido pero su `targetMemoryId` queda nulo y se descarta automáticamente al procesarse.
* La posición de los mensajes es única por conversación.
* El primer mensaje de cada conversación tiene rol `assistant` y corresponde al greeting de la versión.
* El título de las memorias es único por conversación (`unique(conversationId, title)`). Si la IA propone memorias con títulos repetidos, el sistema añade un sufijo secuencial visual (p. ej. `Misión`, `Misión 2`, `Misión 3`) manteniendo identificadores internos distintos, de forma que la unicidad se preserve tanto en la representación visual como en la base de datos.

---

## Frontend

### Paquete de componentes y estilos

Los componentes shadcn y los estilos globales residen en un paquete compartido `@workspace/ui` (`packages/ui`), no dentro del paquete `frontend`. El frontend los consume mediante el alias `@workspace/ui/*`:

* `@workspace/ui/components/*` — componentes shadcn (preset `base-nova`, construidos sobre `@base-ui/react`).
* `@workspace/ui/lib/utils` — helper `cn()`.
* `@workspace/ui/globals.css` — hoja de estilos global con Tailwind v4 y design tokens (importada por los layouts de Astro).

Tailwind CSS v4 se configura **sin archivo `tailwind.config.ts`**: las directivas `@import "tailwindcss"` y `@theme inline` viven en `packages/ui/src/styles/globals.css`, y el plugin `@tailwindcss/vite` se registra en `astro.config.mjs`. El escaneo de clases se controla mediante `@source` dentro del propio CSS.

### Comunicación con el backend

El frontend se comunica con el backend mediante una API client en `lib/api/` que utiliza `fetch` nativo.

```
lib/api/
  client.ts          → instancia base con URL y headers
  characters.ts      → funciones CRUD para personajes
  conversations.ts   → funciones para conversaciones
  messages.ts        → funciones para mensajes
  memories.ts        → funciones para memorias
  summaries.ts       → funciones para resúmenes
  providers.ts       → funciones para listar y verificar proveedores
```

### Streaming

El frontend recibe respuestas en streaming mediante **Server-Sent Events (SSE)**.

SSE se elige como mecanismo único por su simplicidad para flujos unidireccionales servidor → cliente, su soporte nativo en navegadores a través de `EventSource`, y su buen encaje con Express sin requerir WebSockets.

El flujo es:
1. El frontend envía el mensaje del usuario.
2. El backend inicia la generación y transmite fragmentos de texto mediante streaming.
3. El frontend muestra los fragmentos en tiempo real en la interfaz de chat.
4. Al completarse, el frontend recibe el mensaje completo y actualiza la UI.

Los eventos (`saved`, `compacting`, `context-warning`, `summary-generated`,
`chunk`, `done`, `title-generated`, `error`), sus payloads y el orden que debe
esperar un consumidor externo están en `13-api-contract.md`.

### Estado y reactividad

La gestión de estado del frontend se basa en **Zustand**.

Se elige Zustand por su API minimalista, su bajo peso y su buen encaje con el modelo *Offline First*: no introduce capas de caché ni invalidaciones que añadirían complejidad innecesaria cuando el backend ya es local.

Zustand cubre tanto el estado de UI (panel de inspección abierto, mensaje en edición, propuestas seleccionadas) como el estado de servidor mediante `fetch` + `set`, incluyendo la recepción de fragmentos durante el streaming por SSE.

No se incluye **TanStack Query** en la versión 1.0. TanStack Query brilla cachestado de servidor en escenarios con latencia y múltiples consumidores, ventajas que no aportan valor suficiente frente a un backend local. Su adopción podrá reconsiderarse en futuras versiones si se introducen sincronización en la nube o cargas remotas que justifiquen su complejidad (ver *Futuras extensiones*).

---

## Decisiones técnicas

### Identificadores

Todos los identificadores de entidades se generan como **UUID v7** (paquete `uuid`) en la capa de aplicación, no en la base de datos.

UUID v7 se elige sobre v4 porque combina unicidad con ordenabilidad temporal: los IDs generados en momentos cercanos comparten prefijo de timestamp, lo que mejora la localidad de los índices en SQLite y reduce la fragmentación de páginas frente a UUID v4 puramente aleatorio.

La generación ocurre en la capa de aplicación para mantener el dominio independiente de la base de datos y garantizar que los IDs estén disponibles antes de la persistencia.

### Validación

La validación de datos de entrada se realiza con **Zod**.

Zod se elige porque permite definir schemas declarativos que infieren tipos TypeScript automáticamente, eliminando la duplicación entre tipos de validación y tipos de dominio. Encaja con la arquitectura hexagonal:

* Los **adaptadores primarios** (controllers de Express) validan las peticiones HTTP entrantes con schemas Zod antes de invocar los casos de uso. Si la validación falla, el adaptador devuelve un `ValidationError` sin alcanzar la capa de aplicación.
* Los **casos de uso** reciben datos ya validados y operan exclusivamente con entidades y value objects del dominio.
* El **dominio** no conoce Zod ni ninguna librería de validación; sus invariantes se expresan en el constructor de las entidades puro TypeScript.

Los schemas de validación se definen en `infrastructure/adapters/primary/` junto a los controllers, nunca en el dominio.

### Configuración de base de datos

SQLite se configura como un archivo local gestionado por el adaptador de persistencia en `infrastructure/config/database.ts`.

* **Ruta por defecto**: `./data/roleplay.db` relativa a la raíz del paquete `backend`.
* **Variable de entorno**: `DATABASE_PATH` permite sobrescribir la ruta (p. ej. para tests o entornos personalizados). Si no se define, se utiliza la ruta por defecto.
* **Creación del directorio**: el sistema crea el directorio `./data/` automáticamente al arrancar si no existe.
* **Driver**: se utiliza `better-sqlite3` como driver síncrono nativo de Node.js, envuelto por Drizzle ORM.

La configuración de la base de datos reside en la capa de infraestructura. El dominio y los casos de uso desconocen la ruta, el driver y el formato de almacenamiento; únicamente interactúan con los puertos de repositorio definidos en el dominio.

### Migraciones

Las migraciones de esquema se gestionan con **Drizzle Kit** (`drizzle-kit`), configurado en `drizzle.config.ts`.

El flujo de migración es:

1. **Generación**: `pnpm --filter backend db:generate` genera archivos SQL de migración a partir de los cambios en los schemas de `infrastructure/adapters/secondary/drizzle/schema/`. Los archivos se almacenan en `infrastructure/database/migrations/`.
2. **Aplicación**: `pnpm --filter backend db:migrate` aplica las migraciones pendientes a la base de datos SQLite al arrancar el servidor.
3. **Push directo** (desarrollo): `pnpm --filter backend db:push` sincroniza el esquema directamente sin generar archivos de migración. Útil durante el desarrollo iterativo; no sustituye al flujo de migración en producción.

Las migraciones se ejecutan automáticamente al iniciar el servidor en modo desarrollo. En modo producción, el servidor verifica que todas las migraciones estén aplicadas antes de aceptar peticiones y aborta el arranque si detecta migraciones pendientes.

### Serialización

La comunicación entre frontend y backend utiliza JSON estándar. Las fechas se transmiten como timestamps UNIX (milisegundos).

### Manejo de errores

El backend define una estructura uniforme de respuesta para errores:

```json
{
  "error": {
    "code": "CHARACTER_NOT_FOUND",
    "message": "El personaje solicitado no existe."
  }
}
```

Los errores se clasifican en los siguientes tipos, cada uno con un código string y un código HTTP asociado:

| Tipo | Código string (ejemplo) | HTTP | Descripción |
|---|---|---|---|
| **ValidationError** | `VALIDATION_ERROR` | `400` | Datos de entrada inválidos (schema Zod rechazado, campos obligatorios ausentes, formato incorrecto). |
| **NotFoundError** | `CHARACTER_NOT_FOUND` `CONVERSATION_NOT_FOUND` `MEMORY_NOT_FOUND` `SUMMARY_NOT_FOUND` | `404` | La entidad referenciada no existe. El código string incluye el nombre de la entidad. |
| **DomainError** | `CONVERSATION_ARCHIVED` `MEMORY_TITLE_DUPLICATE` `REWIND_NO_MESSAGES` `DEFAULT_PROVIDER_NOT_SET` | `422` | Violación de una regla de negocio. La operación es sintácticamente válida pero semánticamente rechazada. |
| **ProviderError** | `PROVIDER_CONNECTION_FAILED` `PROVIDER_GENERATION_FAILED` `PROVIDER_MODEL_NOT_FOUND` | `502` | El proveedor de IA devolvió un error o no pudo completar la generación. |
| **ProviderTimeoutError** | `PROVIDER_TIMEOUT` | `504` | El proveedor superó el tiempo máximo de espera sin responder. |
| **InfrastructureError** | `INTERNAL_ERROR` | `500` | Error técnico no clasificado (fallo de base de datos, error inesperado). Siempre se devuelve `INTERNAL_ERROR` al cliente para no filtrar detalles internos; el error real se registra en los logs del servidor. |

El middleware `error-handler.ts` captura todas las excepciones no manejadas, las traduce al formato uniforme y asigna el código HTTP correspondiente. Los errores del dominio (`DomainError`, `NotFoundError`, `ValidationError`) se propagan al cliente con su mensaje original. Los errores de infraestructura se enmascaran con `INTERNAL_ERROR` para no exprior detalles internos.

### Timeouts de proveedores

En la versión 1.0, el sistema implementa **únicamente timeouts** como mecanismo de protección ante proveedores que no responden. No se implementan reintentos automáticos.

* **Timeout por defecto**: **120 segundos** para cualquier generación (respuesta, resumen, título, propuestas de memoria).
* El timeout es configurable globalmente mediante la clave `provider_timeout_ms` en la tabla `settings`, lo que permite al usuario ajustarlo según su hardware y modelo.
* Si el proveedor no responde dentro del tiempo establecido, el adaptador lanza un `ProviderTimeoutError`, que el `ChatEngine` captura sin modificar el estado de la conversación.

**Comportamiento del frontend ante timeout**:

Cuando el frontend recibe un error de timeout (código `PROVIDER_TIMEOUT`) durante el streaming por SSE:

1. El streaming se interrumpe.
2. El frontend muestra un **mensaje informativo en el propio chat** con el formato: *"El modelo no envió una respuesta dentro de un tiempo razonable. Puedes intentar enviar el mensaje nuevamente."*
3. El mensaje del usuario permanece almacenado en la conversación.
4. No se almacena ningún mensaje del asistente.
5. La conversación conserva su estado y está lista para que el usuario reintente la operación manualmente.

Este enfoque prioriza la transparencia: el usuario entiende qué ocurrió, retiene el control sobre cuándo reintentar, y el sistema no introduce complejidad de reintentos automáticos que podrían enmascarar problemas subyacentes (modelo cargado, hardware insuficiente, etc.).

### Streaming de proveedores

El adaptador de cada proveedor implementa tanto generación completa como streaming. El `ChatEngine` resuelve el adaptador y delega en él; si el proveedor lo soporta, entrega fragmentos al controlador HTTP, que los transmite al frontend mediante **SSE**.

Si el proveedor no soporta streaming, el adaptador entrega la respuesta completa de una sola vez; el controlador HTTP aún la transmite por SSE en un único evento, manteniendo un único mecanismo de transporte hacia el frontend independientemente del proveedor.

### Dependencias compartidas

Los tipos compartidos entre frontend y backend (entidades, DTOs, constantes) residen en `packages/shared/src/types/` para evitar duplicación y garantizar consistencia.

En concreto, el paquete `shared` expone los siguientes módulos de tipos:

* `character.ts` — tipos de `Character`, `CharacterVersion` y `CharacterCard`.
* `conversation.ts` — tipos de `Conversation` y su configuración local.
* `message.ts` — tipos de `Message` y roles.
* `memory.ts` — tipos de `Memory` y su prioridad.
* `memory-change-proposal.ts` — tipos de `MemoryChangeProposal` (operación, estado, DTO de revisión).
* `summary.ts` — tipos de `Summary`.
* `provider.ts` — tipos de `Provider`, `InferenceConfig` y estado de proveedores.
* `context-preview.ts` — tipos del DTO de previsualización de `PromptContext` (sección, rol, contenido, orden).

---

## Tareas del workspace (Turborepo)

El archivo `turbo.json` en la raíz del monorepo define las tareas orquestadas por **Turborepo** across los paquetes `backend`, `frontend` y `shared`.

| Tarea | Descripción | Paquetes |
|---|---|---|
| `build` | Compila TypeScript a JavaScript de producción. | `backend`, `frontend`, `shared` |
| `dev` | Inicia el servidor de desarrollo con recarga en caliente. El backend arranca Express con watch; el frontend arranca Astro en modo dev; `shared` se construye en watch. | `backend`, `frontend`, `shared` |
| `lint` | Ejecuta ESLint sobre el código fuente de cada paquete. | `backend`, `frontend`, `shared` |
| `typecheck` | Ejecuta `tsc --noEmit` para verificar tipos sin generar salida. Depende de que `shared` esté construido. | `backend`, `frontend`, `shared` |
| `db:generate` | Genera archivos de migración SQL a partir de los schemas de Drizzle. | `backend` |
| `db:migrate` | Aplica las migraciones pendientes a la base de datos SQLite. | `backend` |
| `db:push` | Sincroniza el esquema directamente contra SQLite sin generar archivos de migración (solo desarrollo). | `backend` |

Todas las tareas se ejecutan desde la raíz del monorepo mediante `pnpm turbo <tarea>` o los scripts convenience de la raíz (p. ej. `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm db:migrate`).

Turborepo cachea los resultados de `build`, `lint` y `typecheck` para que los re-run sean instantáneos cuando no hay cambios. Las tareas `db:*` nunca se cachean porque modifican el estado de la base de datos.

---

## Principios arquitectónicos

* El dominio nunca importa código de infraestructura.
* Los casos de uso nunca dependen directamente de Express, Drizzle ni de ningún proveedor de IA.
* Los adaptadores de base de datos implementan interfaces definidas en el dominio.
* Los adaptadores de proveedores implementan el puerto `ProviderPort` definido en el dominio.
* Cada caso de uso se prueba de forma aislada mockeando sus puertos.
* La base de datos puede sustituirse sin modificar el dominio ni los casos de uso.
* Express puede sustituirse por otro framework HTTP sin modificar el dominio ni los casos de uso.
