# S71 — Pantalla de tutoriales bilingües

**Estado:** Completado
**Inicio:** 2026-10-12
**Fin:** 2026-10-12

## Descripción

No había un sitio donde consultar las cosas que no son evidentes: conectar el
teléfono, instalar la app en el móvil, configurar un proveedor, exportar o
importar personajes, usar ramas… Ahora existe `/tutorials`: nueve guías paso a
paso agrupadas en cuatro categorías, con buscador, cada una en un diálogo con
pasos numerados, consejos y un botón que lleva a la función. Todo el contenido
está en español e inglés.

## Decisiones

- **Tarjetas → diálogo** (elegido) con el `Accordion`/`Dialog` de la app: se ve
  el catálogo entero de un vistazo y se lee una guía sin salir de la página.
- **Contenido largo fuera de i18n**: `lib/tutorials/content.{es,en}.ts` tipados
  contra `TutorialContent` (paridad forzada por TypeScript), porque los
  diccionarios i18n son para etiquetas cortas. Queda documentado como excepción
  en `AGENTS.md`, junto a la regla de mantener los pasos fieles a la UI real.
- **Sin markdown**: la app no tiene renderer y no merecía la pena añadir uno;
  el contenido son pasos estructurados (`title` + `body`) que se pintan con los
  componentes propios.
- **Deep links `?t=<id>`**: la página Astro lee el parámetro en el servidor y
  se lo pasa al panel (evita `setState` en efectos); al abrir/cerrar un diálogo
  la URL se actualiza con `replaceState` para poder copiarla y compartirla.
- **Entradas**: grupo **Ayuda** en el sidebar + enlace desde la bienvenida. El
  tutorial deja de exigir onboarding terminado: `/tutorials` renderiza el shell
  aunque la cookie de bienvenida no esté puesta (si no, el enlace volvía a la
  bienvenida).
- **Botones de acción** como `<a>` internos (`/settings/providers`,
  `/settings/updates`, `/`), lo que respeta el aislamiento entre features.
- **Sin capturas en v1** (fuera de alcance): los pasos + el botón a la función
  envejecen mejor. `?t=` ya permite enlazar tutoriales desde cualquier diálogo en
  el futuro. Si hicieran falta, quedan en **PM.42**.

## Criterios de aceptación

- [x] Página `/tutorials` con 4 categorías, 9 guías, buscador y tarjetas.
- [x] Diálogos con pasos numerados, consejos y botón a la función.
- [x] Deep links `?t=` que abren la guía y actualizan la URL al cerrar.
- [x] Grupo **Ayuda** en el sidebar y enlace desde la bienvenida (también sin
      onboarding terminado).
- [x] Contenido es/en completo, tipado y comprobado por tests de integridad.
- [x] `pnpm check` 7/7, suites en verde, build+smoke, PR con CI verde y release
      v1.44.0.

## Verificación

- Tests nuevos: catálogo (cobertura en ambos idiomas, categorías, ids, acciones
  internas, filtro sin distinguir mayúsculas/acentos) y panel (listado por
  categorías, filtrado, sin resultados, diálogo con pasos/consejos/CTA y
  apertura por URL) → frontend **295** tests (285 + 10).
- `pnpm check`: 7/7, 0 warnings. Smoke del paquete: **PASS**.
- E2E con el paquete (Playwright, dominio a 1000×950):
  - `/tutorials` directo: **9 tarjetas** y las **4 categorías** presentes.
  - Abrir «Conectar el teléfono»: diálogo con pasos y consejos, `?t=phone-access`
    en la URL; `Esc` lo cierra y limpia la URL.
  - Buscar «proveedor»: 2 tarjetas (proveedores y datos) y el resto oculto.
  - Deep link directo `/tutorials?t=data-updates`: diálogo abierto con el botón
    «Ir a Actualizaciones».
  - Sidebar: el enlace **Tutoriales** navega a la página; en un contexto sin
    onboarding, el enlace de la bienvenida abre el catálogo dentro del shell.
  - Capturas revisadas (catálogo, diálogo, búsqueda).

## Commits

1. `feat(frontend): add the tutorials screen with bilingual guides`
2. `docs: add S71 progress and document tutorial content`
3. `release: bump to v1.44.0 and add changelog entry`
