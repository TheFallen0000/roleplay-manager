---
title: Install on Linux and macOS
description: Download the portable package for Linux or macOS, unzip it and run the launcher.
---

## Before you start

- Linux x64/arm64 or macOS Apple Silicon/Intel.
- About 200 MB of free space after unzipping.
- An AI provider: Ollama locally or an OpenAI-compatible endpoint.

You do **not** need Node.js, an installer or an account.

## Linux

1. [Download the Linux package](/download/) and unzip it somewhere permanent.
2. Open a terminal in the folder and make the launcher executable:

```bash
chmod +x start.sh
./start.sh
```

3. The browser should open at `http://localhost:3001`.

If the browser does not open, visit the URL manually. Keep the terminal open
while the app is running.

## macOS

1. [Download the macOS package](/download/) for Apple Silicon or Intel.
2. Unzip it and move the folder to a place you will remember.
3. Open Terminal in the folder and run:

```bash
./start.sh
```

4. The browser should open at `http://localhost:3001`.

:::caution[Gatekeeper may block the first launch]
The included Node runtime is not signed. Allow the app in **System Settings →
Privacy & Security**, or run this inside the app folder:

```bash
xattr -dr com.apple.quarantine .
```

:::

## After the first launch

Open **System → Providers**, add Ollama or an OpenAI-compatible endpoint, test
the connection and choose a model.

Next: [connect a provider](/docs/guides/providers) or
[first steps](/docs/getting-started/first-steps).
