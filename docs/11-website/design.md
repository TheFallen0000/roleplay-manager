# Diseño — «El cuaderno abierto»

**Concepto:** la portada es la primera página de un cuaderno de historias; la
documentación es el manual al final de ese mismo cuaderno. La mascota es la
anfitriona, no un sticker repetido. La acción es una: descargar.

**Modo de cada superficie:**

- Portada: **Persuade** — el visitante decide y actúa.
- Documentación: **Read** — el visitante entiende y resuelve.

---

## 1. Público y trabajos

| Pregunta del visitante                    | Dónde se responde                                        |
| ----------------------------------------- | -------------------------------------------------------- |
| ¿Qué es esto?                             | Hero y sección «Why it feels different».                 |
| ¿Es para mí?                              | Tres filas de diferenciación y capturas reales.          |
| ¿Necesito Node.js / una cuenta / una GPU? | Microcopy bajo el CTA y FAQ.                             |
| ¿Qué descargo?                            | Selector de plataforma y página `/download`.             |
| ¿Dónde quedan mis datos?                  | Banda oscura «Your data doesn't live in a cloud» y docs. |
| ¿Cómo empiezo?                            | Tres pasos y guía de instalación.                        |
| ¿Cómo lo uso en el teléfono?              | Sección de móvil y guía Tailscale/LAN/PWA.               |
| ¿Qué pasa si Windows me avisa?            | Nota en la portada + guía con pasos.                     |
| ¿Es gratis? ¿Puedo modificarlo?           | FAQ y footer (AGPL-3.0).                                 |

---

## 2. Voz y copy

- **Idioma:** inglés canónico, español completo. Nada de mezclar frases.
- **Español neutro:** tuteo (`tú`), nunca voseo (`vos`, `instalá`). Usar
  «equipo» en vez de «ordenador», «Wi-Fi» en vez de «WiFi» y «versión» /
  «incidencia» en vez de «release» / «issue» en la prosa de usuario.
- **Tono:** cercano, concreto, sin hype. «Descarga, descomprime, abre».
- **Palabras prohibidas en la portada:** «LLM», «SSE», «SQLite», «AGPL» como
  argumento principal, «release», «asset», «build», «endpoint» sin explicación.
- **Promesas honestas:** «sin cuentas, sin telemetría, tú eliges el proveedor».
  Si usas un proveedor remoto, solo sale el prompt que envías. No decir «nada
  sale nunca».
- **Una idea por párrafo.** Máximo 2–3 líneas en móvil.
- **Los controles nombran la acción:** «Descargar para Windows», «Ver otras
  plataformas», «Buscar en la documentación».
- **Los errores nombran el problema y la salida:** «El puerto 3001 está ocupado;
  cierra la otra app o usa otro PORT».

### Copy aprobado para el prototipo

**EN**

> **Your story lives on your machine.**
> Roleplay Manager is a local-first notebook for long chats with AI characters:
> versioned characters, real memory, branches — and your data in a folder you own.
>
> **Download for Windows** · Other platforms
> v1.47.0 · 62 MB · No Node.js · No account
>
> **Open the notebook.**
> Your next story is one folder away.

**ES**

> **Tu historia vive en tu equipo.**
> Roleplay Manager es un cuaderno local-first para conversaciones largas con
> personajes de IA: personajes versionados, memoria real, ramas y tus datos en
> una carpeta que es tuya.
>
> **Descargar para Windows** · Otras plataformas
> v1.47.0 · 62 MB · Sin Node.js · Sin cuenta
>
> **Abre el cuaderno.**
> Tu próxima historia está a una carpeta de distancia.

---

## 3. Mapa del sitio

```text
/                          Portada (EN)
/es/                       Portada (ES)

/download                  Todas las plataformas, requisitos y primera ejecución
/es/download

/docs/                     Inicio de documentación
/docs/getting-started/     Qué es, instalación, primeros pasos, actualizar
/docs/guides/              Personajes, chats/ramas, memoria, proveedores, móvil...
/docs/reference/           Ajustes, variables, carpeta portátil, formato, glosario
/docs/contributing/        Desarrollo, arquitectura, tests, releases, licencia
/es/docs/...               Espejo en español

/404                       Mascota + enlaces útiles
```

Los slugs son ingleses en ambos idiomas (`/es/docs/getting-started/`) para no
romper enlaces ni duplicar mantenimiento. Los títulos y el contenido se traducen.

---

## 4. Portada, sección a sección

### 4.1 Header

