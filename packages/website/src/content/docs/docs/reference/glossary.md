---
title: Glossary
description: The terms used across Roleplay Manager, the app and the documentation.
---

**Model**
: The AI that generates replies. It can run locally (Ollama) or on a remote
OpenAI-compatible service.

**Provider**
: The connection to a model: a URL, a type and, if needed, an API key. You can
have several providers and choose one per conversation.

**Context**
: Everything sent to the model for a reply: character prompt, memories,
summaries, recent messages and the current instruction. It has a size limit
measured in tokens.

**Token**
: A small unit of text the model processes. Context limits are usually expressed
in tokens, not words.

**Memory**
: A fact the character should remember across messages. Memories can be
proposed automatically or approved manually and can decay over time.

**Summary**
: A compressed version of older messages, kept in the prompt instead of the full
text. It helps long conversations stay inside the context limit.

**Branch**
: A parallel conversation that starts from a message and inherits the settings
of the original. Both histories remain available.

**Rewind**
: Return the conversation to an earlier message and continue from there.

**OOC**
: Out of character. Text outside the character's voice, usually between
`//...//`, shown as a separate pill.

**PWA**
: A website installed on the phone's home screen with its own icon and window.
Roleplay Manager uses this for phone access; there is no native app.

**Portable package**
: The ZIP or tarball that contains the app, its Node runtime, the launcher and
the `data/` folder. It does not need an installer.
