---
title: What is Roleplay Manager?
description: A local-first notebook for long roleplay conversations with AI characters.
---

Roleplay Manager is a self-hosted app for long roleplay conversations with AI
characters. It runs on your computer, keeps your story in a local SQLite
database and connects to the AI provider you choose.

## The three promises

- **Local-first.** Characters, chats, memories, summaries and images live in
  `data/` inside the app folder. There is no account and no cloud service of
  ours.
- **Continuity.** Characters are versioned, memory can decay, summaries keep
  long chats inside the model's context and branches let you explore another
  direction without losing the original.
- **Your provider.** Run Ollama on the same machine or connect any
  OpenAI-compatible endpoint with your own key. The app does not lock you into
  one model.

## What you need

- A 64-bit Windows, Linux or macOS computer.
- About 200 MB of free disk space after unzipping.
- An AI provider. Ollama is the simplest local option; a remote
  OpenAI-compatible endpoint also works.

## What it is not

- It is not a hosted service. There is no login and no data stored on our
  servers.
- It is not a native mobile app. The phone opens the app running on your
  computer through Tailscale or your home network.
- It is not a model. It is the notebook around the model; you choose which
  model to use.

:::note
If you use a remote provider, the prompt you send leaves your machine and goes
to that provider. If you use Ollama locally, inference stays local.
:::

Next: [install Roleplay Manager](/docs/getting-started/installation/windows/).
