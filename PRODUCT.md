# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Persona aficionada al rol que escribe con personajes de IA en su propio
ordenador, en sesiones largas de escritura, para uso personal. Busca
continuidad: que el personaje recuerde lo ocurrido, que pueda corregir y
regenerar respuestas, y que nada de su historia se pierda entre sesiones.

## Product Purpose

Gestor de conversaciones de rol con personajes de IA que vive en local. Permite
crear personajes versionados, conversar con ellos en streaming, mantener su
memoria dinámica y sus resúmenes, ramificar la historia y controlar el modelo
usado. El éxito es que la persona pueda escribir durante semanas sin perder
contexto y sin ceder sus datos a un servicio externo.

## Positioning

Es local-first y BYO-provider: los datos (personajes, conversaciones, memorias,
resúmenes, imágenes) viven en una base SQLite y en `./data` del usuario, y el
usuario conecta su propio proveedor de IA (Ollama local o cualquier endpoint
OpenAI-compatible) con su propia clave. Un chat de rol alojado no puede copiar
esa combinación: control total del dato + control total del modelo.

## Operating Context

- Se ejecuta en el equipo del usuario; no hay cuentas, login ni nube.
- El backend (Express + SQLite) expone una API REST/SSE; el frontend (Astro +
  React) la consume en `http://localhost:3001` o en `PUBLIC_API_URL`.
- Se arranca en local con scripts (`scripts/start.*` ejecutan `pnpm dev`) o con
  `pnpm dev` directamente.
- El proveedor de IA se configura en la pantalla de Proveedores; puede ser una
  instancia local (Ollama) o remota (OpenAI-compatible) con API key propia.
- La interfaz está en inglés y español (inglés por defecto), elegible en la
  app.

## Capabilities and Constraints

Confirmado:

- Personajes con versiones inmutables (editar crea una versión nueva) y tarjetas
  de personalidad; imagen de perfil subida y recortada.
- Conversaciones por personaje/versión, con streaming SSE, regeneración,
  edición, borrado, rebobinado, continuación y navegación del historial de
  alternativas.
- Memoria dinámica con propuestas (modo automático/manual) y auto-degradación
  configurable por conversación.
- Resúmenes periódicos de conversaciones largas y previsualización del contexto
  (prompt) antes de enviar.
- Ramas de conversación desde un mensaje, heredando la configuración del origen.
- Exportación/importación completa de un personaje como JSON versionado.
- Ajustes por conversación (modelo, proveedor, hiperparámetros de inferencia,
  frecuencia de resumen, memoria) e imagen de perfil personalizada.
- Temas de color predefinidos con modo claro/oscuro/sistema.

Restricciones técnicas:

- Local-first: SQLite (`better-sqlite3`) + archivos en disco; sin servicios
  externos obligatorios.
- Los assets de imagen se guardan en el sistema de archivos con metadatos en la
  base de datos.
- Arquitectura hexagonal en el backend y `lib/` agnóstica de React en el
  frontend, verificadas por `pnpm check:arch`.

Sin decidir (no inventar):

- No hay despliegue cloud previsto; el producto se usa en local.

Descartado:

- La interfaz visual de árbol de ramas (PM.7) se descartó: la acción de
  ramificar (S16) cubre los casos reales.

## Brand Commitments

- Nombre: **Roleplay Manager**.
- Licencia: **AGPL-3.0-or-later** (compromiso legal confirmado).
- Identidad visual **«Ink & Violet»** (tinta sobre papel + el violeta de la
  mascota), con la mascota como anfitriona de la app; dirección del rediseño
  S59–S62 aprobada el 2026-10-09. Plan en `docs/redesign-plan.md`.
- La voz de marca no está definida fuera de lo que vive en el código; no hay
  testimonios ni material de prensa.

## Evidence on Hand

- `CHANGELOG.md` y `docs/10-slices/` documentan el historial real por slices.
- `AGENTS.md` documenta la arquitectura y las convenciones verificables.
- No hay testimonios, clientes, benchmarks ni material de prensa: el trabajo
  futuro no debe fabricarlos.

## Product Principles

1. **Los datos son del usuario.** Todo vive en local; nada exige cuentas ni
   nube. Cualquier función nueva debe respetar ese límite.
2. **El usuario elige su IA.** El producto no impone proveedor ni clave; se
   adapta a Ollama o a cualquier endpoint OpenAI-compatible.
3. **La continuidad es la función.** Memoria, resúmenes, versiones y ramas
   existen para que una historia larga no pierda contexto.
4. **Nada se pierde sin querer.** Las operaciones destructivas piden
   confirmación, las ediciones versionan y el export/import permite llevarse
   todo.
5. **Verificable por defecto.** Arquitectura, límites de tamaño y calidad pasan
   por `pnpm check`; la documentación de slices acompaña cada entrega.
