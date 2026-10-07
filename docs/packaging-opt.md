# Empaquetado y distribución (PM.24)

## Objetivo

Distribuir la app como una **carpeta portátil para Windows x64** con su propio
runtime de Node, de forma que el usuario final **no instale nada** (ni Node ni
pnpm): descomprime, ejecuta el lanzador y la app se abre en el navegador.

## Decisiones (2026-10-07)

1. **Un solo proceso**: el servidor de Astro se construye en modo `middleware` y
   se monta **dentro de Express**. Un solo puerto, mismo origen; el proxy `/api`
   del frontend deja de ser necesario en producción (Express sirve `/api`
   primero).
2. **Solo Windows x64** por ahora, con una versión de Node **fijada** (24.x). Las
   plataformas Linux/macOS quedan para una matriz de CI posterior.
3. **Datos dentro de la carpeta portátil**: `data/` (SQLite + imágenes) y
   `backups/`. Cero rastro en el sistema.
4. **Actualización por carpetas versionadas + puntero**: `versions/<v>/` y un
   archivo `current`. Actualizar = descargar la carpeta nueva y cambiar el
   puntero (rollback trivial y sin archivos bloqueados en caliente).

## Contrato del artefacto (release)

El zip que se publica en GitHub Releases y que consume el actualizador:

```text
roleplay-manager-<version>-win-x64.zip
├── versions/
│   └── <version>/
│       ├── app/            ← dist de backend y frontend + node_modules (prod)
│       └── runtime/        ← node.exe (versión fijada)
├── current                 ← puntero con la versión activa
├── start.cmd               ← lanzador raíz (lee `current` y abre el navegador)
├── version.json            ← { version, commit, builtAt, platform }
└── README.txt
```

Carpeta de instalación del usuario:

```text
RoleplayManager/
├── versions/…              ← una carpeta por versión instalada
├── current                 ← versión activa
├── data/                   ← base de datos + imágenes (NUNCA se toca al actualizar)
├── backups/                ← respaldos (NUNCA se toca)
└── start.cmd
```

El lanzador resuelve las rutas **relativas a la raíz portátil**
(`DATABASE_PATH`, `DATA_DIR`, `BACKUP_DIR`), no a la carpeta de versión, así los
datos sobreviven a cualquier actualización.

## Entrada de un solo proceso

- `@astrojs/node` con `mode: "middleware"` genera un handler de Node montable en
  Express.
- El backend monta `/api/*` (rutas existentes) y, después, el handler de Astro
  para el resto (páginas, assets y el middleware del frontend). El puerto del
  proceso es el del backend (**3001**), de modo que las llamadas SSR a
  `http://localhost:3001` apuntan al propio proceso y el navegador usa rutas
  relativas (`/api`) en el mismo origen.
- **Los assets estáticos los sirve el anfitrión**: en modo `middleware` Astro no
  sirve su build (`favicon`, `/_astro/*`), así que el backend monta
  `express.static(<clientDir>)`. Configuración: `WEB_HANDLER_PATH` y
  `WEB_CLIENT_DIR` (por defecto `../client` respecto al handler).
- La base de la API en SSR se puede fijar en **tiempo de ejecución** con
  `PUBLIC_API_URL` (el proceso único puede escuchar en cualquier puerto); en el
  navegador las llamadas siguen siendo relativas.
- En desarrollo nada cambia (`astro dev` + backend por separado); el handler se
  monta solo cuando `WEB_HANDLER_PATH` está definido. `astro preview` no está
  soportado en este modo.

## Fases

| Fase | Alcance |
|---|---|
| **A** ✅ | Entrypoint de un solo proceso (Astro dentro de Express) + verificación de SSR, assets, streaming SSE y subidas. *Hecho en S40 (v1.28.0).* |
| **B** | Script de empaquetado (`pnpm package`) para Windows x64: `pnpm deploy --prod`, dists, runtime de Node, lanzador, `version.json` y zip. Smoke test del artefacto **sin Node/pnpm del sistema**. |
| **C** | CI de releases (GitHub Actions por tag `v*`) y contrato del artefacto. |
| **D** | Actualizador por releases (PM.23 fase 2): descargar, verificar, instalar en `versions/<v>`, cambiar `current` y pedir reinicio, con rollback. |

## Riesgos y notas

- **Módulos nativos** (`better-sqlite3`, `sharp`): dependen de plataforma,
  arquitectura y ABI de Node; el runtime incluido debe ser de la misma versión
  con la que se instalaron.
- **`pnpm deploy` es experimental**: validar que el `node_modules` resultante
  incluye los binarios nativos correctos.
- **SmartScreen/antivirus**: un ejecutable sin firmar dispara el aviso de
  Windows; se documentará (o se firmará más adelante).
- **Tamaño**: 150–300 MB por la libvips de `sharp` y el runtime de Node.
- **Migraciones**: ya se aplican al arrancar; el respaldo automático de S39 sigue
  disponible antes de actualizar.