- Altura 64 px en escritorio, 56–64 px en móvil.
- Fondo papel sólido, hairline inferior, sin blur decorativo.
- Marca: cara de la mascota + «Roleplay Manager» en Dela Gothic.
- Chip de versión dorado: **único uso del dorado en la página**.
- Navegación: Documentación · Cómo funciona · Funciones.
- Acciones: idioma EN/ES, tema, GitHub, **Descargar** primario.
- Móvil: marca, tema, menú. Dentro del menú: navegación, idioma, tema, GitHub y
  descarga.

### 4.2 Hero

- **H1:** «Your story lives on your machine.» / «Tu historia vive en tu equipo.»
  La segunda frase en violeta, sin degradado.
- **Sub:** una frase de 2–3 líneas con las tres promesas: local-first,
  continuidad, datos propios.
- **CTA primario:** detectado por SO. En móvil: «Download for your PC».
- **CTA secundario:** «Other platforms» / «Otras plataformas».
- **Microcopy:** versión, tamaño, «No Node.js», «No account». En móvil, el
  tamaño se sustituye por «Windows, Linux or macOS».
- **Visual:** captura real de la bienvenida Sakura sobre tarjeta de papel. La
  mascota ya aparece dentro de la captura, así que no se superpone otra.
- **Móvil:** primero copy y CTA; después la captura, sin mascota adicional.

### 4.3 Franja de confianza

Cuatro hechos, no eslóganes:

1. **100% local** — tus datos viven en `./data`.
2. **Open source** — AGPL-3.0, sin telemetría.
3. **Windows · Linux · macOS** — paquete portátil, sin instalador.
4. **Tu proveedor** — Ollama o compatible con OpenAI.

En móvil, 2×2. Sin iconos decorativos; la tipografía y los filos separan.

### 4.4 «Why it feels different»

Una **tabla editorial** de tres filas, no tres tarjetas iguales:

| Etiqueta   | Titular                              | Cuerpo                                    |
| ---------- | ------------------------------------ | ----------------------------------------- |
| Local      | Your story never leaves your folder. | SQLite y `data/`; mueve, copia, respalda. |
| Continuity | Long stories don't lose the thread.  | Versiones, memoria, resúmenes, ramas.     |
| Provider   | You choose the intelligence.         | Ollama local o endpoint compatible.       |

En móvil, la etiqueta va encima del titular. Sin números de sección: no son una
secuencia.

### 4.5 «See the notebook»

- Tres pestañas: **Character library**, **Chat** y **Phone**. Sin autoplay.
- Una captura grande por pestaña, con pie de foto y nota «Screenshot from the
  app · synthetic content».
- En móvil, las pestañas se convierten en una fila horizontal y la captura ocupa
  el ancho.
- No hay carrusel automático; el usuario decide.

### 4.6 «From download to first scene»

Secuencia real de tres pasos:

1. **Download and unzip** — elige el paquete y guárdalo en Documentos.
2. **Open the launcher** — `start.cmd` o `./start.sh`; el navegador abre en
   `localhost:3001`.
3. **Connect your AI** — Ollama o compatible con OpenAI; elige modelo y crea el
   personaje.

Debajo, una nota con enlace a la guía: el primer arranque puede mostrar un aviso
del sistema porque la app no está firmada.

Los números 01/02/03 se permiten porque son una secuencia real.

### 4.7 «A notebook that remembers»

- Lista editorial de cuatro funciones: personajes versionados, ramas/rebobinado,
  memoria/resúmenes, estilos de lectura.
- A la derecha, captura de la biblioteca sobre tarjeta de papel.
- En móvil, la lista va primero y la captura después.
- Sin tarjetas iguales; los filos separan las filas.

### 4.8 Banda oscura «Your data doesn't live in a cloud»

- Fondo `Night Ink`, texto papel. Es el único bloque oscuro de la portada.
- Texto: dónde viven los datos, qué toca una actualización y qué sale del equipo
  si usas un proveedor remoto.
- Diagrama de la carpeta portátil en mono, dentro de una tarjeta oscura:
  ```
  RoleplayManager/
  ├── data/        ← your story
  ├── backups/     ← safety copies
  ├── versions/    ← installed versions
  └── start.sh
  ```
- Enlace a la guía de datos y actualizaciones.
- Sin dorado; el violeta suave marca `data/`.

### 4.9 «Your story fits in your pocket»

- Copy: la app se ejecuta en el equipo; el teléfono la abre por un enlace privado,
  sin app nativa.
