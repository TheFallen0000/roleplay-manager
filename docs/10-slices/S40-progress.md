# S40 — Entrypoint de un solo proceso (PM.24-A)

**Estado:** Completado
**Inicio:** 2026-10-07
**Fin:** 2026-10-07

## Descripción

El build de producción puede servir **la UI y la API en un solo proceso y un
solo puerto**: el servidor de Astro se construye en modo `middleware` y el
backend (Express) lo monta. Es la fase A del empaquetado (PM.24) y el
prerrequisito del paquete portátil.

## Decisiones

- **Astro en modo `middleware`**: el backend monta su `handler` **después** de
  las rutas `/api`, de modo que la API siempre gana y los errores de API siguen
  llegando al error handler. En desarrollo nada cambia (`astro dev` + backend
  por separado); `astro preview` no está soportado en este modo.
- **Hallazgo del E2E**: en modo middleware Astro **no sirve su build estático**
  (`favicon`, `/_astro/*`); lo debe servir el anfitrión. Sin esto la app quedaba
  sin CSS/JS. El backend monta `express.static(clientDir)`.
- **Configuración**: `WEB_HANDLER_PATH` (handler construido) y `WEB_CLIENT_DIR`
  (por defecto `../client` respecto al handler).
- **Base de la API en SSR configurable en runtime** con `PUBLIC_API_URL`, para
  que el proceso único funcione en cualquier puerto; en el navegador las
  llamadas siguen siendo relativas (mismo origen).
- **Puerto**: el proceso único escucha en el puerto del backend (3001 por
  defecto), así las llamadas SSR a `http://localhost:3001` apuntan a sí mismo.

## Criterios de aceptación

- [x] Un solo proceso sirve la página de la app y la API.
- [x] `/api` tiene prioridad sobre el handler de Astro (y los errores van al
      error handler).
- [x] Assets estáticos y hasheados servidos por el anfitrión.
- [x] SSR con la base de API fijada en runtime.
- [x] Subidas multipart en el mismo origen.
- [x] `pnpm check` sin warnings; backend (421) y frontend (238) en verde.
- [x] `pnpm build` correcto.

## Verificación E2E (resumen)

Proceso único real con base temporal: home 200, `/api/health` 200, `favicon.svg`
y `/_astro/base.*.css` 200, creación de personaje 201 en el mismo origen, página
SSR con el personaje, subida multipart 201 y 404 de Astro para rutas
desconocidas.

## Commits

1. `feat(backend): serve the Astro app in the same process`
2. `feat(frontend): build the app in middleware mode`
3. `test(server): cover the web handler mounting and static assets`
4. `docs(slice): add S40 progress and update PM.24`
5. `release: bump to v1.28.0 and add changelog entry`
