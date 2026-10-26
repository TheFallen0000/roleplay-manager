# S2 - Gestion de personajes + shell de la app

**Estado:** Completado (plan histórico; ver nota de revisión).
**Slice:** S2 (ver `docs/08-workflow.md`).
**Entregable:** el usuario puede crear, listar, editar y eliminar personajes. Cada edicion genera una nueva `CharacterVersion` sin afectar a conversaciones (las conversaciones son S3). Mas: el `index.astro` deja de ser la pantalla del template y muestra la lista de personajes con boton "+ Crear personaje". Existe un layout global con Sidebar retraible que aloja las paginas de la app.

> **Nota de revisión (2026-10-26):** este documento es el plan original de S2;
> el slice se completó. La tabla «Estado de avance» se conserva como histórico y
> no refleja el estado actual. El único seguimiento vivo es la vista de historial
> y comparación de versiones, promovida a **PM.37**.

## Decisiones confirmadas

1. **`CreateCharacter` en S2 NO crea Conversation ni Message** — solo crea `Character` + primera `CharacterVersion` + cards. La creacion automatica de conversacion + greeting se difiere a S3. (Doc `create-character.md` se actualiza con una nota al respecto.)
2. **`GET /api/characters` se anade a la API REST** — el doc 07 solo listaba `POST` y `GET /:id`. Se aniade la ruta de listado con su caso de uso `ListCharacters`.
3. **`subtitle` es opcional** en `CharacterVersion` (consistente con la DB nullable). El formulario no lo marca como required. Si llega vacio, se guarda `null`.
4. **`version-history.tsx` y la vista de comparacion NO se incluyen en S2** — solo se implementa el endpoint `GET /api/characters/:id/versions` (devuelve array de versiones). El componente UI se difiere a una iteracion posterior.
5. **Estado de frontend en S2: `useState` local por componente.** Zustand queda para S4 (donde el chat necesita estado global). El `provider-manager.tsx` de S1 ya usa `useState` puro y se mantiene asi.
6. **Reordenamiento de cards en S2: flechas arriba/abajo** (subir/bajar `position`). Drag&drop se difiere a S9 segun lo acordado.

## Decisiones heredadas de docs y S0/S1

- DB schema completa de S0: `characters`, `character_versions`, `character_cards` con cascade y FK. No hace falta nueva migracion.
- API REST base en 07 (anadir `GET /api/characters` y `GET /api/characters/:id/versions`).
- Patron hexagonal: entidad + puerto + repo Drizzle + caso de uso + controller + ruta + API client + pagina. Igual que S1.
- UUID v7 para IDs (generado en la capa de aplicacion).
- Versionado inmutable: `UpdateCharacter` no muta la version existente; crea una nueva con `versionNumber` incremental.
- shadcn `sidebar` no esta instalado: se anade via `pnpm dlx shadcn@latest add sidebar` (arrastra `sheet`, `tooltip`, `breadcrumb`).
- Componentes shadcn a anadir: `sidebar` (con deps), `avatar`, `textarea`, `dialog`/`alert-dialog`, `scroll-area`, `tabs`, `tooltip`. Total estimado tras S2: ~20 componentes.

## Pasos en orden

### Fase 1 - Tipos compartidos

1. `packages/shared/src/types/character.ts` (nuevo): DTOs y payloads.

### Fase 2 - Backend dominio

2. `packages/backend/src/domain/entities/character.entity.ts` (nuevo).
3. `packages/backend/src/domain/entities/character-version.entity.ts` (nuevo).
4. `packages/backend/src/domain/entities/character-card.entity.ts` (nuevo).
5. `packages/backend/src/domain/ports/character.repository.ts` (modificar stub): interface `CharacterRepository` real.

### Fase 3 - Backend infraestructura

6. `packages/backend/src/infrastructure/adapters/secondary/drizzle/repositories/drizzle-character.repository.ts` (nuevo): implementacion del puerto, `createWithFirstVersion` en transaccion Drizzle.
7. `packages/backend/src/infrastructure/adapters/primary/middlewares/error-handler.ts` (modificar): anadir `CHARACTER_NOT_FOUND`, `NO_CHANGES_DETECTED`, `CHARACTER_VALIDATION_ERROR` mapeados a HTTP.

### Fase 4 - Backend casos de uso

