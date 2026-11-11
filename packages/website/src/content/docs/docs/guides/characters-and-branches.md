---
title: Characters and branches
description: Versioned characters, import/export and parallel conversation branches.
---

## Characters are versioned

Editing a character creates a new version instead of overwriting the old one.
That keeps the history of the character's description, greeting, cards and
image. You can review and return to an earlier version from the character
screen.

A character can include:

- Name, description and greeting.
- Personality cards or instructions.
- A profile image, cropped in the app.
- A standalone settings template.

## Import and export

Characters can be exported as versioned JSON and imported on another computer.
The export can include the character's conversations, images and settings; the
import dialog tells you what will be created.

Use this to move a character between machines or to keep a portable backup.

## SillyTavern-compatible cards and lorebooks

You can also import SillyTavern character cards (V1, V2 and V3) from JSON or
PNG. When a PNG contains both `chara` and `ccv3` chunks, the V3 card is used.
The app keeps fields it does not interpret so exporting the card again does not
silently drop them. Lorebooks embedded in a card, standalone `lorebook_v3`
files and SillyTavern `{ entries }` lorebooks can be imported and linked to a
character; supported activation covers keys, secondary keys, selective logic,
constant entries, order, position, case, whole words, scan depth and token
budget. Advanced lorebook features are preserved but not activated.

Exports are available as V2 or V3 JSON and PNG, writing both `chara` and `ccv3`
chunks. “SillyTavern-compatible” is a nominative description of the formats;
this is a clean-room implementation built from the public specs, without
copying SillyTavern's code, UI, prompts, assets or tests and without any implied
endorsement.

## Branches

A branch starts from a message and inherits the conversation settings. Use it
when a scene could go in two directions and you want to keep both.

1. Open the message where the branch should start.
2. Choose **Create branch**.
3. Continue the scene in the new branch.

The original conversation is not modified. Branches are separate histories, so
you can compare outcomes without losing either one.

## Rewind, edit and regenerate

Inside a conversation you can rewind to an earlier message, edit a message or
regenerate a reply. These actions are local: the app stores the new state in
`data/` and does not send anything until you request a new generation.
