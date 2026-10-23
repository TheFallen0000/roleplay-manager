---
title: Install on Windows
description: Download the portable Windows package, unzip it, run the launcher and connect your AI provider.
---

## Before you start

- Windows 10 or 11, 64-bit.
- About 200 MB of free space after unzipping.
- An AI provider: Ollama locally or an OpenAI-compatible endpoint.

You do **not** need Node.js, an installer or an account.

## 1. Download the package

[Download for Windows](/download/) and save the ZIP. The file is called
`roleplay-manager-<version>-win-x64.zip`.

## 2. Unzip it somewhere permanent

Right-click the ZIP and choose **Extract All…**, then move the folder to a place
you will remember, such as `Documents\RoleplayManager`.

Keep the whole folder together:

```text
RoleplayManager/
├── data/        ← your story
├── backups/     ← safety copies
├── versions/    ← installed versions
└── start.cmd
```

## 3. Open the launcher

Double-click `start.cmd`. A console window opens and the browser should open at
`http://localhost:3001` when the app is ready. Keep the console open while you
use Roleplay Manager; closing it stops the server.

If the browser does not open, visit `http://localhost:3001` manually.

:::caution[Windows protected your PC]
The launcher is not code-signed, so SmartScreen may show a warning on first
launch. Only continue if you downloaded the file from the official GitHub
release. Choose **More info** → **Run anyway**. This is a one-time step.
:::

## 4. Connect your AI

Open **System → Providers**, add Ollama or an OpenAI-compatible endpoint and use
**Test connection**. Then choose a model and create your first character.

Next: [connect a provider](/docs/guides/providers) or
[first steps](/docs/getting-started/first-steps).
