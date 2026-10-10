---
name: Roleplay Manager
description: Local-first roleplay chat manager — tinta sobre papel con la mascota como anfitriona.
colors:
  ink-violet: "oklch(0.54 0.24 300)"
  ink-violet-soft: "oklch(0.935 0.05 300)"
  milestone-gold: "oklch(0.78 0.13 85)"
  character-voice: "oklch(0.46 0.2 300)"
  user-voice: "oklch(0.47 0.12 165)"
  cool-paper: "oklch(0.98 0.006 300)"
  night-ink: "oklch(0.16 0.025 300)"
  card-paper: "oklch(0.995 0.003 300)"
  ink-black: "oklch(0.2 0.02 300)"
  muted-surface: "oklch(0.955 0.008 300)"
  faded-ink: "oklch(0.51 0.024 300)"
  hairline: "oklch(0.9 0.012 300)"
  sidebar-paper: "oklch(0.965 0.008 300)"
  warning-crimson: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Dela Gothic One, Zen Kaku Gothic New, sans-serif"
    fontSize: "clamp(3rem, 2.2rem + 6.5vw, 6rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Zen Maru Gothic, Zen Kaku Gothic New, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Zen Maru Gothic, Zen Kaku Gothic New, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Zen Kaku Gothic New, Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Zen Kaku Gothic New, Geist Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
components:
  button-primary:
    backgroundColor: "{colors.ink-violet}"
    textColor: "{colors.cool-paper}"
    rounded: "{rounded.lg}"
    padding: "0 1.05rem"
    height: "2.4rem"
  button-outline:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.lg}"
    padding: "0 1.05rem"
    height: "2.4rem"
  version-chip:
    backgroundColor: "{colors.ink-violet-soft}"
    textColor: "{colors.ink-violet}"
    rounded: "{rounded.lg}"
    padding: "0.3rem 0.55rem"
  character-card:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.2xl}"
  message-bubble-character:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 0.75rem"
  message-bubble-user:
    backgroundColor: "{colors.ink-violet}"
    textColor: "{colors.cool-paper}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 0.75rem"
---

# Design System: Roleplay Manager

## Overview

**Creative North Star: "Tinta viva" (Living Ink)**

El sistema es un cuaderno de historias: papel frío —nunca crema— y tinta negra
con veta violeta, el violeta exacto de los ojos de la mascota. La app se
comporta como una herramienta de escritura larga (Operate) vestida con el
lenguaje de las estanterías de novelas: superficies de papel con filos de tinta,
insignias tipo placa, prosa legible y un único destello dorado reservado a los
hitos. La mascota es la anfitriona —bienvenida, estados vacíos, errores— y
nunca un adorno repetido.

El mundo rechaza deliberadamente dos cosas confirmadas: el look SaaS neutro de
shadcn como punto de partida y el degradado violeta de fondo (el «tell» clásico
de UI generada por IA) que los prototipos usaban; se sustituyó por grano de
papel apenas visible. El chat tiene su propia capa expresiva: estilos de
mensaje (burbuja, documento, novela visual) y colores de diálogo por
conversación, con la voz del personaje y la tuya como protagonistas.

**Key Characteristics:**
- Papel frío y tinta con veta violeta; sin degradados decorativos.
- Cinco mundos completos (Tinta y violeta, Sakura, Bosque, Océano, Medianoche),
  cada uno con claro y oscuro.
- Tipografía con carácter japonés: display Dela Gothic, títulos Zen Maru,
  cuerpo Zen Kaku Gothic New.
- Movimiento escaso y con intención: pincelada de streaming, entrada suave de
  mensajes, destello único de hito.
- La mascota como sistema (poses con fallback), no como decoración.

## Colors

Paleta comprometida: el violeta de la mascota cubre acción y habla; el papel y
la tinta hacen todo lo demás; el dorado aparece una vez por superficie.

### Primary
- **Ink Violet** (oklch(0.54 0.24 300)): acción principal (botones, foco,
  burbuja del usuario), nav activa y diálogo del personaje por defecto.
- **Ink Violet Soft** (oklch(0.935 0.05 300)): superficies de selección,
  insignias de versión y el panel del usuario en novela visual.