- Tres bullets: Tailscale, Wi-Fi doméstica, PWA.
- Captura móvil en un marco de teléfono simple sobre fondo violeta suave.
- CTA: «Phone access guide».
- No prometer una app móvil que no existe.

### 4.10 «The manual, without fine print»

- Índice tipo libro, con cuatro filas, número, título y descripción:
  01 Instalar · 02 Conectar tu IA · 03 Crear un personaje · 04 Usarla en el móvil.
- CTA: «Browse the documentation».
- En móvil, las descripciones se ocultan y las filas siguen siendo tocables.

### 4.11 FAQ

Acordeón nativo (`<details>`), una pregunta por fila, sin tarjetas:

- ¿Es gratis?
- ¿Necesito Node.js?
- ¿Necesito una API key?
- ¿Dónde están mis personajes y chats?
- ¿Funcionará en mi equipo?
- ¿Hay app móvil?
- ¿Por qué me avisa Windows o macOS?

Las respuestas son cortas y enlazan a la guía cuando hace falta. No se inventan
cifras ni casos de uso.

### 4.12 Cierre y footer

- Cierre: «Open the notebook.» con «notebook» en violeta; dos botones
  (descargar / leer docs) y una nota de licencia.
- Footer: marca y tagline; columnas Producto, Documentación, Proyecto; licencia,
  copyright y enlace a GitHub. Sin Discord ni Ko-fi si no existen.
- El footer es el lugar de AGPL; no el hero.

---

## 5. Wireframe móvil

```text
┌──────────────────────────────┐
│ ◉ Roleplay Manager   ☰       │
├──────────────────────────────┤
│ Tu historia vive             │
│ en tu equipo.                │
│                              │
│ Rol con IA, sin cuentas...   │
│ ┌──────────────────────────┐ │
│ │ ↓ Descargar para tu PC   │ │
│ └──────────────────────────┘ │
│ Otras plataformas            │
│ v1.47.0 · Sin Node.js        │
│                              │
│ [mascota] [captura chat]     │
├──────────────────────────────┤
│ 100% local  │ Open source    │
│ Windows...  │ Tu proveedor   │
├──────────────────────────────┤
│ Por qué se siente distinto   │
│ LOCAL                        │
│ Tu historia nunca sale...    │
│ CONTINUIDAD                  │
│ ...                          │
├──────────────────────────────┤
│ Mira el cuaderno             │
│ [Biblioteca] [Chat] [Teléfono]│
│ [captura]                    │
├──────────────────────────────┤
│ De la descarga a la 1ª escena│
│ 01  Descarga y descomprime   │
│ 02  Abre el lanzador         │
│ 03  Conecta tu IA            │
├──────────────────────────────┤
│ Un cuaderno que recuerda     │
│ [4 funciones]                │
│ [captura biblioteca]         │
├──────────────────────────────┤
│ [banda oscura: tus datos]    │
├──────────────────────────────┤
│ Tu historia en el bolsillo   │
│ [teléfono]                   │
├──────────────────────────────┤
│ El manual, sin letra pequeña │
│ 01 Instalar...               │
│ 02 Conectar...               │
│ 03 Crear...                  │
│ 04 Teléfono...               │
├──────────────────────────────┤
│ Preguntas que frenan         │
│ [+ detalles]                 │
├──────────────────────────────┤
│ Abre el cuaderno.            │
│ [Descargar] [Leer docs]      │
├──────────────────────────────┤
│ Footer                       │
└──────────────────────────────┘
```

---

## 6. UX de descarga

### Escritorio

- **Windows:** CTA directo al ZIP x64. Es la opción más frecuente y no necesita
  elegir arquitectura.
- **macOS:** CTA «Download for macOS» que abre el selector, porque hay Apple
  Silicon e Intel. La opción recomendada se marca según el SO detectado.
- **Linux:** CTA «Download for Linux» que abre el selector x64/arm64.
- **SO desconocido:** «Download» + selector.

### Móvil

- CTA **«Download for your PC»**, no un paquete de escritorio.
- Abre el selector de sistema.
- Debajo: «Already have it? Open on your phone» → guía de Tailscale/LAN/PWA.
- No hay botón de App Store ni APK.

### Selector de plataforma

- Diálogo centrado en escritorio, bottom sheet en móvil.
- Cinco filas: icono, plataforma, arquitectura, tamaño y enlace.
- «Recommended for you» solo en la opción detectada.
- Nota: «Not sure? Windows x64 for most PCs, Apple Silicon for M1–M4, Linux x64
  for most distros».
- Enlace a todas las releases.

### Fallback y datos

