# Prototipos — Fase 0 «Ink & Violet»

HTML/CSS estático para **aprobar la dirección visual antes de tocar la app**.
Sin build, sin dependencias: abrir `welcome.html` (o cualquier archivo) en el
navegador. Los datos, nombres y textos son **sintéticos**.

## Páginas

| Archivo | Qué muestra |
|---|---|
| `style-tile.html` | Color, tipografía, componentes, mensajes, movimiento y superficies del navegador. |
| `welcome.html` | Onboarding: mascota, idioma, mundo y modo; CTA con destello. |
| `library.html` | Shell (sidebar + header) y biblioteca de personajes, con estado vacío. |
| `chat.html` | La misma conversación en **burbuja / documento / novela visual**, color de diálogo y streaming. |

La barra inferior de cada página permite cambiar de página y alternar
claro/oscuro/sistema. En `chat.html`, el panel inferior izquierdo cambia el
estilo de mensaje y el color del personaje.

## Qué revisar

- **Color**: ¿el violeta se siente de la mascota? ¿El papel frío funciona en
  claro y en oscuro? Probar los 5 mundos (chips del style tile).
- **Tipografía**: ¿Dela Gothic para el nombre, Zen Maru para títulos, Zen
  Kaku Gothic New para leer (en prueba frente a Geist)? ¿Se sostiene una
  sesión larga?
- **Materiales**: grano de papel apenas visible; ¿demasiado o demasiado poco?
- **Chat**: ¿se entiende el cambio de estilo? ¿Los colores de diálogo ayudan
  a seguir quién habla? ¿La novela visual conserva legibilidad?
- **Movimiento**: entrada de mensajes, cursor de streaming, destello.
  ¿Suficiente para dar vida sin distraer?
- **Estados**: vacío, streaming, alternativas, foco visible, selección.

## Validación

- Detector de `impeccable` en **modo archivo**: sin hallazgos.
- Detector con **render de navegador**: sin hallazgos salvo el cursor de
  streaming (`.brush-caret`), que representa una generación real y queda
  documentado en `chat.html` con una excepción inline.
- **Segmentos corregidos** tras la revisión: la narración (`*…*`) hereda el
  color del texto con una pizca de transparencia y el OOC (`//…//`) es una
  pastilla mono auto-suficiente. Se leen sobre papel, tarjeta y burbuja, en
  claro y en oscuro; el diálogo del usuario conserva su color en
  documento/novela.

## Placeholders conocidos

- **Mascota**: se usa el arte actual; las poses definitivas están en
  producción (`docs/redesign-plan.md`, §7).
- **Retratos de personaje**: la inicial sobre un fondo compuesto es un
  marcador de posición, no un estilo final.
- **Fondo del chat**: gradiente etiquetado como sustituto de la imagen del
  usuario.
- **Idioma EN/ES**: el segmento es visual; la traducción real llega con la
  implementación (i18n ya existe).
- **Fuentes**: se cargan de Google Fonts solo para el prototipo; en la app
  irán self-hosted con Fontsource.
- **Colores de diálogo**: los swatches del panel son una demo; la
  implementación (S61) validará contraste AA en ambos modos y permitirá
  «volver al tema».
