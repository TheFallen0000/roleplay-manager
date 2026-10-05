# S23 — Personajes jugados por el usuario (PM.15)

**Estado:** Completado
**Inicio:** 2026-08-12
**Fin:** 2026-08-12

## Descripción

Se añaden los **personajes jugados por el usuario** (la "persona"): nombre y
descripción de a quién interpreta la persona que escribe, sin versiones (a
diferencia de los personajes de IA). Se gestionan en una pantalla de Ajustes
("Personajes jugados", junto a Proveedores) y cada conversación elige la suya
desde los ajustes del chat. La persona elegida se incluye en el system prompt,
de modo que la IA sabe quién eres y se dirige a ti en consecuencia.

## Decisions

- **Lista global + selección por conversación:** las personas se crean una vez y
  se reutilizan; `conversations.player_character_id` guarda la elección de cada
  chat.
- **Sin versiones:** a diferencia de los personajes de IA, editar una persona no
  crea historial (decisión del PM.15).
- **Gestión en Ajustes:** nueva entrada "Personajes jugados" en el grupo
  "Sistema" del sidebar (`/settings/player-characters`), con lista + diálogo de
  crear/editar + borrado con confirmación.
- **Selección en el chat:** cuarto item **"Persona"** en el `DropdownMenu` del
  `SettingsPanel`, con un `Select` (incluye "Ninguna") y un enlace a la pantalla
  de gestión. La tarjeta vive en `player-character-card.tsx` para no engordar el
  panel.
- **Prompt:** `PromptContextBuilder.build(...)` acepta
  `playerCharacter?: { name, description }` y añade una sección
  `## Personaje del usuario` (`El usuario interpreta a {name}. {description}`).
  La resolución (leer el id de la conversación y buscar la persona) se hace en
  los use cases que construyen prompt (`send-message`, `regenerate-reply`,
  `continue-conversation`, `get-prompt-context`) mediante el helper
  `resolve-player-character.ts`.
- **Sin cambios en la UI del chat:** se eligió solo incluirlo en el prompt (sin
  mostrar el nombre sobre los mensajes ni en el header).
- **Ramas:** `branch-conversation` hereda la persona del origen (es parte de la
  configuración local).
- **Borrado seguro:** `conversations.player_character_id` es FK con
  `ON DELETE SET NULL`; borrar una persona deja las conversaciones sin persona.
  Drizzle-kit **omitió** la acción en el `ALTER TABLE ... ADD COLUMN` (limitación
  conocida), así que se corrigió la migración a mano y se verificó con
  `better-sqlite3` que el borrado pone la columna a `NULL`.
- **Fuera de alcance:** exportar/importar personas (son de usuario, no del
  personaje) y el multi-idioma de la pantalla.

## Criterios de aceptación

- [x] Se pueden crear, listar, editar y eliminar personas (nombre +
      descripción) desde Ajustes.
- [x] Cada conversación puede elegir su persona (o "Ninguna") desde los ajustes
      del chat; la elección se persiste y se devuelve en `ConversationDetail`.
- [x] La persona elegida se incluye en el system prompt y la sección se omite si
      no hay persona.
- [x] Borrar una persona no rompe las conversaciones que la usaban.
- [x] Las ramas heredan la persona del chat origen.
- [x] Tests: backend (311) y frontend pasan, y `pnpm check` pasa
      (architecture 4/4, typecheck y lint en los 4 paquetes).

## Commits

1. `feat(shared): player character types`
2. `feat(backend): player character entity, repository and migration`
3. `feat(backend): player character use cases, routes and prompt inclusion`
4. `test(backend): cover player characters and prompt inclusion`
5. `feat(frontend): player characters settings screen`
6. `feat(frontend): pick the player character per conversation`
7. `test(frontend): cover the players screen and selector`
8. `docs(backlog): mark PM.15 as done in S23`
9. `release: bump to v1.14.0 and add changelog entry`
