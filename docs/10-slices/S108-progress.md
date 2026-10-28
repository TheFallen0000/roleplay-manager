# S108 — Bundle de i18n: medición y decisión

**Estado:** Completado (decisión; sin cambios de código)
**Inicio:** 2026-10-28
**Fin:** 2026-10-28

## Descripción

Se evaluó separar o cargar de forma diferida el diccionario de i18n para
reducir el bundle inicial del frontend. La conclusión es **no hacerlo ahora**:
el ahorro neto es pequeño y el riesgo de flash/hidratación no compensa.

Medición sobre el build actual:

- Chunk `i18n-provider`: **126 606 bytes** (≈ **41,3 KB gzip**).
- Diccionarios `en.ts` + `es.ts`: **81 633 bytes** de fuente (≈ **24 KB gzip**).
- El chunk incluye además el contexto de React, `translate`, `hasTranslation` y
  los tipos; no es solo diccionario.

## Decisiones

- **No separar los diccionarios:** el cliente necesita ambos para cambiar de
  idioma sin una recarga de bundle distinta; separar el inactivo y cargarlo de
  forma dinámica ahorra como máximo ~12 KB gzip netos (el idioma activo sigue
  viajando, o viaja en el HTML y aumenta el payload).
- **No usar `Suspense`/flash:** la app renderiza en SSR y el idioma se elige por
  cookie. Cargar el diccionario en el cliente después de hidratar produciría un
  flash de inglés→español o un mismatch de hidratación. El cambio no compensa
  para un ahorro de dos dígitos en KB.
- **Medir antes de tocar:** si en el futuro el bundle inicial se convierte en un
  problema, la opción correcta es medir con un analizador y, si acaso, separar
  por **namespace de pantalla**, no por idioma.
- **Alternativa descartada:** eliminar claves no usadas. El tipado y el uso
  dinámico (`t(category.labelKey)`, errores de API) hacen que un borrado
  automático sea arriesgado para un ahorro marginal.
- **Fuera de alcance:** presupuesto de bundle automatizado, split por
  namespace y lazy-load de tutoriales (ya se cargan en su propia ruta).

## Criterios de aceptación

- [x] Medido el tamaño del chunk y de los diccionarios.
- [x] Evaluadas las alternativas (split por idioma, lazy-load, namespaces).
- [x] Documentada la decisión y las condiciones para reabrirla.
- [x] Sin cambios de código ni de release.

## Verificación

- `gzip -c packages/frontend/dist/client/_astro/i18n-provider.*.js` →
  **41 326 bytes**.
- `gzip -c` de `en.ts` y `es.ts` → **11 234** y **12 175 bytes**.
- El chunk contiene ambos idiomas (`Guardar` y `Create a backup now`).
- El build y el comportamiento de la app no cambian.

## Commits

1. `docs(slice): document S107 pagination and S108 i18n decision` (this commit)
