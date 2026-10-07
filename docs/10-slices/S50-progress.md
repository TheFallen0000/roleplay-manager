# S50 — Convención de hooks y checks de código muerto

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

Se detectó que la convención de hooks era implícita y se cumplía a medias:
`lib/hooks/` mezclaba hooks genéricos con uno de feature
(`use-chat-streaming`, que usa `chat.store` y la API de conversaciones), y la
tabla de nombres de `AGENTS.md` se contradecía. Además, se pidió que
`check:arch` detectara código muerto.

## Decisiones

- **Regla explícita** (documentada en `AGENTS.md` y **verificada**):
  - `lib/hooks/` → hooks **genéricos** (no conocen ninguna feature) + los
    providers que respaldan sus contextos.
  - `components/<feature>/use-<kebab>.ts` → hooks **de la feature** (estado de la
    pantalla + sus llamadas API).
- **Movido**: `use-chat-streaming` → `components/conversation/` (imports a
  `@/lib/...`).
- **Renombrado**: `use-mobile.ts` exporta `useMobile` (antes `useIsMobile`), para
  que el export cuadre con el archivo kebab.
- **Tabla de nombres corregida**: `use-<kebab>.ts` (archivo) / `use<PascalCase>`
  (export).
- **`check:arch` ampliado a 6 checks**:
  1. `lib/hooks/` no puede importar `lib/stores/**`, `lib/api/**`,
     `components/**` ni `pages/**` (resuelve alias `@/` y rutas relativas).
  2. **Archivos huérfanos** en `components/` y `lib/`: todo módulo debe ser
     importado por algo. Los **tests no cuentan** como referencia (un módulo
     usado solo por su test está muerto en producción), las páginas Astro sí
     cuentan como consumidoras, y se contemplan los `import()` dinámicos.
- **Imports sin usar**: ya los detecta ESLint
  (`@typescript-eslint/no-unused-vars` en `error`), así que no se duplica en el
  check de arquitectura.

## Criterios de aceptación

- [x] `use-chat-streaming` vive junto a los componentes de conversación.
- [x] `use-mobile.ts` exporta `useMobile` y `sidebar.tsx` lo usa.
- [x] `AGENTS.md` documenta la regla y la tabla de nombres es coherente.
- [x] `check:arch` tiene 6 checks y falla con hooks de feature y con huérfanos
      (validado con archivos "cebo" temporales).
- [x] El código actual pasa 6/6 (sin falsos positivos) y el código muerto
      existente: ninguno.
- [x] `pnpm check`, tests de backend y frontend, y `pnpm build` en verde.

## Verificación

- `pnpm check:arch` → **6/6** con el código actual.
- Prueba de detección: se crearon `lib/temp-orphan.ts` y
  `lib/hooks/use-temp-feature.ts` (importando el store de chat) → el check falló
  con los dos avisos esperados; al retirarlos volvió a 6/6.
- Gates completos: check, backend, frontend (244) y build.

## Commits

1. `refactor(frontend): move the chat streaming hook next to its components`
2. `refactor(ui): rename useIsMobile to useMobile`
3. `chore(arch): check generic hooks and dead files`
4. `docs(slice): add S50 progress and document the hook convention`
5. `release: bump to v1.32.1 and add changelog entry`
