---
title: Instalar en Windows
description: Descargá el paquete portátil de Windows, descomprimilo, ejecutá el lanzador y conectá tu proveedor de IA.
---

## Antes de empezar

- Windows 10 u 11, 64 bits.
- Unos 200 MB de espacio libre después de descomprimir.
- Un proveedor de IA: Ollama en local o un endpoint compatible con OpenAI.

No necesitás Node.js, un instalador ni una cuenta.

## 1. Descargá el paquete

[Descargá para Windows](/es/download/) y guardá el ZIP. El archivo se llama
`roleplay-manager-<versión>-win-x64.zip`.

## 2. Descomprimilo en un sitio permanente

Hacé clic derecho en el ZIP y elegí **Extraer todo…**, y después mové la carpeta
a un lugar que recuerdes, como `Documentos\RoleplayManager`.

Mantené la carpeta completa:

```text
RoleplayManager/
├── data/        ← tu historia
├── backups/     ← copias de seguridad
├── versions/    ← versiones instaladas
└── start.cmd
```

## 3. Abrí el lanzador

Hacé doble clic en `start.cmd`. Se abre una ventana de consola y el navegador
debería abrir `http://localhost:3001` cuando la app esté lista. Mantené la
consola abierta mientras usás Roleplay Manager; al cerrarla se detiene el
servidor.

Si el navegador no se abre, entrá a `http://localhost:3001` a mano.

:::caution[Windows protegió tu PC]
El lanzador no está firmado, así que SmartScreen puede mostrar un aviso en el
primer arranque. Continuá solo si descargaste el archivo desde la release
oficial de GitHub. Elegí **Más información** → **Ejecutar de todas formas**. Es
un paso único.
:::

## 4. Conectá tu IA

Abrí **Sistema → Proveedores**, añadí Ollama o un endpoint compatible con OpenAI
y usá **Probar conexión**. Después elegí un modelo y creá tu primer personaje.

Siguiente: [conectar un proveedor](/es/docs/guides/providers) o
[primeros pasos](/es/docs/getting-started/first-steps).
