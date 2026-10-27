# S91 — Drizzle ORM 0.45 y drizzle-kit 0.31

**Estado:** Completado (v1.51.1)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Actualización aislada de la capa de persistencia para cerrar la vulnerabilidad
alta de Drizzle ORM y dejar la herramienta de migraciones al día:

- `drizzle-orm` 0.36.4 → **0.45.4**
- `drizzle-kit` 0.28.1 → **0.31.11**

No se añaden tablas, columnas ni migraciones nuevas. El esquema y el historial
de migraciones existente siguen siendo la fuente de verdad.

## Decisiones

- **Sin migración de datos:** el cambio es solo de dependencias. El esquema
  declarado en los archivos de Drizzle ya genera exactamente las migraciones
  0000–0015.
- **Validación del historial:** `drizzle-kit generate` responde «No schema
  changes» y `drizzle-kit check` valida la secuencia. No se reescriben snapshots
  ni el journal.
- **Migrador probado en dos vías:** el test de rendimiento sigue aplicando las
  migraciones con el migrador de runtime de `drizzle-orm/better-sqlite3`, y
  además se ejecutó `drizzle-kit migrate` sobre una base temporal para validar
  la herramienta de desarrollo.
- **Sin cambios de API:** los repositorios, puertos y DTOs no cambian. Drizzle
  0.44 introduce `DrizzleQueryError`, pero no tenemos manejo específico de
  errores de base de datos que dependa de la forma anterior.
- **Fuera de alcance:** Zod 4, OpenAI 7 y Vitest 5 (S92), paginación (S93) y
  cualquier cambio de esquema.

## Criterios de aceptación

- [x] `drizzle-orm` actualizado a 0.45.4.
- [x] `drizzle-kit` actualizado a 0.31.11.
- [x] Typecheck del backend sin cambios de código.
- [x] `db:generate` no detecta cambios de esquema.
- [x] `drizzle-kit check` valida las migraciones.
- [x] Las migraciones se aplican en una base temporal con el migrador de
      runtime y con `drizzle-kit migrate`.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] Paquete portátil generado y smoke test completo en verde.
- [x] `pnpm audit --prod` ya no muestra la vulnerabilidad de Drizzle.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **606** tests (104 archivos).
- Frontend: **329** tests (54 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- `drizzle-kit generate`: «No schema changes, nothing to migrate».
- `drizzle-kit check`: «Everything's fine».
- `drizzle-kit migrate` sobre `/tmp`: migraciones aplicadas y el índice
  `messages_conversation_position_idx` presente.
- Paquete Linux generado con el código de S91 (versión local 1.51.0):
  smoke test completo con el runtime incluido.
- `pnpm audit --prod`: de **6 altas** a **5 altas**; quedan Zod, Undici y
  dependencias de build de Astro para S92.

## Commits

1. `2acf886 chore(deps): upgrade Drizzle ORM and drizzle-kit`
2. `docs(slice): add S91 progress and upgrade notes` (this commit)
