# Prototipos card-first (S133–S134)

Prototipos HTML estáticos para revisar la nueva arquitectura de información de
personajes y lorebooks antes de implementar. **No son código de producción**:
no hay backend, no hay persistencia y los datos son sintéticos.

Abrir `index.html` directamente en el navegador. La barra inferior de cada
página enlaza con el resto de pantallas; el enlace **Prototipo** del topbar
vuelve al hub.

## Pantallas

| Archivo                 | Qué revisa                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `index.html`            | Hub, flujo general y preguntas de revisión.                                           |
| `create-dialog.html`    | Diálogo «Crear» con dos placas: Personaje y Lorebook.                                 |
| `character-create.html` | Crear personaje: identidad, card, fichas, lorebook opcional con versión y preview.    |
| `character-detail.html` | Detalle/edición con secciones, versión de lorebook enlazada, versiones y rail.        |
| `lorebooks.html`        | Biblioteca de lorebooks, versión actual, uso agregado, filtros y estado vacío.        |
| `lorebook-create.html`  | Crear lorebook: identidad, ajustes, entradas y v1; vincular después.                  |
| `lorebook-detail.html`  | Detalle/edición: ajustes, entradas, historial de versiones, uso por versión y export. |

## Interacciones

- **Crear:** abre/cierra el modal, cierra con `Esc` o click fuera y devuelve el
  foco al botón.
- **Nav de secciones:** sticky en escritorio, chips horizontales en móvil; el
  enlace activo se actualiza al hacer click.
- **Guardado:** al editar un campo, la barra de estado cambia a «Cambios sin
  guardar». En detalle, la barra solo aparece en móvil cuando hay cambios.
- **Filtros de lorebooks:** Todos / En uso / Sin usar.
- **Entradas:** «Añadir entrada» clona una entrada de borrador abierta.
- **Ficha de personaje:** el selector de lorebook se puede vaciar y muestra el
  placeholder «Sin lorebook»; quitar la imagen muestra el placeholder «Sube
  una imagen».
- **Modo claro/oscuro:** botones del pie del prototipo; se recuerda en
  `localStorage`.

## Contenido sintético

- **Lyra**, guardiana del bosque de Vael, card V3, tres fichas y un lorebook
  versionado («Bosque de Lyra» v3, 12 entradas).
- **Ciudad Sumergida** v1, usado históricamente por Lyra v1.
- **Corte de Ceniza** v2, usado por la Capitana Ellis.
- **El Vacío** v1, sin usar.
- Entradas con claves primarias, secundarias, `constant`, posición y prioridad.
- Una entrada con `use_regex` preservado pero no activado (aviso visible).
- Historial de versiones de personaje con el libro/versión usado por cada una.

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
6. ¿Se entiende que un personaje fija una **versión** del lorebook y que un
   libro puede usarse por varios personajes?
7. ¿El historial de versiones del libro y el uso por versión se leen sin
   esfuerzo?
8. ¿El aviso de borrado deja claro que las versiones antiguas siguen
   funcionando pero el libro desaparece?
9. ¿Móvil a 390 px: nav en chips, placas apiladas, barra de guardado al pie?

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
- El diálogo de reconstrucción al reimportar y el de borrado son estáticos; el
  aviso y la lógica están descritos en `docs/16-lorebook-versioning.md`.
- Los selectores de versión y los botones de restaurar/vincular son visuales;
  no hay persistencia.
- El contenido precargado de Crear personaje es una demo para enseñar los
  placeholders al borrar un campo; la app real empezará vacía con esos mismos
  placeholders.
