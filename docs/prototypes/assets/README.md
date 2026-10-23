# Prototype assets

Temporary assets used only by `site.html` and `site-docs.html`. Production will
import them from `packages/website/src/assets/` with Astro's image pipeline.

## Fonts

Latin subsets copied from the same Fontsource packages the app already depends
on (`@fontsource/dela-gothic-one`, `@fontsource/zen-maru-gothic`,
`@fontsource/zen-kaku-gothic-new`). They are OFL-licensed; see the packages under
`packages/ui/node_modules/@fontsource/`.

## Screenshots

WebP derivatives of the committed app screenshots in
`packages/frontend/public/brand/screenshots/`. The content is synthetic and was
captured from the packaged app; see `docs/brand/README.md` for provenance.
Regenerate these variants after a UI redesign changes the originals.
