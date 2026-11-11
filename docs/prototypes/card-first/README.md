# Prototipos card-first (S133–S134)

Prototipos HTML estáticos para revisar la nueva arquitectura de información de
personajes y lorebooks antes de implementar. **No son código de producción**:
no hay backend, no hay persistencia y los datos son sintéticos.

Abrir `index.html` directamente en el navegador. La barra inferior de cada
página enlaza con el resto de pantallas; el enlace **Prototipo** del topbar
vuelve al hub.

## Pantallas

| Archivo                 | Qué revisa                                                                       |
| ----------------------- | -------------------------------------------------------------------------------- |
| `index.html`            | Hub, flujo general y preguntas de revisión.                                      |
| `create-dialog.html`    | Diálogo «Crear» con dos placas: Personaje y Lorebook.                            |
| `character-create.html` | Crear personaje: identidad, card con avanzados plegados, fichas y preview.       |
| `character-detail.html` | Detalle/edición con secciones, resumen de lorebook, versiones y rail de card.    |
| `lorebooks.html`        | Biblioteca de lorebooks, filtros, libros vinculados/sin vincular y estado vacío. |
| `lorebook-create.html`  | Crear lorebook: identidad, ajustes, entradas y vínculo opcional.                 |
| `lorebook-detail.html`  | Detalle/edición: ajustes, entradas en acordeón, vínculo 1:1 y export.            |

## Interacciones

- **Crear:** abre/cierra el modal, cierra con `Esc` o click fuera y devuelve el
  foco al botón.
- **Nav de secciones:** sticky en escritorio, chips horizontales en móvil; el
  enlace activo se actualiza al hacer click.
- **Guardado:** al editar un campo, la barra de estado cambia a «Cambios sin
  guardar». En detalle, la barra solo aparece en móvil cuando hay cambios.
- **Filtros de lorebooks:** Todos / Vinculados / Sin vincular.
- **Entradas:** «Añadir entrada» clona una entrada de borrador abierta.
- **Modo claro/oscuro:** botones del pie del prototipo; se recuerda en
  `localStorage`.

## Contenido sintético

- **Lyra**, guardiana del bosque de Vael, card V3, tres fichas y un lorebook
  vinculado («Bosque de Lyra», 12 entradas).
- **Ciudad Sumergida**, lorebook sin vincular.
- **Corte de Ceniza**, lorebook vinculado a la Capitana Ellis.
- Entradas con claves primarias, secundarias, `constant`, posición y prioridad.
- Una entrada con `use_regex` preservado pero no activado (aviso visible).

## Qué revisar

1. ¿En menos de un minuto queda claro qué es un personaje, qué es un lorebook y
   dónde se crea cada uno?
2. ¿La página de personaje se siente como una card y no como un formulario
   genérico?
3. ¿La biblioteca de lorebooks se siente como una estantería y no como una
   tabla de administración?
4. ¿Las secciones y la nav sticky reducen el cajón de sastre sin esconder lo
   importante?
5. ¿El flujo de crear personaje permite empezar rápido y completar la card
   después?
6. ¿El vínculo 1:1 y el estado «sin vincular» se entienden?
7. ¿Móvil a 390 px: nav en chips, placas apiladas, barra de guardado al pie?

## Limitaciones

- Sin backend, persistencia ni validación real.
- Las fuentes se cargan de Google Fonts solo para la revisión; en la app van
  self-hosted con Fontsource.
- El tema y el idioma son visuales; la app real usa `I18nProvider`.
- Los iconos son SVG inline de Lucide, ya usados en la app.
- Las imágenes de personaje son monogramas sintéticos; la app usará el asset
  real del personaje.
- El prototipo no incluye el selector de saludo alternativo al iniciar una
  conversación; está descrito en el plan (`docs/15-card-first-ux-plan.md`) y se
  implementará en S133/S134.