- La portada se genera con un snapshot de la última release (versión, assets,
  tamaños). Si la API falla, usa el snapshot versionado y enlaza a
  `/releases/latest`.
- Sin JS, el CTA principal enlaza a la página de releases; el selector sigue
  accesible en `/download`.
- No auto-descargar. El usuario pulsa.
- Mostrar SHA-256 solo en un desplegable avanzado de `/download`; no en el hero.

---

## 7. Documentación

### 7.1 Información

| Grupo          | Páginas                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empezar**    | Qué es Roleplay Manager · Instalación Windows · Linux · macOS · Primeros pasos · Actualizar y volver atrás                                                                                            |
| **Guías**      | Personajes y versiones · Conversaciones, streaming y ramas · Memoria y resúmenes · Proveedores · Personalizar el chat · Acceso desde el teléfono · Datos, copias y exportación · Problemas y registro |
| **Referencia** | Ajustes de conversación · Variables de entorno y puertos · Estructura de la carpeta portátil · Formato de personaje · Glosario · FAQ                                                                  |
| **Contribuir** | Entorno de desarrollo · Arquitectura · Tests y quality gates · Releases · Licencia                                                                                                                    |

### 7.2 Inicio de docs

No un muro de texto:

- Buscador grande.
- Tres tarjetas de inicio: **Instala en 5 minutos**, **Conecta tu IA**, **Crea tu
  primer personaje**.
- «Guías populares»: memoria, ramas, móvil, actualizaciones.
- «¿Atascado?»: solución de problemas + issues de GitHub.

### 7.3 Plantilla de página

1. Título y una frase de qué resuelve.
2. _Antes de empezar_ (requisitos, versión, permisos).
3. Pasos numerados con capturas.
4. _Si algo falla_ (2–3 errores típicos y su salida).
5. Enlaces anterior/siguiente.
6. «Editar esta página en GitHub».

### 7.4 Layout

- Header de docs: marca, «Documentation», búsqueda, idioma, tema, GitHub y
  Descargar.
- Sidebar de papel con grupos y página activa en violeta suave; en móvil se
  convierte en drawer.
- Columna de lectura de 60–75 caracteres; TOC a la derecha en escritorio.
- Callouts con hairline, no barras de color; warning en crimson.
- Código con fondo noche y botón Copiar.
- Búsqueda Pagefind en modal; atajo `/` o `Ctrl/Cmd+K`.
- «¿Te ha servido?» con feedback local y enlace a issues.
- 404 con la mascota y enlaces a inicio/docs.

### 7.5 Contenido

- Reescribir para personas, no copiar el README tal cual.
- Cada guía tiene un objetivo, no una lista de funciones.
- Las capturas se etiquetan como contenido sintético cuando lo son.
- Glosario para modelo, proveedor, contexto, memoria, resumen, rama y OOC.
- Enlaces internos generosos; cada función enlaza a su guía.

---

## 8. Sistema visual

### 8.1 Tokens

| Token                                 | Uso                                                   |
| ------------------------------------- | ----------------------------------------------------- |
| `--paper` `oklch(0.98 0.006 300)`     | Fondo claro.                                          |
| `--card` `oklch(0.995 0.003 300)`     | Tarjetas, capturas, superficies.                      |
| `--ink` `oklch(0.2 0.02 300)`         | Texto principal.                                      |
| `--ink-faint` `oklch(0.51 0.024 300)` | Texto secundario (AA).                                |
| `--violet` `oklch(0.54 0.24 300)`     | CTA, enlaces, foco, acento.                           |
| `--violet-soft`                       | Chips, selección, fondo del teléfono.                 |
| `--gold`                              | Una vez: chip de versión.                             |
| `--night`                             | Banda de datos y modo oscuro.                         |
| `--hairline`                          | Bordes de 1 px; la estructura no se hace con sombras. |

### 8.2 Tipografía

- **Dela Gothic One:** wordmark y momentos grandes; nunca párrafos.
- **Zen Maru Gothic 900:** H1/H2. La H1 de portada es un momento grande, pero no
  se usa Dela en frases largas.
- **Zen Kaku Gothic New 400/500:** cuerpo de 16–18 px; 1.65–1.75 de interlineado.
- **Mono del sistema:** rutas, código, datos. No como decoración.
- Medida de lectura 60–75ch; titulares con `text-wrap: balance`.
- En móvil, H1 2.35–3.2rem; cuerpo 16 px; metadatos ≥12 px.

### 8.3 Componentes

- **Botón primario:** violeta, 2.9–3.35rem de alto, radio 0.75–1.05rem; en móvil
  ancho completo.
