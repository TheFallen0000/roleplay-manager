---
version: 1
slug: "packages-frontend"
primary_target: "packages/frontend"
related_targets: []
---

# Superficie: rediseño del frontend completo («Ink & Violet»)

- **Modo de visitante:** Operate (escritura larga, sesiones de semanas) con
  momentos Experience (bienvenida, estados vacíos, hitos).
- **Audiencia y tarea:** personas que hacen rol con personajes anime en su
  propio equipo; su tarea es escribir capítulos largos sin perder contexto
  (memoria, resúmenes, versiones, ramas) y controlando su modelo.
- **Contenido/prueba real:** personajes versionados, chat con streaming,
  memoria dinámica, resúmenes, ramas, proveedores propios (Ollama /
  OpenAI-compatible). Nada de claims comerciales ni datos inventados como
  reales; los datos de prototipo se rotulan como sintéticos.
- **Restricciones:** local-first sin cuentas; `pnpm check:arch` (≤500
  líneas, aislamiento entre features, i18n es/en); PWA instalable; los ids
  de tema existentes no se rompen; rinde en escritorio y teléfono.

## Direction contract

THESIS: La app es un cuaderno de historias vivo: tinta sobre papel con la
mascota como anfitriona; rechaza la bienvenida genérica de «tarjeta
centrada con formulario» y el look SaaS claro de shadcn.

OWN-WORLD: Papel frío (no crema) y tinta negra con veta violeta; violeta
vivo para acción y habla, dorado sparkle reservado a hitos, sakura como
secundario emocional; radios generosos, marcos de «tinta» y grano sutil;
Dela Gothic One (display) + Zen Maru Gothic (títulos) + Geist (cuerpo);
en el chat, name plates y diálogo coloreado con lenguaje de novela visual.

STORY: Al abrir por primera vez, la persona entiende «esto es para
escribir historias con mis personajes» y entra con dos decisiones; en el
día a día reconoce su biblioteca como un estante de historias y puede
elegir cómo se leen las escenas (burbuja / documento / novela visual).

FIRST VIEWPORT: Bienvenida a pantalla completa sobre papel con grano
tenue y una aguada de tinta violeta en un borde; wordmark en Dela Gothic
y mascota saludando a la izquierda; a la derecha, las tres decisiones
(idioma, mundo con muestras de color, modo claro/oscuro/sistema)
presentadas como placas de tinta; acción principal violeta «Empezar a
escribir»; un único destello dorado al confirmar.

FORM: Dirección fijada por el usuario en sesión atendida (2026-10-09,
pregunta estructurada); seed key `eddc4fe0` registrado en el roll de
dirección; el roll no se aplicó porque la decisión fijada manda sobre él.

FINISH: unreviewed and undocumented is unfinished; this build ends with
the finish review, the verdict, DESIGN.md, and every shipping raster
carrying its provenance

## Decisiones sin resolver

- Confirmar en los prototipos de Fase 0 la paleta, las fuentes y el
  tratamiento de texturas antes de S59.
- Poses definitivas de la mascota (arte en producción por el usuario).
