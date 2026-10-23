---
title: Phone access
description: Open Roleplay Manager from your phone with Tailscale or your home Wi-Fi, and install it as a PWA.
---

Roleplay Manager runs on your computer. Your phone is a client: it opens the
same app through a private address. There is no native mobile app to install.

## Tailscale (recommended)

Tailscale creates a private network between your devices without exposing ports
to the internet.

1. Install Tailscale on the computer and on the phone, and sign in to the same
   tailnet.
2. In Roleplay Manager, open **Phone** and choose **Tailscale**.
3. Scan the QR code or open the `https://<machine>.<tailnet>.ts.net` address on
   the phone.

You can also enable the link at startup and stop it when the app closes. The
link auto-disables after a configurable period without phone activity.

## Home Wi-Fi (LAN)

Use this when both devices are on the same network and you do not need access
from outside.

1. Open **Phone** and choose **Home network (LAN)**.
2. Open the `http://<private-ip>:4322` address on the phone.
3. If it does not open, check the computer's firewall and make sure both
   devices are on the same network.

## Install it as a PWA

On Android (Chrome) use **Install app** or **Add to Home screen**. On iPhone
(Safari) use **Share → Add to Home Screen**. The installed app opens in its own
window and keeps its own icon.

:::caution
Only share the app on networks you trust. Tailscale keeps access private; a LAN
link is visible to devices on that network.
:::
