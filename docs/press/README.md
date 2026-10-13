# Press & launch kit

Everything needed to announce **Roleplay Manager**. Ground rules: facts only —
no user numbers, no testimonials, no comparisons that cannot be verified — and
always state the honest requirements (your PC runs the app; the phone is a
remote screen).

## Files

| File | Use |
|---|---|
| `announcements.en.md` / `announcements.es.md` | Long post, short post, comment-sized text, Show HN and a comment FAQ, per language |
| `social-preview.png` | 1280×640 card for **GitHub → Settings → Social preview** (upload it by hand; the API cannot set it) |
| `phone-flow.png` | Three-panel artwork for the phone angle: toggle + QR → the phone → install as an app |
| `packages/frontend/public/brand/screenshots/*` | The app screenshots used in the README, the posts and the PWA install dialog |

## Posting checklist

One community per day, and reply to comments the same day:

1. **r/LocalLLaMA** — post the long text as a self post, repo link in the body.
   Read the self-promotion rules first.
2. **r/SillyTavernAI** — same text, but lead with import/export and the phone
   angle; that audience already has models running.
3. **r/selfhosted** — emphasise "app, not service": `data/` folder, no accounts,
   portable builds, backups.
4. **r/Tailscale** — the phone story on its own: in-app Serve toggle, QR, PWA,
   private tailnet. Do not cross-post the same text.
5. **Ollama Discord** (`#showcase`) — short post plus the screenshots.
6. **X / Bluesky** — short post plus `phone-flow.png`; quote your own post to add
   new screenshots later.

Etiquette that decides reach: answer every early comment, edit the post to answer
repeated questions, never post the same day across communities.

## Manual steps (once)

- GitHub → **Settings → Social preview** → upload `social-preview.png`.
- Keep `CHANGELOG.md` and the latest release notes tidy: newcomers arriving from
  a post read them.

## Regenerating the artwork

- Screenshots: captured from the packaged app with synthetic content seeded
  through the character-import API (see `docs/brand/README.md`).
- Cards: composed from those captures, the source mascot
  (`docs/brand/logo-source.png`) and the brand fonts in `node_modules`; captions
  are English on purpose (widest audience).
