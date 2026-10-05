# S24 — Infraestructura i18n + piloto (PM.11, fase 1)

**Estado:** Completado
**Inicio:** 2026-08-12
**Fin:** 2026-08-12

## Descripción

Primera fase del multi-idioma (PM.11): la infraestructura de traducción y un
piloto que valida el patrón. El idioma por defecto pasa a ser **inglés**, con
español como opción. Se migran el shell/nav, la lista de personajes y la
pantalla de personajes jugados; el resto de pantallas se migrará en S25 y la
pantalla de bienvenida/menubar en S26 (PM.13/PM.14).

## Decisions

- **Enfoque propio y tipado** (opción B): diccionarios TS en
  `packages/shared/src/i18n/` (`locales/en.ts` como base, `locales/es.ts`
  tipado con `Dictionary`), `translate()` puro, `DotPaths` para claves
  tipadas y paridad EN/ES garantizada en compilación (y con un test).
- **Namespaces** en esta fase: `common`, `nav`, `theme`, `language`,
  `characters`, `players`, `errors`.
- **Plurales ligeros**: nodos `{ one, other }` resueltos con `count` (sin
  librería; en/es solo necesitan singular/plural).
- **Idioma en cookie + SSR**: `base.astro` lee la cookie `language` y la pasa
  como `initialLocale` a `AppShell`; `<html lang>` sale correcto desde el
  servidor. `setLocale` actualiza estado + `localStorage` + cookie. Las páginas
  que estaban prerenderizadas (`index`, `characters/new`, `settings/providers`,
  `player-characters`) pasan a `prerender = false` para poder leer cookies (el
  adapter Node ya estaba). Sin mismatch de hidratación ni flash de idioma.
- **Islas de Astro**: cada `client:load` es un **árbol React independiente** y el
  contexto no cruza islas. Por eso las islas que traducen (`CharacterList`,
  `PlayerCharacterManager`) reciben `locale` por prop y se envuelven en su
  propio `I18nProvider`; y `setLocale` **recarga la página** (cookie) para que
  todas las islas se rendericen en el idioma nuevo. El helper `resolveLocale`
  resuelve la cookie en cada página.
- **Provider/hook separados** (`i18n-provider.tsx` + `use-translation.ts`) por
  `react-refresh`, igual que el tema.
- **Errores del backend por código**: helper `translateApiError(error, tRaw,
  fallback)` que resuelve `errors.<CODE>` y cae al `message` crudo. El backend
  no se toca.
- **Selectores**: `LanguageSwitcher` nuevo junto al `ThemeSwitcher`; las
  etiquetas de tema/modo pasan de strings a claves i18n (`labelKey`).
- **El paquete `ui` no se toca** (no tenía strings de usuario).
- **Fuera de alcance**: resto de pantallas y títulos de páginas (S25), prompt
  del LLM (decisión aparte) y PM.13/PM.14 (S26).

## Criterios de aceptación

- [x] Existe un núcleo i18n tipado en `shared` con paridad EN/ES garantizada.
- [x] El provider aplica el idioma, lo persiste (localStorage + cookie) y
      actualiza `<html lang>`.
- [x] El servidor renderiza `<html lang>` según la cookie (verificado: sin
      cookie `en`, con `language=es` → `es`).
- [x] Selector de idioma en el header junto al tema.
- [x] Shell/nav, lista de personajes y pantalla de personas traducidos.
- [x] Los errores del backend se muestran traducidos por código con fallback.
- [x] Tests: paridad de claves, `translate` (interpolación, plurales,
      fallback), provider (persistencia, cookie, `lang`) y `translateApiError`.
      Frontend y `pnpm check` pasan.
- [x] SSR verificado: sin cookie `lang="en"` y con `language=es` → `lang="es"`,
      con el contenido traducido y sin errores en el log del servidor.

## Commits

1. `feat(shared): typed i18n core with en/es dictionaries`
2. `feat(frontend): i18n provider, locale cookie and language switcher`
3. `feat(frontend): translate shell, character list and players screen (pilot)`
4. `feat(frontend): translate API errors by code`
5. `test(frontend): cover i18n core, provider and pilot screens`
6. `docs(backlog): note PM.11 phase 1 in S24`
7. `release: bump to v1.15.0 and add changelog entry`
