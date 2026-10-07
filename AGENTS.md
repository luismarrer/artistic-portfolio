# Agent instructions

## Pinned design rules

The project owner set these rules. Do not change, weaken or remove them, or the tests that guard them, in any redesign, refactor or cleanup, even when a design document, review or task suggests otherwise. Only the owner can lift a rule, by saying so explicitly.

- **The hero grid fills the whole screen on entry.** When a visitor lands on the home page, the hero's ruled grid covers their entire screen, edge to edge and top to bottom, as on the production site. The hero section in `src/components/sections/Hero.astro` keeps `min-h-svh` and is never sized to its content; the grid may continue below that first screen. Guarded by `on entry the hero grid fills the whole screen, top to bottom and edge to edge` in `tests/content-rendering.test.mjs`.
- **The arrow under the hero keeps its production animation.** The scroll hint (`.js-scroll-hint`) enters and then bounces without end, exactly as on the production site.
  - It fades in from 6px above over 0.6s, after 1.4s.
  - From 1.8s it moves 8px down and back forever (1.1s each way, `sine.inOut`).
  - The values live in `PINNED_SCROLL_HINT` in `src/scripts/artistic-motion.ts`, and its wrapper keeps `bottom-6`.
  - With reduced motion the arrow stays still and visible.
  - It is an exception to the intro's 1.2s budget and to the design brief's no-loops guideline.
  - Guarded by `the scroll hint enters and bounces exactly as on production` in `tests/motion.test.mjs`.