8. `CreateCharacterUseCase` (+test).
9. `GetCharacterUseCase` (+test).
10. `ListCharactersUseCase` (+test).
11. `UpdateCharacterUseCase` (+test).
12. `DeleteCharacterUseCase` (+test).
13. `ListCharacterVersionsUseCase` (+test).

### Fase 5 - Backend controllers + container

14. `routes/character.routes.ts` (nuevo): 7 endpoints con Zod.
15. `containers/app-container.ts` (modificar): wirear `DrizzleCharacterRepository` + 6 use cases.
16. `infrastructure/adapters/primary/server.ts` (modificar): montar `/api/characters`.

### Fase 6 - Frontend - shadcn

17. `pnpm dlx shadcn@latest add sidebar avatar textarea dialog scroll-area tabs` desde `packages/ui/`.

### Fase 7 - Frontend - layout

18. Renombrar `main.astro` -> `base.astro` (alineado con 07).
19. `base.astro` integra `<Sidebar>` retraible con `SidebarGroup` "Sistema" (link a Settings) y "Personajes" (link a `/`).
20. Migrar `settings/providers.astro` a usar `base.astro`.

### Fase 8 - Frontend - API client

21. `packages/frontend/src/lib/api/characters.ts` (nuevo).

### Fase 9 - Frontend - componentes de personaje

22. `src/components/character/character-list.tsx` (nuevo).
23. `src/components/character/character-form.tsx` (nuevo) con Tabs "General" y "Tarjetas".
24. `src/components/character/character-card.tsx` (nuevo) para la lista.

### Fase 10 - Frontend - paginas

25. Reescribir `pages/index.astro` con `<CharacterList client:load />` + boton "+ Crear personaje".
26. `pages/characters/new.astro` (nuevo).
27. `pages/characters/[id].astro` (nuevo) modo edicion.

### Fase 11 - Actualizar docs

28. `docs/07-technical-architecture.md`: anadir `GET /api/characters` a la tabla REST.
29. `docs/05-use-cases/character/create-character.md`: nota S3 para Conversation/Message.
30. `docs/10-slices/S2-progress.md`: marcar todo como completado.

### Fase 12 - Verificacion

31. `pnpm install` (por deps de sidebar).
32. `pnpm --filter @workspace/backend db:generate` — confirmar que no hay migracion nueva.
33. Arrancar backend + frontend, curl endpoints, navegar `/`, `/characters/new`, `/characters/:id`, `/settings/providers`.
34. `pnpm typecheck`, `pnpm lint`, `pnpm --filter @workspace/backend test`.

### Fase 13 - Commit

35. Commit `S2: Gestion de personajes + shell con sidebar`.

## Estado de avance

| Paso | Estado | Notas |
|---|---|---|
| 1. shared types/character.ts | pendiente | |
| 2-4. entidades del dominio | pendiente | |
| 5. port character.repository.ts | pendiente | |
| 6. DrizzleCharacterRepository | pendiente | |
| 7. error-handler | pendiente | |
| 8-13. 6 use cases + tests | pendiente | |
| 14-16. routes + container + server | pendiente | |
| 17. shadcn add (7+ componentes) | pendiente | |
| 18-20. base.astro + sidebar + migrar providers | pendiente | |
| 21. lib/api/characters.ts | pendiente | |
| 22-24. character-list, character-form, character-card | pendiente | |
| 25-27. pages (index rewrite, characters/new, characters/[id]) | pendiente | |
| 28-29. actualizar docs | pendiente | |
| 30-34. verificacion | pendiente | |
| 35. commit S2 | pendiente | |

## Notas adicionales

- `subtitle` opcional: la DB ya lo permite nullable, el Zod acepta `string | null | undefined`, el formulario no lo marca como required.
- Las cards vacias (title o content vacio) se rechazan a nivel de Zod en el caso de uso, no se persisten.
- La creacion de la conversacion inicial + greeting (pasos 6-8 de `create-character.md`) queda diferida a S3.
- El `versionNumber` de la primera version es siempre 1; las nuevas versiones son incrementales.
- En el form, los botones de las cards son: flecha arriba, flecha abajo, switch active, boton eliminar.
- Astro MCP disponible si surgen dudas con SSR/React islands en el shell con sidebar.
- shadcn skill cargada — la consultare al anadir sidebar para los patrones de SidebarGroup, SidebarItem, etc.