### Tertiary
- **Milestone Gold** (oklch(0.78 0.13 85)): exclusivamente hitos — el destello
  de la bienvenida y las insignias de actualización. Nunca decoración.

### Neutral
- **Cool Paper** (oklch(0.98 0.006 300)): fondo claro del mundo por defecto.
- **Card Paper** (oklch(0.995 0.003 300)): tarjetas y burbujas sobre papel.
- **Night Ink** (oklch(0.16 0.025 300)): fondo del modo oscuro.
- **Ink Black** (oklch(0.2 0.02 300)): texto principal en claro.
- **Faded Ink** (oklch(0.51 0.024 300)): texto secundario; cumple AA sobre
  papel.
- **Hairline** (oklch(0.9 0.012 300)): bordes de 1 px que separan sin ruido.
- **Warning Crimson** (oklch(0.577 0.245 27.325)): destructivo y errores.

### Named Rules
**The Ink-Before-Chrome Rule.** El color viene de la tinta (texto, diálogo,
placas), no del ornamento: sin degradados de fondo, sin glass decorativo, sin
texto con gradiente.

**The One Sparkle Rule.** El dorado y los destellos se reservan a los hitos;
una superficie tiene un solo momento expresivo.

**The Two-Modes Rule.** Cada color se decide en claro y oscuro a la vez; los
colores personalizados de diálogo se aclaran un 18 % hacia blanco solo en
oscuro para conservar legibilidad.

## Typography

**Display Font:** Dela Gothic One (con Zen Kaku Gothic New de respaldo)
**Body Font:** Zen Kaku Gothic New (con Geist Variable de respaldo)
**Label/Mono Font:** mono del sistema para comentarios OOC y datos.

**Character:** Dela Gothic aporta el peso de un lomo de novela ligera; Zen Maru
suaviza los títulos con esquinas redondeadas japonesas; Zen Kaku sostiene las
sesiones largas con una lectura neutra y densa. El latino se sirve por subsets
con Fontsource.

### Hierarchy
- **Display** (400, clamp(3rem, 2.2rem+6.5vw, 6rem) en la bienvenida,
  line-height 1.02): solo el nombre del producto y los momentos grandes.
- **Headline** (900, ~1.875rem): títulos de página («Mis personajes»).
- **Title** (700, ~1.05rem): nombres de personaje y cabeceras de panel.
- **Body** (400, 0.875rem, line-height 1.6, medida 65–75ch): conversación y
  prosa; en el estilo documento sube a 0.95rem con más interlineado.
- **Label** (600, 0.75rem): etiquetas de control y metadatos; nunca
  decorativas.

### Named Rules
**The Quiet Body Rule.** La display nunca escribe párrafos: si el texto se lee
seguido, va en Zen Kaku.

## Layout

Shell de app con sidebar de papel (icon-only al colapsar) y contenido con tope
de 72rem centrado en pantallas anchas; en móvil la sidebar se retira y el
contenido respira con padding de 1–1.5rem. La biblioteca usa un grid masonry de
columnas de ~15rem a partir de 40rem; el chat es una columna de lectura de
~46rem con el compositor fijo abajo y el fondo del usuario detrás. Breakpoints
en 40/48/52/56/64rem (Tailwind). Espaciado en pasos de 4 px; más aire encima de
un título que debajo. Las superficies táctiles mantienen ≥38 px de alto con
áreas de pulsación generosas en listas.

## Elevation & Depth

Híbrido: los bordes de 1 px definen la estructura (filos de tinta) y las
sombras solo aparecen como respuesta al estado. En reposo todo está plano sobre
el papel; al pasar el ratón las tarjetas se elevan 2 px con sombra suave de
tinte violeta, y los diálogos flotan con la sombra mayor. En oscuro las sombras
son profundas y el glow se reserva al foco.

### Shadow Vocabulary
- **Ambient lift** (`0 1px 2px rgba(60,40,80,.08), 0 2px 8px rgba(60,40,80,.06)`):
  botones al hover, superficies que responden.
- **Floating panel** (`0 2px 6px rgba(60,40,80,.10), 0 12px 32px rgba(60,40,80,.12)`):
  diálogos, popovers y la tarjeta al elevarse.

### Named Rules
**The Flat-by-Default Rule.** Las superficies descansan planas; la sombra
existe para mostrar un cambio de estado, no para decorar.