- **Botón outline:** papel con hairline; secundario.
- **Chip de versión:** píldora dorada; solo una.
- **Tarjeta de captura:** papel, hairline, radio 1.35rem, padding 0.55rem.
- **Fila de tabla/ledger:** hairline inferior, etiqueta a la izquierda en
  escritorio, encima en móvil.
- **Acordeón:** `<details>` con signo + dibujado en CSS.
- **Bottom sheet:** selector de plataforma en móvil.
- **Callout:** hairline + icono; warning en crimson; sin borde lateral grueso.

### 8.4 Materiales y movimiento

- Grano de papel sutil como única textura; nada de degradados ni glass.
- Sombras solo para estado (hover, diálogo); en reposo todo plano.
- Movimiento: 120–280 ms, ease-out; una entrada suave y el cursor-pincel de
  streaming como guiño. Respetar `prefers-reduced-motion`.
- La mascota aparece una vez por superficie: hero y 404.
- Las capturas son reales; el marco de teléfono es simple, sin maquetas falsas.

### 8.5 Modo oscuro

- Tokens `Night Ink`; las capturas siguen sobre tarjeta de papel, como una foto
  sobre una mesa oscura.
- La banda de datos ya es oscura en ambos modos.
- Comprobar contraste AA en ambos modos; el violeta claro del modo oscuro no se
  usa sobre papel.

---

## 9. Responsive y accesibilidad

### Breakpoints

- 40rem: hero a una columna, CTAs full width, tabs en fila, trust 2×2.
- 48rem: galería a una columna; ocultar descripciones del índice.
- 56rem: secciones a una columna; docs sidebar aún visible.
- 60rem: nav principal oculta; menú; docs sidebar a drawer.
- 76rem: ocultar TOC de docs.

### Reglas

- Objetivos táctiles ≥44 px; CTA ≥52 px.
- Inputs a 16 px para evitar zoom en iOS.
- Foco visible de 2 px en violeta; `aria-current` en navegación.
- `aria-expanded` en menús y acordeones; `aria-selected` en tabs.
- Skip link, landmarks, alt text, contraste AA.
- `prefers-reduced-motion`.
- Sin hover como única información.
- Sin scroll horizontal en 360 px.

---

## 10. SEO y contenido

- Título y descripción por página; canonical.
- `hreflang` EN/ES + `x-default`.
- Sitemap y `robots.txt`.
- JSON-LD `SoftwareApplication`: nombre, sistemas, versión, licencia, precio 0,
  `downloadUrl`. Sin `aggregateRating` inventado.
- OG image 1200×630 por idioma: mascota + wordmark + tagline sobre papel.
- Las capturas llevan alt descriptivo y pie.
- El contenido principal es estático; no depende de JS para indexarse.
- No analytics por defecto; las descargas de GitHub son la señal.

---

## 11. Criterios de aceptación del prototipo

- [x] Portada completa en 360, 390, 768, 1024, 1440 y 1600 px.
- [x] CTA visible en el primer viewport móvil.
- [x] Detección de SO: Windows directo, macOS/Linux selector, móvil «tu PC».
- [x] Selector con 5 assets, tamaños y recomendación única.
- [x] Idioma EN/ES con autodetección y persistencia.
- [x] Tema claro/oscuro/sistema.
- [x] Galería de capturas con tabs accesibles.
- [x] FAQ nativa.
- [x] Docs con sidebar, búsqueda modal, TOC, callouts, código y feedback.
- [x] Sin overflow horizontal a 390 px.
- [x] Sin testimonios, prensa ni métricas inventadas.

Pendiente para producción:

- [ ] Capturas EN/ES.
- [ ] Datos de release reales en build.
- [ ] Fuentes self-hosted.
- [ ] Página `/download`.
- [ ] 404.
- [ ] OG images.
- [ ] Lighthouse móvil ≥95.
- [ ] `hreflang`, sitemap y JSON-LD.
- [ ] Cloudflare Pages + dominio.

---

## 12. Lo que no haría

- Copiar los testimonios o la prensa de GameNative.
- Copiar el muro de texto inicial de SillyTavern.
- Poner un degradado violeta de fondo, glass o la mascota en cada sección.
- Enseñar «Node.js», «SQLite» o «AGPL» como argumento principal del hero.
- Un carrusel automático o un vídeo con sonido que rape el móvil.
- Obligar a pasar por GitHub para entender qué se descarga.
- Añadir analytics o cuentas «porque todo el mundo lo hace».
- Prometer una app móvil nativa que no existe.
