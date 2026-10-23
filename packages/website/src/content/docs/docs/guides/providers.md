---
title: AI providers
description: Connect Ollama or any OpenAI-compatible endpoint and choose a model.
---

Roleplay Manager does not include a model. It connects to the provider you
choose and sends the prompt to it.

## Ollama (local)

1. Install [Ollama](https://ollama.com/) and pull a model, for example
   `ollama pull llama3.1`.
2. In Roleplay Manager, open **System → Providers**.
3. Add `http://localhost:11434` as an Ollama provider.
4. Use **Test connection**, save and choose the default model.

Everything stays on your computer. Performance depends on your hardware; a
smaller model is a good starting point if you do not have a dedicated GPU.

## OpenAI-compatible endpoint

1. Open **System → Providers**.
2. Add an OpenAI-compatible provider with its base URL and API key.
3. Test the connection and choose a model.

This works with LM Studio, OpenRouter, a self-hosted gateway or any other
service that implements the OpenAI chat API.

:::note
If you use a remote provider, only the prompt you send leaves your machine. The
provider's terms and privacy policy apply to that request.
:::

## Models per conversation

The default model is used for new chats, but each conversation can use a
different provider and model. Open a conversation's settings to change it
without affecting the rest.

## Troubleshooting

- **Connection refused with Ollama:** make sure Ollama is running and the URL is
  `http://localhost:11434`.
- **401 or 403:** check the API key and the provider's base URL.
- **The model is not listed:** refresh the model list after pulling or enabling
  it in the provider.
