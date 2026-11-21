---
name: modern-web-guidance
description: Search modern web platform guidance before writing or reviewing HTML, CSS or client-side JavaScript. Use for dialogs, popovers, forms, accessibility, performance, container queries, view transitions, scroll effects, image loading, date/time APIs and browser storage. Not for backend, databases, CI/CD or build tooling.
---

# Modern Web Guidance

Use the official Google Chrome guidance through its CLI. The guide corpus is not
vendored in this repository: the CLI downloads a pinned, self-contained package
on demand and caches it locally.

## When to use

- Before implementing or reviewing UI, CSS layout, animations, forms, client-side
  JavaScript or browser APIs.
- When a component works but may be using a legacy pattern, a heavier library or
  a missing accessibility affordance.
- When auditing an area with `legacy-scan` (broad modernization only).

Do not use it for backend code, SQL, Drizzle, Express, tests, CI or build
configuration.

## Workflow

1. **Search** with a 2–5 word action-oriented query for one capability. Do not
   include framework or product names.

   ```sh
   pnpx modern-web-guidance@latest search "light dismiss dialog"
   pnpx modern-web-guidance@latest search "responsive data table"
   ```

   Use `npx -y modern-web-guidance@latest ...` if `pnpx` is unavailable.

2. **Retrieve** the matching guide IDs. Pass several IDs comma-separated when
   they apply to the same task.

   ```sh
   pnpx modern-web-guidance@latest retrieve "animate-to-from-top-layer"
   ```

3. **Apply** the guidance, adapting the vanilla examples to React, Astro and
   Tailwind without dropping the modern feature or its fallback.

4. **Verify** with the relevant tests and, for visual changes, a manual check at
   desktop and mobile widths.

5. **Disclose** the guide IDs that shaped the change at the end of the response,
   with the specific rule or fallback that mattered.

## Broad audits

`legacy-scan` only covers the subset of guides with deterministic rules (~20 % of
the catalog). Use it for an open-ended audit, not for a specific feature:

```sh
pnpx modern-web-guidance@latest legacy-scan packages/frontend/src --json
pnpx modern-web-guidance@latest legacy-scan packages/website/src --json
```

Triage every finding against its `keepWhen`/`dropWhen` rubric and drop false
positives (deliberate fallbacks, Base UI internals, vendor code, lookalikes).

## Browser support policy

- Baseline **widely available** features are safe without a fallback.
- For anything newer, follow the guide's fallback recommendation or redesign
  with a progressive enhancement. Do not add a polyfill without approval.
- Prefer native platform behavior over a JavaScript reimplementation when the
  accessibility and visual result are equivalent.

## Repository notes

- Dialogs, popovers and menus use Base UI/shadcn. Keep them unless a guide shows
  a concrete accessibility, performance or correctness benefit.
- CSS tokens and component styles live in `packages/frontend/src/styles/` and
  `packages/website/src/styles/`.
- The frontend is Astro + React islands; prefer `client:visible`/`client:idle`
  for below-the-fold or non-critical interactive components.
- Respect `prefers-reduced-motion` and keep keyboard/focus behavior intact.

Official documentation: <https://developer.chrome.com/docs/modern-web-guidance>.
