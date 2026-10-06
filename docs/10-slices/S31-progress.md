# S31 — Imágenes de conversación en export/import (PM.3 + PM.5, fase B)

**Estado:** Completado
**Inicio:** 2026-10-06
**Fin:** 2026-10-06

## Descripción

Cierra el ciclo del fondo y de la imagen personalizada: las imágenes de
conversación viajan en la exportación **una sola vez por asset** (aunque varias
ramas la compartan) y al importar se recrean **una vez** y se remapean todas las
referencias. Además se corrige que la imagen personalizada solo se exportaba
como id (sin binario), lo que dejaba referencias rotas al importar.

## Decisiones

- **Nueva sección** `conversations.images` (hija de `conversations`, marcada por
  defecto en el gestor de exportación) con la etiqueta "Imágenes de
  conversación".
- **Mapa deduplicado** a nivel superior:
  `conversationImages: [{ assetId, mimeType, base64 }]`, una entrada por asset
  único referenciado por cualquier conversación (personalizada o fondo).
- **Referencias por conversación a nivel superior**:
  `customProfileImageAssetId`, `backgroundImageAssetId`, `backgroundFit` y
  `backgroundScrim`. Los archivos antiguos que guardaban la imagen personalizada
  dentro de `settings` se siguen leyendo (fallback de compatibilidad).
- **Import**: un asset por id único con el set de variantes según su uso
  (unión si se usa como perfil y como fondo); el mismo id nuevo se asigna a
  todas las ramas que lo compartían. Las referencias sin binario en el archivo
  se limpian a `null` en lugar de quedar rotas.
- **`includeProfileImageBase64`** sigue aplicando solo a la imagen de perfil del
  personaje; la sección de imágenes de conversación es opt-in y siempre incluye
  el binario.
- **Verificación real** (base temporal): 2 conversaciones compartiendo un asset
  → 1 imagen exportada, 1 asset nuevo reutilizado por ambas al importar,
  fit/velo preservados y variantes thumbnail/small/medium/large (uso doble).

## Criterios de aceptación

- [x] La sección `conversations.images` aparece en el gestor y viaja por defecto.
- [x] Un asset compartido por varias ramas se exporta una sola vez.
- [x] Al importar se crea un único asset y todas las ramas lo referencian.
- [x] Compatibilidad con exportaciones antiguas (id en `settings`).
- [x] Referencias sin binario se limpian (no quedan ids rotos).
- [x] Fit y velo viajan y se restauran.
- [x] `pnpm check` sin warnings; frontend (188) y backend (361) en verde.
- [x] Round-trip verificado con base temporal.

## Commits

1. `feat(shared): conversation image export section and dedup payload`
2. `feat(backend): deduplicate conversation images on export and import`
3. `feat(frontend): add the conversation images export section`
4. `test(export): cover image dedup, remap and legacy fallback`
5. `docs(backlog): complete PM.3 + PM.5 phase B in S31`
6. `release: bump to v1.23.0 and add changelog entry`
