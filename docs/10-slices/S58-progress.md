# S58 — README bilingüe y metadatos del repositorio

**Estado:** Completado
**Inicio:** 2026-10-08
**Fin:** 2026-10-08

## Descripción

El README no reflejaba el estado real del proyecto (solo describía el desarrollo,
sin instalación para usuarios finales, sin acceso telefónico, actualizaciones ni
paquetes). Se reescribe al estilo del repo `rea`: cabecera centrada con mascota,
selector de idioma y badges, y contenido completo. Además se actualizan los
metadatos de GitHub (descripción y topics) y detalles obsoletos de
`CONTRIBUTING.md`.

## Decisiones

- **Dos idiomas**: `README.md` en inglés (por defecto, para descubrimiento) con
  conmutador a `README.es.md` (español), siguiendo el patrón de `rea`.
- **Estructura**: cabecera centrada (mascota `brand/mascot-192.png`, 10 KB, +
  badges de licencia, última release, workflow de release, plataformas y Node),
  intro, funciones, instalación para usuarios (tabla con los 5 paquetes de
  Release), desarrollo, estructura, scripts, proveedor, acceso telefónico,
  actualizaciones, documentación, licencia, contribuir y reportar bugs.
- **Sin capturas** (no se pueden tomar de forma automatizada): la mascota hace de
  hero; una captura real de la app se puede incrustar después.
- **Metadatos de GitHub**:
  - **Descripción** (323/350 caracteres) — **aplicada** vía API con la credencial
    de git del usuario (token clásico del dueño del repo, admin).
  - **Topics** (18) — **no aplicables por API**: `PATCH /repos/...` responde 200
    y aplica la descripción, pero devuelve `"topics":[]` y los ignora
    silenciosamente (probado con `Invoke-RestMethod` y `curl.exe`, con el media
    type clásico `mercy-preview`, un solo topic y la lista completa). Con el
    dueño del repo, permisos admin, `repo` scope y topics válidos, es una
    restricción de GitHub sobre la cuenta. Queda pendiente intentarlo desde la
    web (About → ⚙️ → Topics) y reintentar más adelante.
- **`CONTRIBUTING.md`**: corregido el puerto del backend (3000 → 3001) y la
  versión de pnpm del bloque corepack (11.15.1 → 11.21.0, la del
  `packageManager`).

## Criterios de aceptación

- [x] `README.md` (EN) y `README.es.md` (ES) con conmutador mutuo y contenido
      actualizado (instalación de usuario, funciones, teléfono, actualizaciones).
- [x] Descripción del repositorio aplicada en GitHub.
- [x] Detalles obsoletos de `CONTRIBUTING.md` corregidos.
- [ ] Topics aplicados (bloqueado por GitHub; se reintentará desde la web).

## Verificación

- Gates no aplican (docs), pero se mantiene `pnpm check` verde y el flujo de
  release publica los paquetes con normalidad.
- Metadatos: `GET /repos/...` devuelve la descripción de 323 caracteres ✓;
  topics siguen vacíos tras 4 intentos documentados.

## Commits

1. `docs: rewrite the README in English and Spanish`
2. `docs(slice): add S58 progress`
3. `release: bump to v1.36.2 and add changelog entry`
