# S69 — Registro del sistema: archivo rotado y visor

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

Los logs solo iban a consola: en la app empaquetada se veían en la ventana del
lanzador y se perdían al cerrarla, sin archivo ni forma de consultarlos. Ahora
pino escribe **`data/logs/app.N.log`** con rotación por tamaño (5 MB × 5 +
activo ≈ 30 MB), **redactando credenciales**, y la app tiene un visor
(**Sistema → Registro**) con filtro por nivel, refresco manual y automático,
copiar y descargar el histórico.

## Decisiones

- **Formato y transporte**: se mantiene pino (líneas JSON) y se añade
  `pino-roll` como destino de archivo, con la consola en paralelo. Nivel: el de
  `LOG_LEVEL` (por defecto `debug`, acotado por la rotación).
- **Redacción**: `authorization`, `cookie`, `x-api-key` y `set-cookie` se
  censuran como `[redacted]` (los serializers de `pino-http` registran
  cabeceras por defecto).
- **Ubicación**: `<DATA_DIR>/logs` (por defecto `data/logs`), configurable con
  `LOG_DIR`; viaja con la carpeta portátil y las actualizaciones no la tocan.
- **Lector** (`FileLogReader`): visita los archivos de más nuevo a más viejo,
  parsea cada línea JSON (tolerando líneas parciales), filtra por **nivel
  mínimo** y devuelve las últimas N entradas; `listFiles()` (más antiguo
  primero) alimenta la descarga en texto plano.
- **API**: `GET /api/logs?limit=&level=` y `GET /api/logs/download`
  (attachment). Validación con zod; casos de uso finos sobre el puerto
  `LogReader`.
- **Visor**: página nueva en Sistema con filtro por nivel (Todo / Info+ /
  Avisos+ / Errores), auto-refresco cada 5 s, copiar las entradas visibles y
  descargar el histórico. El estado vive en un store de zustand porque el lint
  del repo prohíbe `setState` sincrónico dentro de efectos de componentes.
- **Empaquetado (hallazgo durante el slice)**: al usar transports, el bundle
  ESM fallaba con `__dirname is not defined` y, además, el worker de pino
  resuelve `pino-roll` por nombre en runtime. Solución: `pino` pasa a
  **external** en `build.mjs` (como `pino-pretty`) y el empaquetado instala
  `pino` + `pino-roll` en el `app/`. El smoke test ahora verifica que el archivo
  de logs se escribe dentro de la carpeta portátil.

## Criterios de aceptación

- [x] Los logs se guardan rotados en `data/logs` y siguen viéndose en consola.
- [x] Credenciales y cookies censuradas en el archivo.
- [x] `GET /api/logs` (con filtro y límite) y `GET /api/logs/download` funcionan.
- [x] Visor en Sistema → Registro con filtro, refresco, copiar y descargar.
- [x] La app empaquetada arranca con el nuevo logging y el smoke test lo
      comprueba.
- [x] Gates, tests, build y smoke en verde; release v1.42.0.

## Verificación

- Tests nuevos: lector (cola, filtro por nivel mínimo, límite, archivos
  rotados, líneas corruptas, carpeta ausente), logger (redacción real con
  `SECRET123`/`SECRET456` en un directorio temporal), casos de uso, rutas
  (filtro, 400 con nivel inválido, descarga con cabeceras, 404 sin archivos),
  store y panel (render, filtro, copiar, error).
- E2E con el paquete empaquetado: petición con
  `Authorization: Bearer TOP-SECRET-TOKEN-123` y cookie falsa → **no aparecen**
  en `data/logs/app.1.log` y sí `[redacted]`; `/api/logs` devuelve entradas;
  la descarga responde `text/plain` como attachment; Playwright abre el visor y
  muestra 60 entradas (captura revisada).
- Smoke test actualizado (`rotating log file written inside the portable
  folder` ✓): antes del arreglo de empaquetado la app **ni arrancaba**.

## Commits

1. `feat(backend): rotate application logs to disk with credential redaction`
2. `feat(frontend): add the in-app log viewer`
3. `fix(packaging): ship pino and its transport with the app`
4. `test(packaging): check the rotating log file in the smoke test`
5. `docs(slice): add S69 progress and document the logs`
6. `release: bump to v1.42.0 and add changelog entry`
