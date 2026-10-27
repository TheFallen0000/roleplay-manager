# S97 — Actualizaciones seguras de dependencias

**Estado:** Completado (v1.54.2)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Revisión de los PRs agrupados de Dependabot **#66** y **#67**. Ambos mezclaban
actualizaciones patch/minor con cambios mayores y el CI estaba en rojo, así que
se separa lo seguro de las migraciones que necesitan su propio slice.

S97 aplica:

- React 19.3, `lucide-react` 1.61, `@base-ui/react` 1.9, `@shadcn/react` 0.3,
  Radix Slot 1.5, `zustand` 5.0.16, `sonner` 2.0.8, `tailwind-merge` 3.7,
  `react-easy-crop` 6.2.4, las fuentes de Fontsource y Starlight 0.42.7.
- Prettier 3.9, `prettier-plugin-tailwindcss` 0.8.1, `turbo` 2.11, la CLI de
  `shadcn` 4.22, los patches de Testing Library, `jsdom` 30.1.3, `tsx` 4.23,
  ESLint 10.13 y `typescript-eslint` 8.72 (resueltos por el lockfile).
- Overrides de seguridad para `undici` 8.12.3 (solo bajo `unifont`),
  `source-map-js` 1.2.2 y `postcss-selector-parser` 7.1.7.
- Dependabot agrupa solo patch/minor; los majors llegan en PRs individuales.

## Decisiones

- **No mergear #66 completo:** Express 5 convierte `req.query` en una propiedad
  de solo lectura. El middleware `validate` la reasigna y los tests de `/logs`
  devuelven 500. La migración de Express 5 necesita revisar routing, parsing,
  errores y todas las rutas.
- **No mergear #67 completo:** `astro check` no soporta TypeScript 7 y aborta
  el typecheck del website. `@types/node` 26 tampoco corresponde con el runtime
  Node 24 que empaqueta la app.
- **Patch/minor ahora, majors por slices:** mantiene el CI verde y reduce el
  riesgo de mezclar una migración de runtime con decenas de cambios pequeños.
- **Overrides de seguridad:** el lockfile de `master` seguía resolviendo
  `undici` 8.9.0, `source-map-js` 1.2.1 y `postcss-selector-parser` 7.1.4.
  Los overrides fijan las versiones parcheadas y dejan el motivo escrito en
  `pnpm-workspace.yaml`. `undici` se limita a `unifont` para no forzar la
  versión 8 sobre la CLI de `shadcn`, que usa la 7.
- **Dependabot:** los grupos por tipo de dependencia mezclaban majors con
  patches. Ahora los grupos son `production-patch-minor` y
  `development-patch-minor`; los majors quedan fuera y se revisan uno a uno.
- **TypeScript 7 bloqueado:** Astro pide TypeScript 6 explícitamente. Se ignora
  el major hasta que Astro actualice su checker o adopte
  `@astrojs/ts-content-mapper`.
- **@types/node 26 bloqueado:** los tipos deben seguir el major del runtime
  empaquetado (Node 24).
- **Fuera de alcance:** Express 5, `better-sqlite3` 13, `pino` 10 /
  `pino-http` 11 / `pino-pretty` 13, `uuid` 14 y `prettier-plugin-astro` 1.x.
  Quedan como PM.46–PM.50 en el backlog.

## Criterios de aceptación

- [x] #66 y #67 revisados y diagnosticados.
- [x] Actualizaciones patch/minor aplicadas.
- [x] `pnpm audit --prod` sin vulnerabilidades conocidas.
- [x] Dependabot agrupa solo patch/minor y los majors llegan individuales.
- [x] TypeScript 7 y `@types/node` 26 ignorados con rationale.
- [x] `pnpm install --frozen-lockfile`, `pnpm check`, tests y build en verde.
- [x] Paquete Linux con smoke test completo.
- [x] Playwright sobre el paquete: sin errores de consola ni violaciones CSP.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **624** tests (109 archivos).
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- `pnpm install --frozen-lockfile`: OK.
- `pnpm audit --prod`: **0 vulnerabilidades**.
- Paquete Linux y smoke test: PASS.
- Playwright/Chromium sobre el paquete: home, alta de personaje, proveedores,
  tutoriales (incluido diálogo) y chat; **0 errores de consola** y **0
  violaciones CSP**.

## Commits

1. `5c9f2d6 chore(deps): apply safe patch and minor updates`
2. `3de43d8 chore(ci): group Dependabot patch/minor updates`
3. `docs(slice): document S97 dependency maintenance` (this commit)
