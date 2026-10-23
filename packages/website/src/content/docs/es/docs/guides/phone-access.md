---
title: Acceso desde el teléfono
description: Abre Roleplay Manager desde el teléfono con Tailscale o la Wi-Fi doméstica e instálalo como PWA.
---

Roleplay Manager se ejecuta en tu equipo. El teléfono es un cliente: abre la misma
app mediante una dirección privada. No hay una app nativa para el teléfono.

## Tailscale (recomendado)

Tailscale crea una red privada entre tus dispositivos sin exponer puertos a
internet.

1. Instala Tailscale en el equipo y en el teléfono, e inicia sesión en la
   misma tailnet.
2. En Roleplay Manager, abre **Teléfono** y elige **Tailscale**.
3. Escanea el código QR o abre la dirección
   `https://<equipo>.<tailnet>.ts.net` en el teléfono.

También puedes activar el enlace al iniciar y cortarlo al cerrar la app. El
enlace se desactiva solo después de un período configurable sin actividad del
teléfono.

## Wi-Fi doméstica (LAN)

Úsalo cuando los dos dispositivos están en la misma red y no necesitas acceso
desde fuera.

1. Abre **Teléfono** y elige **Red doméstica (LAN)**.
2. Abre la dirección `http://<ip-privada>:4322` en el teléfono.
3. Si no abre, revisa el firewall del equipo y asegúrate de que los dos
   dispositivos estén en la misma red.

## Instálalo como PWA

En Android (Chrome) usa **Instalar app** o **Agregar a la pantalla principal**.
En iPhone (Safari) usa **Compartir → Agregar a la pantalla de inicio**. La app
instalada se abre en su propia ventana y conserva su icono.

:::caution
Comparte la app solo en redes de confianza. Tailscale mantiene el acceso
privado; un enlace LAN es visible para los dispositivos de esa red.
:::
