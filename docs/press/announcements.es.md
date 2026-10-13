# Anuncios — Español

Borradores listos para publicar **Roleplay Manager**. Reglas: solo hechos — sin
cifras inventadas, sin testimonios, sin comparaciones que no se puedan verificar.
Requisitos honestos: la PC ejecuta la app y el teléfono es una pantalla remota.

Enlace del repo para todo:
<https://github.com/TheFallen0000/roleplay-manager> (el más amable es el de la
**última release**: <https://github.com/TheFallen0000/roleplay-manager/releases/latest>).

## Opciones de título

1. Construí un gestor de rol local-first para mis propios modelos — y conecta tu teléfono con un interruptor (sin nube, sin abrir puertos)
2. Roleplay Manager: rol con IA autoalojado, con memoria dinámica, ramas y acceso desde el teléfono en un clic
3. Un gestor de rol local-first donde tu teléfono es solo la pantalla (código abierto, AGPL)

## Post largo (Reddit: r/LocalLLaMA, r/SillyTavernAI, r/selfhosted)

> Llevo un tiempo haciendo rol con modelos locales y siempre chocaba con el mismo
> muro: las campañas largas terminan repartidas entre media docena de
> herramientas — una para el chat, otra para las tarjetas de personaje, una
> carpeta de exports, scripts para la memoria. Así que construí **Roleplay
> Manager** para mis propias campañas y lo uso a diario desde hace meses. Es
> código abierto (AGPL) y creo que por fin está en un punto que merece mostrarse.
>
> La idea central: **es una app, no un servicio.** Todo — personajes, chats,
> memorias, resúmenes, imágenes — vive en una base SQLite dentro de una carpeta
> `data/` junto a la app. Sin cuentas, sin telemetría, sin nube. El modelo
> también es tuyo: una instancia local de Ollama o cualquier endpoint
> compatible con OpenAI con tu propia clave.
>
> Qué hace:
>
> - **Personajes versionados** — imagen, descripción, saludo y tarjetas; cada
>   edición crea una versión nueva a la que puedes volver.
> - **Chat en streaming** con editar, regenerar, rebobinar y **ramificar**:
>   bifurca la historia desde cualquier mensaje para probar un «y si…» sin
>   perder la original.
> - **Memoria dinámica y resúmenes** que mantienen coherentes las historias
>   largas: el modelo propone memorias (aplicación automática o revisión
>   manual), las que no se usan decaen, y los resúmenes comprimen lo antiguo.
>   Una vista previa del contexto muestra exactamente lo que recibirá el modelo.
> - **Apariencia por conversación** — estilos de mensaje (burbuja / documento /
>   novela visual con placas y un color por voz), fondos y avatares propios.
> - **Importar/exportar** personajes (con conversaciones, memorias e imágenes),
>   personas y plantillas de ajustes para copiar la configuración entre chats.
>
> Y la parte de la que estoy más orgulloso: **tu teléfono puede ser una pantalla,
> con un interruptor.** Hay un menú «Teléfono»: lo enciendes y aparece un código
> QR. El teléfono abre la app desde ese QR (por tu red privada de Tailscale, o
> por la WiFi de casa) y puede **instalarla como app**, con su icono y su
> ventana. Sin abrir puertos, sin archivos de configuración y nada expuesto a
> internet: es tu red privada. (Nota honesta: la PC tiene que estar encendida. El
> teléfono es una pantalla remota, no una nube.)
>
> Requisitos: el paquete de Windows/Linux/macOS (nada que instalar, el runtime va
> incluido), un modelo (Ollama local va genial) y — solo para el teléfono — una
> cuenta gratuita de Tailscale en ambos dispositivos.
>
> Repo y releases: <https://github.com/TheFallen0000/roleplay-manager>
>
> Me encantaría leer a gente con campañas largas en marcha: ¿qué es lo que más
> echarías de menos en una herramienta así?

## Post corto (X / Bluesky)

> Rol con IA, local-first y sin nube:
>
> 🧠 Personajes con versiones, memoria dinámica, resúmenes y ramas
> 🔌 Tu propio modelo (Ollama / OpenAI-compatible)
> 📵 Sin cuentas: todo vive en una carpeta de tu PC
> 📱 ¿Tu teléfono? Un interruptor + un QR (Tailscale) y es una pantalla remota, instalable como app
>
> Código abierto (AGPL) ↓
> github.com/TheFallen0000/roleplay-manager

## Versión corta para comentarios

> Es un gestor de rol autoalojado: personajes versionados, chat en streaming,
> memoria dinámica, resúmenes y ramas de la historia, todo en un archivo SQLite
> local y con el modelo que elijas (Ollama o cualquier endpoint compatible con
> OpenAI). Lo que más me gusta: tu teléfono lo abre como pantalla con un
> interruptor + QR (Tailscale) y lo instala como PWA. Código abierto, AGPL:
> <https://github.com/TheFallen0000/roleplay-manager>

## FAQ (respuestas para los comentarios)

- **¿Funciona sin internet?** Sí, con un modelo local: la app, la base de datos
  y Ollama corren en tu máquina. Solo necesitas internet para actualizaciones y
  para proveedores remotos si eliges uno.
- **¿Entrena con mis datos o los envía a algún sitio?** No hay telemetría y nada
  llega a nosotros. Lo único que sale de tu máquina es lo que envíes al
  proveedor que configures — y con un modelo local, nada.
- **¿Qué modelos puedo usar?** Ollama o cualquier endpoint compatible con OpenAI
  (LM Studio, llama.cpp server, OpenRouter… con tu clave). El modelo también se
  puede cambiar por conversación.
- **¿Solo Windows?** Windows es lo más pulido (carpeta portátil + actualizador
  integrado); los paquetes de Linux y macOS salen en la misma release.
- **¿Es un reemplazo de SillyTavern?** Es un enfoque distinto centrado en
  campañas largas y en que los datos sean tuyos; no intenta replicar su
  ecosistema de extensiones. Los personajes se importan/exportan como archivos.
- **¿El teléfono necesita la PC encendida?** Sí. El teléfono se conecta a la app
  que corre en tu PC; si la PC se duerme, el teléfono no llega.
- **¿Cómo hago copia de seguridad?** Todo el estado es la carpeta `data/`:
  cópiala. La app además crea un respaldo antes de cada actualización.
- **¿Por qué AGPL?** Mantiene la herramienta abierta: puedes usarla y modificarla
  libremente y, si distribuyes una versión modificada, compartes su código.
