---
title: Instalar en Linux y macOS
description: Descarga el paquete portátil para Linux o macOS, descomprímelo y ejecuta el lanzador.
---

## Antes de empezar

- Linux x64/arm64 o macOS Apple Silicon/Intel.
- Unos 200 MB de espacio libre después de descomprimir.
- Un proveedor de IA: Ollama en local o un endpoint compatible con OpenAI.

No necesitas Node.js, un instalador ni una cuenta.

## Linux

1. [Descarga el paquete de Linux](/es/download/) y descomprímelo en un sitio
   permanente.
2. Abre una terminal en la carpeta y dale permiso al lanzador:

```bash
chmod +x start.sh
./start.sh
```

3. El navegador debería abrirse en `http://localhost:3001`.

Si el navegador no se abre, entra a la URL manualmente. Conserva la terminal abierta
mientras la app se está ejecutando.

## macOS

1. [Descarga el paquete de macOS](/es/download/) para Apple Silicon o Intel.
2. Descomprímelo y mueve la carpeta a un lugar que recuerdes.
3. Abre Terminal en la carpeta y ejecuta:

```bash
./start.sh
```

4. El navegador debería abrirse en `http://localhost:3001`.

:::caution[Gatekeeper puede bloquear el primer inicio]
El runtime de Node incluido no está firmado. Permite la app en **Ajustes del
Sistema → Privacidad y seguridad**, o ejecuta esto dentro de la carpeta:

```bash
xattr -dr com.apple.quarantine .
```

:::

## Después del primer inicio

Abre **Sistema → Proveedores**, añade Ollama o un endpoint compatible con OpenAI,
prueba la conexión y elige un modelo.

Siguiente: [conectar un proveedor](/es/docs/guides/providers) o
[primeros pasos](/es/docs/getting-started/first-steps).
