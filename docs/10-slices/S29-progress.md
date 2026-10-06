# S29 — Aplicar plantilla de ajustes (PM.20)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

Cierra el hueco que S18 dejó documentado: el gestor de exportación genera una
plantilla de ajustes (`standaloneSettings`), pero el import la ignoraba. Ahora
un personaje existente puede recibir esa plantilla desde su menú contextual
("Aplicar ajustes…"), aplicándola a todas sus conversaciones.

## Decisiones

- **Alcance**: todas las conversaciones del personaje destino, con confirmación
  explícita en el diálogo (muestra el nombre y el número de conversaciones).
- **Proveedor ausente**: si la instancia `openai-compatible` de la plantilla no
  existe en esta instalación, se conservan proveedor y modelo del destino y se
  avisa; si el proveedor no es soportado, igual. El resto de ajustes sí se
  aplican. Ollama siempre es aplicable.
- **Reutilización**: cada conversación pasa por
  `UpdateConversationSettingsUseCase`, así se reutilizan los *clamps* y las
  validaciones existentes; se usa `force: true` para no hacer N chequeos de red
  al aplicar en bloque.
- **Endpoint** `POST /api/characters/:id/settings-imports` con validación zod de
  tipos (no de rangos: los rangos los normaliza el caso de uso). Devuelve
  `{ applied, warnings }` con códigos traducibles por el frontend.
- **Parser puro** `parseSettingsTemplate` en el frontend: valida `kind`,
  `schemaVersion` y la presencia de `standaloneSettings`, con errores i18n.
  Ignora el resto del archivo (puede venir solo la plantilla o un export
  completo).
- **Helper compartido**: `findCharacterConversations` se extrajo del caso de uso
  de exportación para que ambos (export y aplicar plantilla) filtren las
  conversaciones por personaje de la misma forma.
- **Fuera de alcance**: `customProfileImageAssetId` no forma parte de la
  plantilla (no es un ajuste); aplicar la plantilla desde el diálogo de importar
  personaje se descartó en favor del menú contextual del destino.

## Criterios de aceptación

- [x] La plantilla exportada se aplica a todas las conversaciones del personaje.
- [x] Valores normalizados por el caso de uso de ajustes (clamps/validaciones).
- [x] Instancia de proveedor ausente o proveedor no soportado → se conservan
      proveedor/modelo y se avisa; el resto se aplica.
- [x] Personaje sin conversaciones → no se aplica nada y se informa.
- [x] Errores de plantilla (JSON inválido, kind/versión, sin
      `standaloneSettings`) con mensajes traducidos en frontend.
- [x] `pnpm check` sin warnings; frontend (181) y backend (346) en verde.

## Commits

1. `feat(shared): settings template result types and copy`
2. `feat(backend): apply settings templates to a character`
3. `feat(frontend): apply settings template from the character menu`
4. `test(settings): cover template parsing, apply and route`
5. `docs(backlog): add PM.20 settings template apply`
6. `release: bump to v1.21.0 and add changelog entry`
