# S25 — i18n del chat y la conversación (PM.11, fase 2)

**Estado:** Completado
**Inicio:** 2026-08-12
**Fin:** 2026-08-12

## Descripción

Segunda fase del multi-idioma: se traduce toda el área de **chat y
conversación** (unos 100 strings): burbujas y menú de mensaje, input,
diálogos de confirmación, vista previa del contexto, panel de ajustes
(Historia / Modelo / Personalización / Persona), selector de modelo, tarjetas de
inferencia y resumen, pestaña de personalización y toasts asociados.

## Decisions

- **Namespaces nuevos**: `chat` y `settings` en los diccionarios compartidos
  (con plurales `one/other` para mensajes, caracteres, memorias y resúmenes).
- **Patrón de islas (S24) aplicado**: la isla `Chat` recibe `locale` por prop y
  se envuelve en su propio `I18nProvider` (renombrada internamente a
  `ChatContent`); `conversations/[id].astro` resuelve el locale con
  `resolveLocale` y lo pasa. El resto de componentes del chat
  (`SettingsPanel`, `MessageBubble`, etc.) consumen el contexto de esa isla.
- **Copy preservada**: se mantienen los textos exactos existentes (p. ej.
  "Restablecer valores" en el footer vs "Restablecer" en el diálogo, con dos
  claves).
- **Deps de hooks**: `t` se añade a los arrays de dependencias de los
  `useCallback`/`useEffect` que lo usan (0 warnings de `exhaustive-deps`).
- **Tests**: los componentes migrados se renderizan en los tests con un
  `render` local que envuelve en `I18nProvider initialLocale="es"` (conserva las
  aserciones en español). Se corrigieron además dos tests desactualizados: el
  label del menú ("Conversación más reciente") y `themes.test` (`labelKey`).
- **Fuera de alcance**: personajes, memoria, resúmenes, proveedores y títulos de
  página (S26), y el prompt del LLM (S26, siguiendo el idioma de la interfaz).

## Criterios de aceptación

- [x] Chat, mensajes, input, diálogos, vista previa y panel de ajustes
      traducidos en EN/ES.
- [x] La isla del chat recibe el locale por prop y funciona en SSR (verificado:
      `lang` y placeholder traducidos con/sin cookie `language=es`).
- [x] Sin strings hardcodeados en el área migrada.
- [x] `pnpm check` sin warnings; frontend (162) y backend (314) en verde.

## Commits

1. `feat(shared): chat and settings i18n namespaces`
2. `feat(frontend): translate the chat area (PM.11 phase 2)`
3. `test(frontend): wrap migrated components with the i18n provider`
4. `docs(backlog): note PM.11 phase 2 in S25`
5. `release: bump to v1.16.0 and add changelog entry`
