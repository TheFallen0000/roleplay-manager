# S79 — Kit de prensa y material de lanzamiento

**Estado:** Completado
**Inicio:** 2026-10-13
**Fin:** 2026-10-13

## Descripción

Prepara todo lo necesario para anunciar el proyecto: borradores listos para
publicar (ES/EN), la tarjeta social del repositorio, un montaje del flujo del
teléfono y capturas en los README. Sin cambios en la app.

## Decisiones

- **Kit en `docs/press/`**: `announcements.en.md` / `announcements.es.md` con
  post largo (historia honesta de creador), post corto para X/Bluesky, versión
  de comentario, variante Show HN y una FAQ para la sección de comentarios; más
  un `README.md` con el orden recomendado por comunidad, etiqueta y los pasos
  manuales (subir la social preview en GitHub).
- **Solo hechos**: sin cifras, testimonios ni comparaciones no verificables;
  requisitos honestos siempre (la PC ejecuta la app; el teléfono es una pantalla
  remota; Tailscale solo para el túnel).
- **El gancho del teléfono** va arriba en todos los textos y tiene su propio
  arte (`phone-flow.png`): interruptor + QR → el teléfono abre la app → se
  instala como PWA.
- **Arte generado**, no de stock: `social-preview.png` (1280×640, mascota
  original + Dela Gothic + Zen Kaku de las fuentes del repo) y `phone-flow.png`
  (tres capturas reales del paquete: el diálogo «Acceso desde el teléfono» con
  un QR real, el chat en móvil y el aviso de instalación en iPhone).
- Captions del arte en inglés (audiencia más amplia); textos en los dos idiomas.
- **README (EN/ES)**: sección de capturas con las tres imágenes ya publicadas y
  enlace al flujo del teléfono.

## Criterios de aceptación

- [x] Borradores ES/EN completos (largo, corto, comentario, Show HN, FAQ).
- [x] Guía de publicación con orden por comunidad y pasos manuales.
- [x] `social-preview.png` y `phone-flow.png` revisados uno a uno.
- [x] Capturas en ambos READMEs.
- [x] Gates en verde (solo docs) y CHANGELOG en `[Unreleased]`.

## Verificación

- Arte revisado uno a uno (tarjeta social y montaje) contra la app real: el QR
  del panel 1 pertenece a la red doméstica activada en el paquete de prueba.
- `pnpm check` 7/7 (sin tocar `src/`).
- Anécdota útil: el paquete de pruebas (v1.45.0) mostró el aviso «Hay una
  versión nueva (1.46.0)» al abrirse — el actualizador detectando la release
  recién publicada ✓ (y de paso fue lo que bloqueaba los clics de la captura
  hasta descartarlo).

## Commits

1. `docs(press): add announcement drafts, social preview and phone-flow artwork`
2. `docs(readme): show the app screenshots`
3. `docs(slice): add S79 progress`