## Shapes

Esquinas suaves y generosas (radio base 0.75rem; tarjetas 1.35rem) con dos
excepciones con intención: las **placas** (insignias de versión, placas de
nombre) usan píldoras completas, y los **estados de vacío/espera** usan bordes
discontinuos que invitan a actuar. La tinta también dibuja: el cursor de
streaming es una pincelada recortada con `clip-path`, y las iniciales de
personaje sin imagen se escriben en Dela Gothic sobre papel atenuado.

## Components

### Buttons
- **Shape:** esquinas suaves (0.75rem); alturas 2rem / 2.4rem / 2.9rem.
- **Primary:** violeta de tinta con texto papel; se eleva 1 px al hover.
- **Hover / Focus:** sombra ambiental al hover; anillo de foco de 2 px en
  violeta, siempre visible por teclado.
- **Secondary / Ghost:** borde hairline sobre papel (importar, cancelar);
  ghost para acciones terciarias dentro de paneles.

### Chips
- **Style:** píldora de hairline con texto atenuado (contadores); variante
  violeta suave para versiones (`v3`) y dorada para actualizaciones.
- **State:** las placas de decisión usan `aria-pressed` con anillo de foco; las
  muestras de color son círculos con borde y anillo al seleccionar.

### Cards / Containers
- **Corner Style:** 1.35rem.
- **Background:** papel de tarjeta sobre papel; en claro con borde hairline.
- **Shadow Strategy:** ver Elevation — planas en reposo, elevación al hover.
- **Border:** hairline de 1 px; el borde vira a violeta al hover.
- **Internal Padding:** 0.85–1rem.

### Inputs / Fields
- **Style:** hairline sobre tarjeta, radio 0.75rem; en táctil el texto sube a
  16 px para que iOS no haga zoom.
- **Focus:** borde violeta + anillo suave (`--ring`).
- **Error / Disabled:** texto destructivo u opacidad reducida; nunca solo
  color sin mensaje.

### Navigation
- **Style, tipografía, default/hover/active states:** sidebar de papel con
  etiquetas de grupo; el elemento activo usa violeta suave y `aria-current`;
  los triggers del menú superior (Tema, Idioma, Teléfono) son botones
  discretos.
- **Mobile treatment:** la sidebar se oculta y el header mantiene el menú con
  blur sutil y padding para el notch.

### Message bubbles & dialogue (signature)
- **Bubble:** personaje sobre papel atenuado; usuario en violeta con texto
  papel; esquina inferior del lado del hablante más apretada.
- **Document:** sin burbuja, prosa full-width para leer seguido.
- **Visual novel:** placas de nombre con el color de cada voz y paneles de
  papel/violeta suave sobre el fondo del chat.
- **Dialogue colour:** el diálogo del personaje usa `--dialogue-char` (o su
  color por conversación); el del usuario solo en documento/novela. El OOC es
  una píldora mono de tinta con texto papel.

### Mascot poses (signature)
- **Style:** arte chibi con fallback seguro a la pose neutral; aparece en
  bienvenida, estados vacíos y errores, una vez por superficie.

## Do's and Don'ts

### Do:
- **Do** mantener el papel frío (`oklch(0.98 0.006 300)`) y comprobar cada
  cambio en claro y oscuro.
- **Do** usar la pincelada (`rm-caret`) como único cursor de streaming y el
  destello dorado una vez por hito.
- **Do** dejar que 1 px de hairline haga la separación; las sombras solo para
  estados.
- **Do** escribir el cuerpo en Zen Kaku con medida 65–75ch; los títulos en Zen
  Maru y la display solo para el nombre.
- **Do** dar `aria-current`, foco visible y feedback al pulsar en cada control.

### Don't:
- **Don't** reintroducir degradados violeta de fondo ni glass decorativo (el
  grano de papel es la única textura).
- **Don't** usar crema + terracota ni el verde esmeralda para el OOC.
- **Don't** poner la display en párrafos ni etiquetas de eyebrow decorativas
  sobre los títulos.
- **Don't** decorar con destellos fuera de los hitos ni animar cada borde.
- **Don't** sacrificar la densidad de lectura por ornamento: el modo Operate
  manda.
