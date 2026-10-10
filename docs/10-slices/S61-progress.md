# S61 — Chat con carácter

**Estado:** Completado
**Inicio:** 2026-10-09
**Fin:** 2026-10-09

## Descripción

Tercer slice del rediseño (`docs/redesign-plan.md` §6): el chat gana **apariencia
por conversación** — estilo de mensaje (burbuja, documento o novela visual) y
colores de diálogo para el personaje y para el usuario — con el backend
completo (migración, validación, ramas, export/import y plantillas) y el render
de los tres estilos: prosa a todo el ancho en documento, placas de nombre y
paneles sobre el fondo en novela visual. El OOC (`//…//`) pasa a ser una
pastilla mono legible en cualquier estilo y modo.

## Decisiones

- **Persistencia por conversación** (decidido con el usuario en Fase 0): tres
  columnas en `conversations` — `message_style` (`bubble` por defecto),
  `character_dialogue_color` y `user_dialogue_color` (hex `#RRGGBB` o `null` =
  tema). Las ramas las heredan; el export las lleva dentro de
  `settings` y la plantilla de ajustes puede aplicarlas (campos opcionales:
  los exports antiguos importan con los valores por defecto).
- **Validación en dos capas**: helpers compartidos
  (`@workspace/shared/lib/message-style` y `/dialogue-color`) usados por el
  caso de uso (lanza `INVALID_MESSAGE_STYLE` / `INVALID_DIALOGUE_COLOR`), por
  el import (normaliza a valores seguros) y por las rutas (zod). El caso de uso
  de plantillas omite colores inválidos en vez de romper la aplicación.
- **Los tres estilos**:
  - *Burbuja*: el comportamiento de siempre (usuario en primario, personaje en
    muted).
  - *Documento*: `ghost` (sin burbuja), ancho completo y algo más de
    interlineado; ambos hablantes alineados a la izquierda.
  - *Novela visual*: personaje en panel `outline` (papel con borde) y usuario
    en panel `tinted` (lavanda del tema), ambos full-width con **placa de
    nombre** (nombre del personaje o «Tú»), pensado para vivir sobre el fondo
    del chat.
- **Colores de diálogo**: el personaje tiñe su diálogo en los tres estilos; el
  usuario, en documento y novela visual (en burbuja conserva el color de
  contraste del botón). Los colores personalizados se aclaran un 18 % hacia
  blanco **solo en modo oscuro** (utilidades `.rm-dialogue-char|user` en
  `globals.css`), para que los tonos medios elegidos sigan legibles; los
  valores por defecto del tema cambian de forma imperceptible.
- **OOC como pastilla**: `bg-foreground/85` + `text-background` + mono; se lee
  sobre papel, tarjeta, panel y burbuja, en claro y oscuro. Sustituye al verde
  esmeralda anterior (el color del tema oscuro podía pelearse con las
  superficies).
- **Bug encontrado y corregido durante la verificación**: el esquema zod de la
  ruta `PATCH /conversations/:id/settings` (y el de plantillas de importación)
  descartaba en silencio los campos nuevos — el mismo tipo de bug que ya pasó
  con `playerCharacterId` (1.14.1). Corregido, con **test de regresión de
  ruta** (`conversation-settings.routes.test.ts`).
- **Render de mensajes**: `MessageBubble` recibe `messageStyle` y
  `characterName`; `chat.tsx` publica las variables CSS
  (`--rm-dialogue-char|user`) y `data-message-style` en el scroller. La UI de
  apariencia vive en Personalización (tarjetas de estilo + filas de color con
  «Tema»), con guardado inmediato y toast, siguiendo el patrón del modo de
  memoria.
- **Trade-off anotado**: un único hex rige ambos modos; la paleta usa tonos
  medios y el aclarado en oscuro compensa el resto. Queda como punto a
  revisar si el usuario pide colores por modo (S62).

## Criterios de aceptación

- [x] Migración `0014_groovy_vance_astro.sql` y columnas con defaults.
- [x] Entidad, repositorio, create/get/update/ramas y export/import/plantillas
      con los campos nuevos; superficies DTO completas.
- [x] Validación de estilo y colores (caso de uso + zod) y normalización en
      import.
- [x] UI de apariencia en Personalización (estilo + dos colores).
- [x] Los tres estilos de mensaje, placas de novela visual y pastilla OOC.
- [x] Ramas heredan la apariencia (test) y export/import la conservan (test).
- [x] Tests: backend 486 (85 archivos), frontend 265 (42 archivos);
      `pnpm check` 4/4.
- [x] Verificación visual con capturas reales: burbuja, documento, novela
      visual (claro y oscuro) y el diálogo de apariencia.

## Verificación

- `pnpm check` 4/4; `pnpm --filter @workspace/backend test` 486 ✓;
  `pnpm --filter @workspace/frontend exec vitest run` 265 ✓.
- Capturas con Chrome headless contra un backend aislado
  (`DATABASE_PATH` + `DATA_DIR` temporales, `TURBO_ENV_MODE=loose`) con un chat
  sembrado por API + SQLite. Se revisaron los tres estilos, oscuro y la UI de
  apariencia.
- **Caveat de captura documentado**: `content-visibility: auto` (scroller de
  mensajes) produce *smearing* en capturas headless de CDP hasta que hay un
  scroll real; un A/B con el código anterior mostró el mismo artefacto, así que
  no es de esta implementación. Los scripts de captura hacen un micro-scroll
  antes de disparar.
- Detector de `impeccable` sobre los componentes tocados: sin hallazgos.

## Commits

1. `feat(shared): add per-conversation appearance types and helpers`
2. `feat(backend): persist message style and dialogue colours per conversation`
3. `feat(ui): add dialogue colour utilities`
4. `feat(frontend): render the three message styles and per-chat appearance`
5. `docs(slice): add S61 progress`
6. `release: bump to v1.39.0 and add changelog entry`
