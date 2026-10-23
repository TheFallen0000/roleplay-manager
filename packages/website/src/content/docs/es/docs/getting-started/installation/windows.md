---
title: Instalar en Windows
description: Descarga el paquete portátil de Windows, descomprímelo, ejecuta el lanzador y conecta tu proveedor de IA.
---

## Antes de empezar

- Windows 10 u 11, 64 bits.
- Unos 200 MB de espacio libre después de descomprimir.
- Un proveedor de IA: Ollama en local o un endpoint compatible con OpenAI.

No necesitas Node.js, un instalador ni una cuenta.

## 1. Descarga el paquete

[Descarga para Windows](/es/download/) y guarda el ZIP. El archivo se llama
`roleplay-manager-<versión>-win-x64.zip`.

## 2. Descomprímelo en un sitio permanente

Haz clic derecho en el ZIP y elige **Extraer todo…**, y después mueve la carpeta
a un lugar que recuerdes, como `Documentos\RoleplayManager`.

Conserva la carpeta completa:

```text
RoleplayManager/
├── data/        ← tu historia
├── backups/     ← copias de seguridad
├── versions/    ← versiones instaladas
└── start.cmd
```

## 3. Abre el lanzador

Haz doble clic en `start.cmd`. Se abre una ventana de consola y el navegador
debería abrirse en `http://localhost:3001` cuando la app esté lista. Conserva la
consola abierta mientras usas Roleplay Manager; al cerrarla se detiene el
servidor.

Si el navegador no se abre, entra a `http://localhost:3001` manualmente.

:::caution[Windows protegió tu PC]
El lanzador no está firmado, así que SmartScreen puede mostrar un aviso en el
primer inicio. Sigue solo si descargaste el archivo desde la versión
oficial de GitHub. Elige **Más información** → **Ejecutar de todas formas**. Es
un paso único.
:::

## 4. Conecta tu IA

Abre **Sistema → Proveedores**, añade Ollama o un endpoint compatible con OpenAI
y usa **Probar conexión**. Después elige un modelo y crea tu primer personaje.

Siguiente: [conectar un proveedor](/es/docs/guides/providers) o
[primeros pasos](/es/docs/getting-started/first-steps).
