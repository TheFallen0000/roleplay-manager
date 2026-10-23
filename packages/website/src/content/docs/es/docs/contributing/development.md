---
title: Desarrollo
description: Corré el monorepo de Roleplay Manager, los tests y los controles de calidad.
---

## Requisitos

- Node.js ≥ 22.12.0.
- pnpm ≥ 11.15.1. El script de instalación puede configurarlo con corepack.

## Arrancar la app

```bash
./scripts/install.sh
./scripts/start.sh
```

En Windows:

```bat
scripts\install.bat
scripts\start.bat
```

El frontend corre en `http://localhost:4321` y hace proxy de `/api` al backend
en `http://localhost:3001`.

Instalación manual:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install
pnpm dev
```

## Controles de calidad

```bash
pnpm check:arch   # reglas de arquitectura
pnpm check        # arquitectura + typecheck + lint
pnpm --filter @workspace/backend test
pnpm --filter @workspace/frontend exec vitest run
```

`pnpm check:arch` verifica el límite de tamaño del frontend, los límites
hexagonales del backend, la pureza de `lib/` y del paquete `shared`, los hooks
genéricos, los archivos muertos y el aislamiento entre features. Leé `AGENTS.md`
para las reglas completas.

## Estructura

| Paquete             | Propósito                                               |
| ------------------- | ------------------------------------------------------- |
| `packages/backend`  | API Express + Drizzle + SQLite. Arquitectura hexagonal. |
| `packages/frontend` | UI Astro + React.                                       |
| `packages/shared`   | Tipos y utilidades sin framework.                       |
| `packages/ui`       | Componentes reutilizables de shadcn/ui.                 |
| `packages/website`  | Este sitio público (Astro + Starlight).                 |

## Contribuir

Leé `CONTRIBUTING.md` y abrí un pull request. `master` está protegida; el CI
tiene que pasar antes de mergear. Usá commits convencionales y cambios chicos.

- [Repositorio](https://github.com/TheFallen0000/roleplay-manager)
- [Guía de contribución](https://github.com/TheFallen0000/roleplay-manager/blob/master/CONTRIBUTING.md)
- [Licencia](https://github.com/TheFallen0000/roleplay-manager/blob/master/LICENSE)
