# Liner Notes — implementation brief

This is the shared brief for redesigning every screen of the Music Assistant
frontend in the "Liner Notes" direction. Read it fully before touching code.

The visual reference is the clickable prototype at
`docs/design/roon-redesign.html`. Its readable sources are
`docs/design/redesign/styles.css` (all visual rules, by section) and
`docs/design/redesign/app.js` (one render function per screen: `sidebar`,
`topbar`, `transport`, `home`, `library`, `artistView`, `albumView`,
`nowPlaying`, `roomsDrawer`, `searchOv`, `sigPop`, and the mobile `renderPhones`).
Match the look and feel of those; adapt rather than copy where the real app has
more states, more data or different components.

The foundations already landed (commit `e91e1a72`): colour tokens, Inter as the
body face, Playfair Display as the display serif, quality colours. Everything
below builds on them.

## The four principles

1. **The art is the only colour.** Chrome is neutral grey (dark) or white
   (light) with a single violet accent. Colour enters only through artwork:
   blurred washes behind headers and Now Playing, tinted room cards. Use the
   app's existing artwork palette helpers where a component already has them
   (for example `paletteFromServer` in `PlayerOSD/Player.vue`).
2. **Editorial type.** A display serif *names things*: page titles, item titles
   (album, artist, playlist, track on Now Playing), section headings, room
   names in headers, big numerals. Inter does everything functional: nav,
   metadata, buttons, list rows, form labels, settings.
3. **Rooms are first-class.** Whatever controls a player must say which room it
   targets, in words, always visible.
4. **Never crop the cover.** Album art is square, whole, 3–4 px radius, with a
   soft shadow; text goes beneath it, never stamped on top of it.

## Tokens (src/styles/style.css) — use these, never hard-coded colours

| Purpose | Use |
| --- | --- |
| Page background | `var(--background)` / Tailwind `bg-background` |
| Raised tile, card, sidebar, player bar | `var(--card)` / `bg-card`, `var(--sidebar)` |
| Popover, drawer, menu | `var(--popover)` / `bg-popover` |
| Subtle fill, hover, chip | `var(--secondary)` or `var(--muted)`; hovers can also be `color-mix(in oklab, var(--foreground) 5%, transparent)` |
| Hairline | `var(--border)` / `border-border` |
| Text | `var(--foreground)`; secondary `var(--muted-foreground)`; tertiary/meta/numbers `var(--subtle-foreground)` (Tailwind `text-subtle-foreground`) |
| Accent (one hue only) | `var(--primary)` / `bg-primary`, `text-primary`; soft accent `color-mix(in oklab, var(--primary) 16%, transparent)` |
| Focus ring | `var(--ring)` |
| Quality tiers | `var(--quality-hires)`, `--quality-lossless`, `--quality-good`, `--quality-low` |
| Artwork depth / accent band | `var(--art-shadow)`, `var(--art-shadow-lifted)` (hover), `var(--band)`; eyebrow labels: class `ma-eyebrow` |
| Vuetify-only spots | `rgb(var(--v-theme-primary))`, `rgb(var(--v-theme-on-surface))` etc. still work, but prefer the tokens above |

Dark and light must both look right. Never hard-code `#fff`, `#000`, `white`,
`black`, `rgba(255,255,255,…)` or `rgba(0,0,0,…)` for text or surfaces
that sit on the theme background; the exception is text over artwork or over a
dark scrim, where white is correct.

## Type

- Body: Inter (already global). Weights 400 / 500 / 600. Avoid 700–800 for
  headings; that heavy-bold look is the old style we are leaving.
- Display serif: add the global class `ma-display` (sets the serif, weight 500,
  slight negative tracking), or in scoped CSS `font-family: var(--font-heading)`,
  or the Tailwind utility `font-display`. Serif weight is 500.
