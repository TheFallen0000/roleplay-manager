# S27 — Bienvenida y menubar (PM.13 + PM.14)

**Estado:** Completado
**Inicio:** 2026-08-12
**Fin:** 2026-08-12

## Descripción

Cierra PM.11 en la interfaz: una **pantalla de bienvenida** en el primer
arranque que pregunta idioma, tema y modo (PM.13), y un **menubar superior** con
menús de Tema e Idioma que sustituye a los dos botones de icono de la cabecera
(PM.14, cuya mitad de tema ya existía desde S22).

## Decisions

- **PM.14 — menubar con dos menús**: el componente `menubar` se añadió a
  `@workspace/ui` envuelto sobre Base UI (`@base-ui/react/menubar` + el
  `dropdown-menu` del repo), adaptado a mano desde el registro `base-nova`:
  el CLI de shadcn intentó instalar un paquete inexistente (`cn`, un alias
  interno del registro) y sobrescribir `dropdown-menu.tsx`, así que se
  descartó y se creó el archivo a mano con los alias y los iconos del repo.
  El menubar vive en la cabecera (tras el `SidebarTrigger`) con los menús
  **Tema** (temas + modo) e **Idioma** (EN/ES); los antiguos
  `theme-switcher.tsx` / `language-switcher.tsx` se eliminaron.
- **PM.13 — bienvenida sin flash**: `base.astro` decide en servidor con la
  cookie `rm_onboarded` (helper puro `lib/onboarding.ts`). Sin cookie renderiza
  `<Welcome>` a pantalla completa (idioma + tema + modo con los valores actuales
  preseleccionados); al pulsar Continuar guarda la cookie y recarga, y la app
  aparece en el idioma elegido. No hay ruta nueva ni parpadeo.
- **`setLocale` con `{ reload: false }`**: la bienvenida cambia de idioma al
  instante (su propio provider se re-renderiza) sin recargar; el resto de islas
  siguen recargando la página como hasta ahora (comportamiento por defecto).
- **Namespace `welcome`** en los diccionarios; los selectores reutilizan
  `theme.*` y `language.*`. La bienvenida usa `ToggleGroup` (2–3 opciones).

## Criterios de aceptación

- [x] Primer arranque (sin `rm_onboarded`) muestra la bienvenida en cualquier
      página, sin flash y en el idioma de la cookie.
- [x] La bienvenida aplica idioma (sin recargar), tema y modo; Continuar marca
      `rm_onboarded=1` y entra en la app.
- [x] Menubar superior con Tema (3 temas + modo) e Idioma (EN/ES) en la
      cabecera; switchers antiguos eliminados.
- [x] Tests nuevos (welcome + menubar) y SSR verificado en EN/ES.
- [x] `pnpm check` sin warnings; frontend (171) y backend (318) en verde.

## Commits

1. `feat(ui): add the menubar component`
2. `feat(frontend): replace the header switchers with a menubar (PM.14)`
3. `feat(frontend): add the first-run welcome screen (PM.13)`
4. `test(frontend): cover the welcome screen and the menubar`
5. `docs(backlog): mark PM.13 and PM.14 as done in S27`
6. `release: bump to v1.18.0 and add changelog entry`
