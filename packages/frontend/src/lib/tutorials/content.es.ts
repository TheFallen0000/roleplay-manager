import type { TutorialContent } from "./types"

/**
 * Tutorial copy in Spanish. Long texts live here instead of the i18n
 * dictionaries (those hold short labels); `content.en.ts` mirrors this file
 * and the shared type keeps both in sync. Keep the steps matching the real
 * UI: when a screen or menu entry is renamed, update its tutorial.
 */
export const tutorialsEs: TutorialContent = {
  "phone-access": {
    title: "Conectar el teléfono con Tailscale",
    description:
      "Usa la app desde el móvil en cualquier red, a través de tu red privada de Tailscale.",
    steps: [
      {
        title: "Instala Tailscale en los dos equipos",
        body: "Descarga Tailscale en tu computadora desde tailscale.com/download e inicia sesión. En el teléfono, instala la app de Tailscale y entra con la misma cuenta: ambos quedarán en tu red privada.",
      },
      {
        title: "Activa el acceso en la app",
        body: "Abre el menú «Teléfono» de la barra superior, entra en la pestaña «Tailscale» y enciende el interruptor. Si te pide un paso previo, activa «Serve» con el enlace que aparece (solo hace falta una vez).",
      },
      {
        title: "Abre la URL en el móvil",
        body: "Con el interruptor encendido verás un código QR y la dirección de la app. Escanéalo con la cámara del teléfono (con Tailscale conectado en él) y ábrela.",
      },
      {
        title: "Añádela a la pantalla de inicio",
        body: "Con esta dirección de Tailscale abierta, guárdala desde el navegador del móvil: se abrirá con su propio icono y sin barra del navegador (hace falta HTTPS). Lo tienes paso a paso en el tutorial «Instalar la app en el móvil».",
      },
    ],
    tips: [
      "La dirección solo funciona dentro de tu red de Tailscale: nadie ajeno puede verla.",
      "Apaga el interruptor cuando no la uses; al cerrar la app, el túnel también se corta.",
      "Si no carga en el móvil, comprueba que Tailscale esté conectado en ambos dispositivos.",
    ],
  },
  "pwa-install": {
    title: "Instalar la app en el móvil",
    description:
      "Añádela a la pantalla de inicio y ábrela en su propia ventana, sin barra del navegador.",
    steps: [
      {
        title: "Abre la app con la dirección de Tailscale",
        body: "La instalación necesita una conexión segura (HTTPS), así que usa la dirección de Tailscale y no la de la red doméstica: con http:// el navegador no ofrece instalarla.",
      },
      {
        title: "Android (Chrome)",
        body: "Abre el menú ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio»; el nombre exacto cambia según la versión.",
      },
      {
        title: "iPhone (Safari)",
        body: "Toca Compartir y elige «Añadir a pantalla de inicio». En iPhone tiene que ser Safari; otros navegadores no muestran la opción.",
      },
      {
        title: "Ábrela desde el nuevo icono",
        body: "Se abrirá a pantalla completa, como una app independiente, y podrás alternar entre ella y el navegador sin volver a escribir la dirección.",
      },
    ],
    tips: [
      "El móvil es una ventana a la app: los personajes y las conversaciones siguen viviendo en tu computadora.",
      "Por la red doméstica la app solo se abre en el navegador: para instalarla de verdad, usa siempre Tailscale.",
    ],
  },
  "lan-access": {
    title: "Conectarte por la red doméstica",
    description:
      "Ábrela desde otro dispositivo de tu casa, sin Tailscale y sin salir a internet.",
    steps: [
      {
        title: "Activa el acceso",
        body: "Menú «Teléfono» → pestaña «Red doméstica» → enciende el interruptor.",
      },
      {
        title: "Conéctate desde el otro dispositivo",
        body: "Escanea el código QR con la cámara (debe estar en la misma Wi-Fi) o escribe la dirección que aparece, similar a http://192.168.1.20:4322.",
      },
      {
        title: "Si no abre, revisa el firewall",
        body: "Permite las conexiones entrantes de la app en el firewall de tu equipo. Si tienes varias direcciones, elige la de tu red Wi-Fi.",
      },
    ],
    tips: [
      "Solo funciona dentro de tu red local; para conectarte de fuera de casa usa Tailscale.",
      "Al cerrar la app, el acceso se corta y la dirección deja de responder.",
      "Por aquí la app se usa en el navegador: la instalación como app solo funciona con la dirección de Tailscale (requiere HTTPS).",
    ],
  },
  providers: {
    title: "Configurar un proveedor de IA",
    description:
      "Conecta la app con Ollama en tu equipo o con cualquier servicio compatible con la API de OpenAI.",
    steps: [
      {
        title: "Abre «Proveedores»",
        body: "Está en el menú lateral. Verás la tarjeta de Ollama y la de los proveedores compatibles con OpenAI.",
      },
      {
        title: "Ollama (en tu equipo)",
        body: "Instala Ollama desde ollama.com y descarga un modelo (por ejemplo: ollama pull llama3.1). Vuelve a la app, pulsa «Probar conexión» y, si responde, elige el modelo y «Establecer como predeterminado».",
      },
      {
        title: "OpenAI-compatible (LM Studio, OpenRouter…)",
        body: "Pulsa «Nueva instancia» y rellena el nombre, la URL base (por ejemplo http://localhost:1234/v1) y la clave si la pide. Después, «Probar conexión».",
      },
      {
        title: "Un modelo distinto por conversación",
        body: "Con el engranaje de una conversación → «Modelo» puedes usar otro modelo solo en ese chat, además de ajustar la temperatura y otros parámetros de inferencia.",
      },
    ],
    tips: [
      "Si la prueba falla, revisa que el servicio esté encendido y que la URL base apunte a la raíz de su API (suele terminar en /v1).",
      "Tu clave se guarda solo en tu equipo, dentro de la carpeta de datos de la app.",
    ],
    action: { label: "Ir a Proveedores", href: "/settings/providers" },
  },
  characters: {
    title: "Crear, exportar e importar personajes",
    description:
      "Crea personajes, guarda versiones y llévalos de un equipo a otro con un simple archivo.",
    steps: [
      {
        title: "Crea el personaje",
        body: "En «Mis personajes», pulsa «Nuevo personaje»: en «General» van nombre, imagen, saludo y descripción; en «Tarjetas», sus características.",
      },
      {
        title: "Vuelve a versiones anteriores",
        body: "Cada cambio guardado crea una versión. El selector vN de la cabecera te deja abrir una anterior y guardar desde ahí.",
      },
      {
        title: "Expórtalo",
        body: "Clic derecho sobre su tarjeta → «Exportar…». Elige qué incluir (definición, versiones, conversaciones, memorias…) y guarda el archivo JSON.",
      },
      {
        title: "Impórtalo en otro equipo",
        body: "En «Mis personajes», pulsa «Importar» (o arrastra el JSON a la ventana): el personaje aparecerá con todo lo que incluiste.",
      },
    ],
    tips: [
      "El archivo exportado es la forma más segura de compartir o mover un personaje completo.",
      "«Aplicar ajustes…» (clic derecho) aplica una plantilla de ajustes exportada a todas las conversaciones del personaje.",
    ],
    action: { label: "Ir a Mis personajes", href: "/" },
  },
  branches: {
    title: "Ramas de conversación",
    description:
      "Explora un «¿y si…?» sin tocar la conversación original: clónala hasta un punto y sigue desde ahí.",
    steps: [
      {
        title: "Elige el punto de partida",
        body: "Haz clic derecho sobre un mensaje (el primero no cuenta) para abrir su menú.",
      },
      {
        title: "«Crear rama»",
        body: "Se abre una conversación nueva con todo el historial hasta ese mensaje; la original se queda intacta.",
      },
      {
        title: "Continúa la escena",
        body: "Encontrarás las dos conversaciones en la ficha del personaje: sigue por la rama o vuelve a la original cuando quieras.",
      },
    ],
    tips: [
      "Ideal para probar finales alternativos sin perder el hilo principal.",
      "Si solo quieres corregir el último intercambio, prueba «Regenerar» o «Rebobinar» en el menú del mensaje.",
    ],
    action: { label: "Ir a Mis personajes", href: "/" },
  },
  "memory-summaries": {
    title: "Memorias y resúmenes",
    description:
      "Cómo recuerda la IA lo importante de una conversación larga y quién decide qué se guarda.",
    steps: [
      {
        title: "Elige el modo de memorias",
        body: "Engranaje → «Historia» → «Modo de gestión de memorias». Con «Auto» las propuestas se aplican al momento; con «Manual» te esperan en «Propuestas pendientes» para aceptarlas, editarlas o descartarlas.",
      },
      {
        title: "Revisa lo que sabe",
        body: "En «Memoria dinámica» ves todas las memorias agrupadas por actor; puedes crear, editar y borrar entradas manualmente.",
      },
      {
        title: "Resúmenes que aligeran el contexto",
        body: "Cada cierta cantidad de mensajes se regenera un resumen acumulativo de lo antiguo. Ajusta la frecuencia en «Resúmenes» o pulsa «Generar resumen ahora».",
      },
      {
        title: "Desgaste para mantenerla sana",
        body: "En «Auto-degradación», las memorias que dejan de usarse pierden importancia; las que caen bajo el umbral se excluyen del contexto y son candidatas a borrarse.",
      },
    ],
    tips: [
      "Cuanta más importancia tiene una memoria, más peso tiene al generar la respuesta.",
      "Crea memorias manualmente para fijar detalles que la IA no debe olvidar.",
    ],
  },
  "chat-customization": {
    title: "Personalizar el chat",
    description:
      "Cambia cómo se lee una conversación: estilos, colores de cada voz, fondo y pantalla completa.",
    steps: [
      {
        title: "Fondo e imagen del chat",
        body: "En el engranaje → «Personalización» puedes darle a esa conversación su propia imagen de perfil y un fondo de escena, con su ajuste y su velo.",
      },
      {
        title: "Estilo de mensaje",
        body: "Elige «Burbuja» (el chat clásico), «Documento» (prosa a todo el ancho, para leer como una novela) o «Novela visual» (cada voz con su placa sobre el fondo).",
      },
      {
        title: "Colores de diálogo",
        body: "Asigna un color al personaje y otro para ti; «Tema» usa el color del mundo activo.",
      },
      {
        title: "Pantalla completa",
        body: "Engranaje → «Pantalla completa» para quedarte solo con la conversación. Sal con el botón flotante o con la tecla Esc.",
      },
    ],
    tips: [
      "La apariencia es por conversación; las ramas la heredan.",
      "El tema y el idioma generales están en la barra superior, y afectan a toda la app.",
    ],
  },
  "data-updates": {
    title: "Tus datos y las actualizaciones",
    description:
      "Dónde se guarda todo, cómo actualizar con red de seguridad y qué mirar cuando algo falla.",
    steps: [
      {
        title: "Todo vive en tu equipo",
        body: "Junto a la app está la carpeta data/, con la base de datos, las imágenes y el registro (data/logs). Nada sale de tu computadora, salvo lo que envías a tu proveedor de IA.",
      },
      {
        title: "Actualiza con respaldo",
        body: "Cuando haya una versión nueva verás el aviso y la página «Actualizaciones». La app crea un respaldo antes de aplicar el cambio; también puedes pulsar «Crear respaldo ahora» cuando quieras.",
      },
      {
        title: "Mueve o copia todo",
        body: "Para llevarte la app a otro equipo, ciérrala y copia la carpeta data/ completa. Los respaldos quedan en la carpeta backups, junto a la app.",
      },
      {
        title: "Si algo va mal, el registro ayuda",
        body: "En «Registro» puedes filtrar por nivel, actualizar, copiar o descargar los últimos mensajes y adjuntarlos al pedir ayuda.",
      },
    ],
    tips: [
      "El registro se rota solo, así que no crece sin límite.",
      "Cuidar la carpeta data/ es cuidar todos tus personajes, conversaciones y memorias.",
    ],
    action: { label: "Ir a Actualizaciones", href: "/settings/updates" },
  },
}