- Scale used in the prototype:
  - Page/item title: 48–64 px serif (artist hero up to 84 px), line-height ~1.
  - Section heading: 26 px serif, letter-spacing −0.01em; optional 13 px
    `--subtle-foreground` subtitle beside it.
  - Card title 13.5 px / 600 Inter; card subtitle 12.5 px `--muted-foreground`.
  - Eyebrow label: 11 px, 600, uppercase, letter-spacing 0.14em,
    `--subtle-foreground`.
  - Numbers (durations, counts): `font-variant-numeric: tabular-nums`.

## Shape, depth, motion

- Album/track art: radius 3–4 px. Artist images: circles (lists) or full-bleed
  photos (hero). Never large rounded corners on covers.
- Tiles/cards: radius 12–14 px, flat `--card` fill with a 1 px `--border` inset
  or none; no heavy drop shadows on cards. Popovers/drawers get a large soft
  shadow.
- Buttons: primary actions are accent-filled pills (999 px radius, ~40 px tall,
  600 weight, no uppercase, no letter-spacing). Secondary: `--secondary` fill
  pill. Icon buttons: round. Chips/filters: pill, 30 px tall, 1 px border; the
  selected chip is inverted (foreground bg, background text).
- Inputs: 10–12 px radius, `--secondary` fill or 1 px `--border`, accent focus.
- Hover: 150 ms colour/background transitions; cover art lifts 2–3 px. Panels
  and popovers 220–450 ms on `cubic-bezier(.22,1,.36,1)`. Wrap any looping or
  large motion in `@media (prefers-reduced-motion: no-preference)` or switch it
  off under `reduce`.
- Blur/glass only where content scrolls beneath (sticky bars, Now Playing
  panels), and always with enough opacity that text stays readable.

## What "done" looks like per area

Each area lists its prototype counterpart. Bring the real component to that
look; keep every existing feature, state and control reachable.

## Hard rules

- **Do not change behaviour.** No changes to props, emits, store/API calls,
  routing, data flow or which controls exist. Small *additive* affordances are
  fine only when your area brief says so.
- **Do not touch files outside your area.** Shared files are owned by the lead:
  `src/styles/**`, `src/plugins/**`, `src/components/ui/**`, `src/App.vue`,
  `vite.config.ts`, `package.json`, and other areas' files. If you need a shared
  change (a token, a ui component variant), do not make it; describe it in your
  final report.
- **No new Vuetify components** (README rule). Restyling existing Vuetify
  components via scoped CSS / `:deep()` is fine. Prefer Tailwind utilities and
  scoped CSS; inline `style=""` only for dynamic values.
- **Keep selectors tests rely on.** Before renaming or removing any class,
  `data-testid`, or element structure, grep `tests/` for it. Several tests in
  `tests/styles/` and `tests/layouts/` assert specific CSS (heights, z-index,
  safe areas, touch-action, scrims). Keep those values unless the test is
  clearly about the old look, and if you must change one, update the test in
  the same spirit and say so.
- **Translations:** reuse existing i18n keys; do not add new user-facing
  English strings without an i18n key (add keys to `src/translations/en.json`
  only, if truly needed, and report them).
- **Verification you can do:** you cannot see the running app. Check your work
  by reading it carefully against the prototype, then run, from the repo root:
  - `npx pnpm@11.8.0 exec vue-tsc --noEmit` (only if you changed script code)
  - `npx pnpm@11.8.0 exec oxlint --deny-warnings <your files>`
  - `npx pnpm@11.8.0 exec eslint <your files>`
  - `npx pnpm@11.8.0 exec prettier --write <your files>`
  - `npx pnpm@11.8.0 exec vitest run <the test files that cover your area>`
  Do **not** run the whole test suite or start a dev server; other workers are
  running at the same time. Do not commit, stash, switch branches or reset.
- `pnpm` is not on PATH; always use `npx pnpm@11.8.0 …`.

## Final report

End with: the files you changed, what each now looks like (one line each),
anything you deliberately left, any test you changed and why, and any shared
change you need from the lead.
