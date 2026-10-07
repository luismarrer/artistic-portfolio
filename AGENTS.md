# Agent instructions

## Pinned design rules

The project owner set these rules. Do not change, weaken or remove them, or the tests that guard them, in any redesign, refactor or cleanup, even when a design document, review or task suggests otherwise. Only the owner can lift a rule, by saying so explicitly.

- **The hero grid fills the whole screen on entry.** When a visitor lands on the home page, the hero's ruled grid covers their entire screen, edge to edge and top to bottom, as on the production site. The hero section in `src/components/sections/Hero.astro` keeps `min-h-svh` and is never sized to its content; the grid may continue below that first screen. Guarded by `on entry the hero grid fills the whole screen, top to bottom and edge to edge` in `tests/content-rendering.test.mjs`.
