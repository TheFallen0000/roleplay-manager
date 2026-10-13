# Announcements — English

Ready-to-post drafts for **Roleplay Manager**. Ground rules: facts only — no
user numbers, no testimonials, no comparisons that cannot be verified. Keep the
requirements honest: the PC runs the app and the phone is a remote screen.

The repo link to use everywhere:
<https://github.com/TheFallen0000/roleplay-manager> (the **latest release** link
is the friendliest: <https://github.com/TheFallen0000/roleplay-manager/releases/latest>).

## Title options

1. I built a local-first roleplay manager for my own models — and it connects your phone with one toggle (no cloud, no port-forwarding)
2. Roleplay Manager: self-hosted AI roleplay with dynamic memory, branches and one-click phone access
3. A local-first roleplay chat manager where your phone is just a screen (open source, AGPL)

## Long post (Reddit: r/LocalLLaMA, r/SillyTavernAI, r/selfhosted)

> I've been roleplaying with local models for a while and kept hitting the same
> wall: long campaigns end up split across half a dozen tools — one for the
> chat, one for character cards, a folder of exports, some scripts for memory.
> So I built **Roleplay Manager** for my own campaigns and have been using it
> daily for months. It's open source (AGPL), and I think it's finally at a point
> where it deserves to be shown.
>
> The core idea: **it's an app, not a service.** Everything — characters, chats,
> memories, summaries, images — lives in a SQLite database in a `data/` folder
> next to the app. No accounts, no telemetry, no cloud. The model is yours too:
> a local Ollama instance or any OpenAI-compatible endpoint with your own key.
>
> What it does:
>
> - **Versioned characters** — profile image, description, greeting and cards;
>   every edit becomes a new version you can go back to.
> - **Streaming chat** with edit, regenerate, rewind and **branching**: fork the
>   story from any message to try a "what if" path without losing the original.
> - **Dynamic memory and summaries** that keep long stories coherent — the model
>   proposes memories (auto-apply or manual review), unused ones decay, and
>   summaries compress the old parts. A prompt-context preview shows exactly what
>   the model will receive.
> - **Per-conversation appearance** — message styles (bubble / document /
>   visual-novel with name plates and a colour per voice), backgrounds, custom
>   avatars.
> - **Import/export** for characters (with conversations, memories and images),
>   personas, and settings templates to copy one chat's configuration to others.
>
> And the part I'm most proud of: **your phone can be a screen for it, with one
> toggle.** There's a "Phone" menu: flip it on and you get a QR code. The phone
> opens the app from that QR (over your private Tailscale network, or your home
> Wi-Fi) and can **install it as an app** — its own icon and window. No
> port-forwarding, no config files, nothing exposed to the public internet:
> it's your own private network. (Honesty note: your PC has to be running. The
> phone is a remote screen, not a cloud.)
>
> Requirements: the Windows/Linux/macOS package (nothing to install, the runtime
> is bundled), a model (local Ollama works great) and — only for the phone part —
> a free Tailscale account on both devices.
>
> Repo and releases: <https://github.com/TheFallen0000/roleplay-manager>
>
> Feedback from people with long-running campaigns is very welcome: what's the
> one thing you would miss the most in a tool like this?

## Short post (X / Bluesky)

> Local-first AI roleplay, without the cloud:
>
> 🧠 Characters with versions, dynamic memory, summaries & branches
> 🔌 Bring your own model (Ollama / OpenAI-compatible)
> 📵 No accounts: everything lives in a folder on your PC
> 📱 Your phone? One toggle + a QR (Tailscale) and it's a remote screen, installable as an app
>
> Open source (AGPL) ↓
> github.com/TheFallen0000/roleplay-manager

## Comment-sized version (for mentions and replies)

> It's a self-hosted roleplay manager: versioned characters, streaming chat,
> dynamic memory, summaries and story branches — all in a local SQLite file, with
> the model of your choice (Ollama or any OpenAI-compatible endpoint). The bit I
> like the most: your phone opens it as a screen with one toggle + QR
> (Tailscale) and installs it as a PWA. Open source, AGPL:
> <https://github.com/TheFallen0000/roleplay-manager>

## Show HN (post the URL, then this as the author comment)

> Roleplay Manager is a local-first app for long roleplay campaigns with AI
> characters. I built it because my own campaigns kept outgrowing spreadsheets of
> character cards and had no memory beyond the context window.
>
> It runs as a single local process (bundled Node runtime, no install): data in
> a SQLite file under `data/`, characters versioned, chat with branching,
> dynamic memory with decay + automatic summaries, import/export of everything,
> and a prompt-context preview so you can see what the model receives. Provider
> is pluggable: Ollama or any OpenAI-compatible endpoint.
>
> The feature I ended up liking the most is the phone one: an in-app toggle turns
> on Tailscale Serve (or a home-network proxy) and shows a QR; the phone opens
> the app and installs it as a PWA. Your PC keeps the data; the phone is a
> screen.
>
> Windows/Linux/macOS packages are in GitHub Releases, AGPL-3.0. Happy to answer
> anything about the architecture or the packaging.

## FAQ (answers for the comment section)

- **Does it work offline?** Yes with a local model: the app, the database and
  Ollama run on your machine. Internet is only needed for updates and for remote
  providers if you choose one.
- **Does it train on my data or send it anywhere?** There is no telemetry and
  nothing goes to us. The only data that leaves the machine is what you send to
  the provider you configured — and nothing leaves it with a local model.
- **Which models can I use?** Ollama, or any OpenAI-compatible endpoint (LM
  Studio, llama.cpp server, OpenRouter… with your key). The model can also be
  changed per conversation.
- **Is it Windows only?** Windows is the most polished (portable folder plus the
  in-app updater); Linux and macOS packages ship in the same release.
- **Is it a SillyTavern replacement?** It's a different take focused on long
  campaigns and data ownership; it doesn't try to replicate the extension
  ecosystem. Characters can be imported/exported as files.
- **Does the phone need the PC on?** Yes. The phone connects to the app running
  on your PC; if the PC sleeps, the phone can't reach it.
- **How do I back up?** The whole state is the `data/` folder: copy it. The app
  also creates a backup before each update.
- **Why AGPL?** It keeps the tool open: you can use and modify it freely, and if
  you distribute a modified version you share its source too.
