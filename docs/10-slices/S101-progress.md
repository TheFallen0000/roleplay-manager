# S101 — prettier-plugin-astro 1.x

**Estado:** Completado (v1.54.6)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Cierre de PM.50: migración de `prettier-plugin-astro` 0.14.1 a **1.1.2**, la
reescritura del plugin sobre el compilador Rust de Astro 7.

S101 incluye:

- `prettier-plugin-astro` 1.1.2 en la raíz.
- `astroCompressHTML: "jsx"` en `.prettierrc`, alineado con el
  `compressHTML: "jsx"` que Astro 7 usa por defecto.
- Reformateo de **27 archivos `.astro`** entre `packages/frontend` y
  `packages/website`.
- Verificación de que el texto renderizado del sitio no cambia.

## Decisiones

- **Plugin 1.x sobre Astro 7:** la versión 1.0 se reescribió sobre el compilador
  Rust de Astro 7 y requiere Node >=22.12; el proyecto usa 24.22.1. Esto elimina
  los problemas históricos del plugin con expresiones y elementos condicionales.
- **`astroCompressHTML: "jsx"`:** el plugin 1.x necesita saber qué whitespace
  colapsa el compilador para que reformatear no cambie lo que se renderiza.
  Astro 7 usa `'jsx'` por defecto; se fija explícitamente para no depender de un
  cambio futuro de default.
- **`astroAllowShorthand` sin tocar:** se deja sin definir para conservar los
  atributos tal como están escritos (`value={value}` no se convierte a
  `{value}`).
- **Solo formateo:** no hay cambios de componentes, estilos, lógica ni
  configuración de Astro.
- **Verificación contra el sitio desplegado:** se comparó el texto renderizado
  del build local con el sitio público v1.54.5 en `/`, `/es/`, `/download`,
  `/es/download`, `/docs/` y `/es/docs/`; es idéntico.
- **Fuera de alcance:** TypeScript 7 / `@types/node` 26 (PM.49), bloqueados por
  `astro check` y por el runtime Node 24.

## Criterios de aceptación

- [x] `prettier-plugin-astro` actualizado a 1.1.2.
- [x] `astroCompressHTML: "jsx"` configurado.
- [x] Los 27 `.astro` reformateados; `prettier --check` pasa.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] Paquete Linux y smoke test completos.
- [x] UI empaquetada con Playwright: sin errores de consola ni CSP.
- [x] Texto del sitio idéntico al desplegado en las seis páginas comparadas.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.
- [x] PM.50 marcado como hecho en el backlog.

## Verificación

- Backend: **627** tests (110 archivos).
- Frontend: **335** tests (56 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- Paquete Linux y smoke test: PASS, incluido backup online.
- Playwright/Chromium sobre el paquete: home, alta de personaje, proveedores,
  tutoriales (diálogo) y chat; **0 errores de consola, 0 violaciones CSP**.
- Sitio: texto renderizado idéntico al sitio público v1.54.5 en `/`, `/es/`,
  `/download`, `/es/download`, `/docs/` y `/es/docs/`; **0 errores de consola**.
- `pnpm audit --prod`: **0 vulnerabilidades**.

## Commits

1. `556d02f chore(format): upgrade prettier-plugin-astro to 1.x`
2. `docs(slice): document S101 prettier-plugin-astro 1.x` (this commit)
