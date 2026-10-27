# S89 — Hotfix de seguridad y Node 24.22.1

**Estado:** Completado (v1.50.1, follow-up v1.50.2)
**Inicio:** 2026-10-27
**Fin:** 2026-10-27

## Descripción

Auditoría de seguridad y calidad seguida de un hotfix acotado. El slice cierra
la fuga de claves de proveedor por la API, actualiza el runtime de Node a la
última LTS parcheada, corrige la cadena de Express afectada por CVEs y añade
verificación de integridad al actualizador de paquetes.

El objetivo de Node es **24.22.1 LTS**; el mínimo soportado para desarrollar es
**22.23.4**, la primera versión de la línea 22 con los parches de octubre.

## Decisiones

- **Node fijado en `.nvmrc`:** `24.22.1` lo usan la máquina local, CI, release,
  deploy del sitio y el runtime que se copia al paquete portátil. Los workflows
  leen `node-version-file: ".nvmrc"` para no duplicar la versión.
- **Guard de empaquetado:** `scripts/package.mjs` aborta si el Node que ejecuta
  el script no coincide con `.nvmrc`, porque el ZIP copia `process.execPath` y
  de lo contrario podría publicar un runtime vulnerable.
- **Mínimo de `engines`:** `>=22.23.4`; la documentación recomienda la versión
  fijada en `.nvmrc`.
- **DTO público sin secretos:** `ProviderInstance` ya no incluye `apiKey`. El
  repositorio y el registry interno usan `ProviderInstanceRecord`, y los casos
  de uso `list`, `create` y `update` mapean con `toProviderInstanceDTO`. La UI
  sigue usando `hasApiKey` para saber si hay clave guardada.
- **Sin migración de datos:** las claves siguen en SQLite; solo dejan de salir
  por HTTP. El cifrado en reposo queda fuera de alcance.
- **Cadena de Express:** `express` 4.22.3 con `body-parser` 1.20.9,
  `proxy-addr` 2.0.8 y `qs` 6.16.1. Se actualizan dentro de la línea 4 para no
  asumir la migración a Express 5.
- **Dependencias de UI:** `shadcn` (CLI) y `zod` (sin uso) salen de las
  dependencias de producción de `packages/ui`; la CLI sigue disponible como
  devDependency en la raíz.
- **Astro al día:** se actualiza a 7.4.2 (y `@astrojs/node` 11.1.9,
  `@astrojs/react` 7.1.1) porque las versiones anteriores arrastraban avisos
  altos de `vite`, `devalue`, `undici` y `postcss` en el árbol de producción.
- **Actualizador fail-closed:** la release publica `SHA256SUMS`; el updater
  exige el asset, compara el hash del paquete y rechaza releases sin checksum.
  Además valida que el tag sea una versión semántica y que el archivo no
  contenga rutas fuera de `versions/<version>/`.
- **Sin firma criptográfica todavía:** el checksum detecta descargas corruptas
  o manipuladas en tránsito, pero no sustituye a una firma de la release. Se
  deja como mejora futura junto con la firma de binarios.
- **Escáner de dependencias:** Astro 7.4.2 dejó ejemplos JSDoc con imports
  (`import type ... from "astro"`) dentro de los chunks del servidor. El
  escáner los confundía con imports reales y empaquetaba Astro y su toolchain
  de build: el primer paquete de v1.50.1 pesó ~95 MB. v1.50.2 ignora los
  comentarios de bloque antes de escanear y vuelve a ~63 MB.
- **Fuera de alcance:** Drizzle 0.45, Zod 4/OpenAI 7 y Vitest 5 (S90/S91),
  índices y N+1 (S90), autenticación de acceso remoto, CSP/helmet y cifrado de
  la base de datos.

## Criterios de aceptación

- [x] `GET /api/provider-instances` no devuelve `apiKey` en listar, crear ni
      actualizar.
- [x] La clave sigue disponible solo para el adaptador del proveedor.
- [x] El formulario de instancia no escribe la clave en la consola.
- [x] Tests de sanitización de los tres casos de uso.
- [x] `.nvmrc` fija 24.22.1; CI, release y deploy lo leen.
- [x] `engines.node` exige `>=22.23.4`.
- [x] El empaquetado aborta si el runtime no coincide con `.nvmrc`.
- [x] Express, body-parser, proxy-addr y qs quedan en versiones corregidas.
- [x] `pnpm audit --prod` deja de mostrar vulnerabilidades críticas.
- [x] La release publica `SHA256SUMS` y el updater lo verifica.
- [x] El updater valida versión y rutas antes de extraer.
- [x] El paquete portátil no incluye Astro ni herramientas de build y el smoke
      test lo arranca con su propio runtime.
- [x] Backend, frontend, `pnpm check` y build en verde.
- [x] `CHANGELOG.md` actualizado en `[Unreleased]`.

## Verificación

- Backend: **596** tests (102 archivos), incluidos los nuevos de sanitización y
  los del updater (checksum ausente, hash incorrecto, tag inválido y ruta
  insegura).
- Frontend: **329** tests (54 archivos).
- `pnpm check`: arquitectura 7/7, typecheck y lint verdes.
- `pnpm build`: backend, frontend y website en verde.
- `pnpm audit --prod`: **0 críticas**, 6 altas restantes en Drizzle, Zod y
  dependencias de build de Astro; se abordan en S90/S91.
- `pnpm audit signatures`: 1328 paquetes con firma verificada.
- Node local: 24.22.1 instalado con nvm y fijado como `default`.
- Paquete Linux v1.50.2: **63 MB** y smoke test completo en verde (inicio con
  el runtime incluido, health, home, assets, PWA, logs, personaje, imagen y
  conversación).

## Commits

1. `fix(security): stop exposing provider API keys`
2. `chore(node): pin 24.22.1 across CI, release and packaging`
3. `fix(deps): patch Express and trim UI production dependencies`
4. `fix(updater): verify release checksums and archive paths`
5. `docs(slice): add S89 progress and security notes`
6. `fix(packaging): ignore JSDoc imports when scanning runtime deps` (v1.50.2)
