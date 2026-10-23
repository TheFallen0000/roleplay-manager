---
title: Memory and summaries
description: Keep long conversations coherent with dynamic memory, decay and automatic summaries.
---

Long chats eventually exceed the model's context window. Roleplay Manager has
two tools for that: **memory** and **summaries**.

## Memory

Memory stores facts the character should remember: names, places, promises,
relationships and unresolved threads. Depending on the conversation settings,
the app can propose memories automatically or wait for you to approve them.

- **Automatic:** the app extracts proposals from the conversation.
- **Manual:** you decide what becomes a memory.

Memories can decay over time. Decay keeps the memory list useful instead of
letting it grow forever; the exact behaviour is configured per conversation.

## Summaries

When a conversation gets long, Roleplay Manager can summarize older blocks and
keep the summary in the prompt instead of the full text. Summaries are stored
locally and can be reviewed from the conversation.

## Context preview

Before sending a message, open the context preview to see what the model will
receive: character prompt, memories, summaries, recent messages and the current
instruction. This is the fastest way to understand why a reply ignored
something.

:::tip
If a detail matters for the whole story, put it in the character description or
a memory. If it only matters for this scene, keep it in the recent messages.
:::

## Related

- [Characters and branches](/docs/guides/characters-and-branches)
- [Data and updates](/docs/guides/data-and-updates)
