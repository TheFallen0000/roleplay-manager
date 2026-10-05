# S26 — i18n del resto de la interfaz + prompt del LLM (PM.11, fase 3)

**Estado:** Completado
**Inicio:** 2026-08-12
**Fin:** 2026-08-12

## Descripción

Tercera fase del multi-idioma: se traduce el resto de la interfaz (unos 230
strings): área de **personajes** (lista, tarjetas, menú contextual, formulario,
exportación/importación, recorte de imagen), **memoria** (lista, propuestas,
modo y auto-degradación), **resúmenes** y **proveedores** (gestor, tarjetas,
instancias, diálogo de instancia, combobox de modelos), además de los
**títulos de página** y el **prompt del LLM**.

Como pidió el usuario, el **prompt del sistema sigue el idioma de la interfaz**:
si la interfaz está en inglés, el contexto que se envía al modelo (y que se ve
en la vista previa) también lo está.

## Decisions

- **Prompt del LLM por idioma**: las plantillas del prompt viven en el
  namespace `prompt.*` de los diccionarios compartidos (los textos en ES se
  conservan exactamente). El puerto `PromptContextBuilder` y su implementación
  aceptan `locale` (por defecto `en`); los 4 use cases que construyen contexto
  (`send-message`, `continue-conversation`, `regenerate-reply`,
  `get-prompt-context`) lo reciben en su input y las rutas lo resuelven del
  header `Accept-Language` con el helper `resolveRequestLocale` (soporta
  variantes regionales y cae al idioma por defecto).
- **El frontend envía `Accept-Language`**: `apiRequest` lo añade desde un valor
  de módulo (`getRequestLocale`/`setRequestLocale` en `lib/locale.ts`) que el
  `I18nProvider` fija durante el render (no en un efecto, para que las peticiones
  de los hijos ya lleven el idioma correcto).
- **Namespaces nuevos**: `characters` (fusionado con el de S24: tarjetas, menús,
  formulario, export/import), `memory`, `summaries`, `providers`, `pages` y
  `prompt`; en `common` se añaden `saveChanges`, `error` y `untitled`.
- **Islas**: `CharacterForm` y `ProviderManager` reciben `locale` por prop y se
  envuelven en su propio `I18nProvider` (patrón de S24/S25). Los títulos de las
  páginas se traducen en el frontmatter con `translate(locale, "pages.*")`.
- **Fechas**: `dateLocale(locale)` sustituye al `"es-ES"` fijo de los resúmenes.
- **Import**: `parseCharacterExport(text, locale)` traduce sus errores.
- **Fuera de alcance**: los mensajes internos de error de
  `image-cropper.utils.ts` (no son visibles: se sustituyen por toasts
  traducidos). PM.13 (welcome) y PM.14 (menubar) van en S27.

## Criterios de aceptación

- [x] Personajes, memoria, resúmenes y proveedores traducidos en EN/ES.
- [x] Títulos de página traducidos (`/`, `/characters/new`, `/characters/:id`,
      `/settings/providers`, `/player-characters`, `/conversations/:id`).
- [x] El prompt del LLM se construye en el idioma de la interfaz y viaja por
      `Accept-Language` (tests del builder en EN y ES + helper de rutas).
- [x] Islas nuevas con `locale` por prop; SSR verificado en ambos idiomas.
- [x] `pnpm check` sin warnings; frontend (163) y backend (318) en verde.

## Commits

1. `feat(shared): add the prompt i18n namespace`
2. `feat(backend): build the LLM prompt in the UI language (PM.11)`
3. `feat(frontend): send the UI language in Accept-Language`
4. `feat(shared): characters, memory, summaries and providers i18n namespaces`
5. `feat(frontend): translate the character area (PM.11 phase 3)`
6. `feat(frontend): translate memory, summaries and providers (PM.11 phase 3)`
7. `test(frontend): wrap migrated components with the i18n provider`
8. `docs(backlog): note PM.11 phase 3 in S26`
9. `release: bump to v1.17.0 and add changelog entry`
