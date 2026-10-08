<div align="center">

[English](README.md) · **Español**

<img src="packages/frontend/public/brand/mascot-192.png" alt="Mascota de Roleplay Manager sosteniendo un cartel RM" width="150" />

# Roleplay Manager

### Gestor de conversaciones de rol local-first para tus propios modelos de IA.

Personajes versionados, conversaciones en streaming, memoria dinámica y resúmenes — todo en tu PC, sin cuentas ni nube.

[![Licencia: AGPL-3.0-or-later](https://img.shields.io/badge/licencia-AGPL--3.0--or--later-663399?style=flat-square)](LICENSE)
[![Última release](https://img.shields.io/github/v/release/TheFallen0000/roleplay-manager?style=flat-square&color=2ea44f)](https://github.com/TheFallen0000/roleplay-manager/releases/latest)
[![Workflow de release](https://img.shields.io/github/actions/workflow/status/TheFallen0000/roleplay-manager/release.yml?branch=master&style=flat-square&label=release)](https://github.com/TheFallen0000/roleplay-manager/actions/workflows/release.yml)
[![Plataformas](https://img.shields.io/badge/plataformas-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=flat-square)](#instalación)
[![Node.js 22.12+](https://img.shields.io/badge/Node.js-22.12%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[Instalación](#instalación) · [Funciones](#funciones) · [Desarrollo](#desarrollo) · [Acceso desde el teléfono](#acceso-desde-el-teléfono) · [Actualizaciones](#actualizaciones) · [Documentación](#documentación) · [Licencia](#licencia)

</div>

---

Roleplay Manager es una app autoalojada para conversaciones de rol largas con
personajes de IA. Tus personajes, chats, memorias, resúmenes e imágenes viven en
una base SQLite local dentro de `data/`, y la app habla con el proveedor de IA
que **tú** elijas: una instancia local de [Ollama](https://ollama.com/) o
cualquier endpoint compatible con OpenAI con tu propia clave. No hay cuenta, ni
login, ni nada que se envíe a un servicio nuestro.

## Funciones

- **Personajes versionados** — perfil, descripción, saludo, tarjetas e imágenes;
  cada edición crea una versión nueva. Importa/exporta personajes y aplica
  plantillas de ajustes.
- **Chat en streaming** — las respuestas llegan token a token. Edita y regenera
  respuestas, rebobina la conversación y ramifica la historia en líneas
  alternativas.
- **Memoria y resúmenes** — memoria dinámica por personaje con decaimiento,
  resúmenes automáticos y una vista previa del contexto para ver exactamente
  qué recibirá el modelo.
- **Tu proveedor, tus datos** — Ollama o cualquier API compatible con OpenAI,
  local o remota, con tu propia clave. El modelo y la conexión se configuran en
  la app.
- **Pensada para sesiones largas** — temas y paletas de color (claro/oscuro),
  diseño adaptable a escritorio y teléfono, renderizado de Markdown, etiquetas
  fuera de personaje y navegación por gestos entre alternativas.
- **Interfaz en inglés y español.**
- **Acceso desde el teléfono (opcional)** — comparte la app por tu red privada
  de Tailscale o por tu WiFi doméstica, escanea un código QR y úsala desde el
  móvil. Se instala como PWA, con su propio icono y ventana.
- **Paquetes portátiles con actualizaciones desde la app** — paquetes para
  Windows, Linux y macOS con el runtime de Node incluido (no hay que instalar
  nada). Las actualizaciones se descargan desde GitHub Releases a carpetas
  versionadas, con respaldo previo y la versión anterior conservada para volver
  atrás.
- **Local-first, sin cuentas** — sin login, sin telemetría, sin nube.

## Instalación

Descarga el paquete de tu sistema desde la
[última release](https://github.com/TheFallen0000/roleplay-manager/releases/latest):

| Sistema | Paquete |
|---|---|
| Windows (x64) | `roleplay-manager-<versión>-win-x64.zip` |
| Linux (x64 / arm64) | `roleplay-manager-<versión>-linux-<arch>.tar.gz` |
| macOS (Apple Silicon / Intel) | `roleplay-manager-<versión>-mac-<arch>.tar.gz` |

1. Descomprímelo donde quieras conservarlo (por ejemplo, Documentos).
2. Ejecuta `start.cmd` (Windows) o `./start.sh` (Linux/macOS).
3. El navegador se abre en <http://localhost:3001> cuando la app está lista.

**No** hace falta Node.js: el runtime va incluido. Tu contenido vive en la
carpeta `data/` dentro de ese directorio y las actualizaciones nunca la tocan.

> En macOS el runtime incluido no está firmado, así que Gatekeeper puede
> bloquear el primer arranque; permítelo en *Ajustes del Sistema → Privacidad y
> seguridad* o ejecuta `xattr -dr com.apple.quarantine .` dentro de la carpeta.
> El `README.txt` del paquete lo explica en ambos idiomas.

## Desarrollo

### Requisitos

- **Node.js** ≥ 22.12.0
- **pnpm** ≥ 11.15.1 (el script de instalación puede configurarlo con corepack)

### Instalar y arrancar

**Linux / macOS:**

```bash
./scripts/install.sh
./scripts/start.sh
```

**Windows:**

```bat
scripts\install.bat
scripts\start.bat
```

El frontend corre en <http://localhost:4321> y hace proxy de `/api` al backend
en <http://localhost:3001>. Pulsa `Ctrl+C` para detenerlo.

Instalación manual:

```bash
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install
pnpm dev
```

### Estructura del proyecto

Monorepo pnpm + turbo con cuatro paquetes:

| Paquete | Propósito |
|---|---|
| `packages/backend` | Express + Drizzle + SQLite. Arquitectura hexagonal. |
| `packages/frontend` | Astro + React + shadcn/ui. Habla con el backend por REST + SSE. |
| `packages/shared` | Tipos TypeScript puros y utilidades sin framework. |
| `packages/ui` | Componentes reutilizables de shadcn/ui. |

### Scripts comunes

| Script | Qué hace |
|---|---|
| `pnpm dev` | Corre todos los paquetes en modo desarrollo (watch + HMR). |
| `pnpm build` | Compila todos los paquetes para producción. |
| `pnpm check` | Chequeo de arquitectura + typecheck + lint. |
| `pnpm check:arch` | Solo el chequeo de arquitectura (7 reglas, ver `AGENTS.md`). |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Typecheck, lint o Prettier. |
| `pnpm --filter @workspace/backend test` | Suite de tests del backend (Vitest). |
| `pnpm --filter @workspace/frontend exec vitest run` | Suite de tests del frontend. |
| `pnpm brand:generate` | Regenera las imágenes de marca desde `docs/brand/logo-source.png`. |
| `pnpm package:app` | Construye el paquete portátil de la plataforma actual. |

### Configurar un proveedor de IA

1. Arranca la app y abre **Sistema → Proveedores** en la barra lateral.
2. Añade una instancia: un Ollama local (`http://localhost:11434`) o un endpoint
   compatible con OpenAI (URL + clave).
3. Usa **Probar conexión** para verificarla y elige el modelo por defecto.

## Acceso desde el teléfono

Abre **Teléfono** en el menú y elige un modo:

- **Tailscale** — comparte la app en tu tailnet privado
  (`https://<equipo>.<tailnet>.ts.net`). Nada se expone a internet.
- **Red doméstica (LAN)** — comparte la app en tu WiFi
  (`http://<ip-privada>:4322`).

Ambos muestran un código QR para abrir en el teléfono. La sección *Ajustes del
enlace* puede encender el enlace al arrancar la app, cortarlo al cerrarla
(Tailscale) y auto-desactivarlo tras 15–120 minutos sin uso desde el teléfono.
En Android e iOS la app se puede instalar en la pantalla de inicio como PWA.

## Actualizaciones

La app empaquetada consulta las
[releases de GitHub](https://github.com/TheFallen0000/roleplay-manager/releases)
desde **Sistema → Actualizaciones**. Aplicar una actualización crea un respaldo,
descarga el paquete de tu sistema en `versions/<versión>/`, cambia el puntero
`current` y ofrece el botón **Reiniciar ahora**; tu `data/` y tus `backups/` no
se tocan y la versión anterior queda en disco.

## Documentación

- [AGENTS.md](AGENTS.md) — reglas de arquitectura, convenciones de nombres y los
  chequeos de calidad que aplica `pnpm check:arch`.
- [CONTRIBUTING.md](CONTRIBUTING.md) — cómo preparar el repo, correr los tests y
  enviar un pull request.
- [PRODUCT.md](PRODUCT.md) — definición del producto: usuarios, propósito,
  posicionamiento.
- [docs/07-technical-architecture.md](docs/07-technical-architecture.md) — cómo
  encajan backend y frontend.
- [docs/10-slices/](docs/10-slices) — el diario de desarrollo, un documento por
  slice entregado.
- [docs/packaging-opt.md](docs/packaging-opt.md) y
  [docs/remote-access-opt.md](docs/remote-access-opt.md) — notas de diseño de
  los paquetes portátiles/actualizador y del acceso desde el teléfono.

## Licencia

Este proyecto está bajo la **GNU Affero General Public License v3.0 o
posterior** (AGPL-3.0-or-later) — ver [LICENSE](LICENSE). En la práctica:

- ✅ Úsalo gratis, para cualquier fin, y modifica el código.
- ✅ Redistribúyelo o redistribuye tus modificaciones.
- ❌ **No** puedes distribuir versiones modificadas de código cerrado: todo lo
  que distribuyas (incluido un servicio alojado) debe seguir siendo abierto bajo
  la misma licencia, con el código disponible para sus usuarios.

## Contribuir

¡Las contribuciones son bienvenidas! Mira [CONTRIBUTING.md](CONTRIBUTING.md)
para preparar el entorno, los tests y el flujo de pull requests. Al contribuir,
aceptas que tus contribuciones se licencien bajo la AGPL v3 (o posterior).

## Reportar errores y pedir funciones

Abre un [issue](https://github.com/TheFallen0000/roleplay-manager/issues) con:

- Un título y una descripción claros.
- Pasos para reproducirlo (para errores) y el comportamiento esperado vs. el
  real.
- Tu sistema operativo, la versión de la app y tu versión de Node.js
  (`node --version`) si la ejecutas desde el código.
- Logs o capturas relevantes.
