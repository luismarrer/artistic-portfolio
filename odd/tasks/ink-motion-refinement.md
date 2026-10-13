# Ink motion refinement

## Objective and problem
Fulfill all five requested refinements: slow the hero ink gesture, make its drawing instrument slender and artistic, use exactly the same ink color for every drawing and scroll trail, remove the scroll trail's dots, and slow the footer signature. This is an animation-led template, not a personal-content project.

## Design decisions and rationale
- Use the official GSAP core/timeline skills: explicit sequencing, synchronized pen/stroke duration and easing, independent content interactivity. Timing is expressive design judgment, not a universal millisecond rule.
- Start with a 2.2s hero stroke and 2.65s footer drawing, using continuous linear pen/stroke travel and a short lift. Keep headline and CTA usable on their existing quick schedule.
- Replace the three chunky instrument drawings with one small shared `DrawingPen.astro`: tapered barrel, slender nib, restrained hardware details, no new brand or logo.
- Introduce `--color-drawing-ink` as the sole ink color for hero, footer, and scroll trail; remove the trail's color gradient. Hardware/highlights may remain distinct from the actual ink.
- Remove the generated blot circles and their obsolete route metadata/timing lookup, not merely hide them. Retain the continuous path, moving pen, scrolling behavior, and teardown.

## Scope and constraints
- Preserve owner-pinned full-screen hero grid (`min-h-svh`) and production scroll-hint timings plus `bottom-6` wrapper. No owner rule or guarding test is changed.
- The previous 1.2s decorative intro limit is not owner-pinned and is superseded only for the requested slower drawing. Keep a fast, independently tested title/CTA schedule.
- Preserve the user's pre-existing mobile resize/lead/glide changes in `src/scripts/artistic-motion.ts` exactly; never stage or commit them.
- English code, comments, tests, and new documentation. No dependencies, loops, remote work, deployment, or contact submissions.
- Allowed source surfaces: `src/global.css`, `src/components/svgs/Signature.astro`, `src/components/svgs/HeroGesture.astro`, `src/components/svgs/InkTrail.astro`, new `src/components/svgs/DrawingPen.astro`, `src/scripts/artistic-motion.ts`, `tests/motion.test.mjs`, and `tests/content-rendering.test.mjs`.

## Delivery and routing
Branch: `codex/ink-motion-refinement` from `10344ae`.
Strategy: `ask-on-risk`; forecast 280–380 authored changed lines, generated files excluded. If actual delivery exceeds approximately 400 lines, resolve slicing strategy before commit; this is not a reason to omit tests or compress code.
RDD: off/global; ordinary checks plus independent verification if native risk is high/unassessable.

## Tasks
- [x] **T1 — Refine the shared ink drawing system.** Delegated direct: multi-file behavior and preparation-for-writing require one bounded writer. Implement the complete five-part motion refinement as one coherent visual system, with observed RED → GREEN, all applicable checks, browser evidence, and a Conventional Commit. No narrowed substitute outcome.

## Acceptance and proof
1. Hero path drawing is visibly slower than 0.72s, starts without delaying content, and completes with a hidden pen; verify timeline duration/ease and browser progress.
2. One shared slender drawing instrument appears in hero, footer, and scroll trail; inspect rendered geometry and moving/final frames in desktop/mobile views.
3. Computed ink color is identical for hero path, footer text/path, and scroll trail; verify the shared token, absence of stroke gradient, and actual browser colors.
4. The scroll trail creates zero circles/splatters during repeated scroll/resize/navigation; verify controller behavior, absence of blot machinery, and live DOM after scrolling.
5. Footer word/path drawing is slower than the previous 1.0s combined duration, pen and ink remain synchronized, and content stays accessible; verify controller duration and browser drawing/completion.
6. No-JS/reduced-motion complete ink and hidden pens, teardown/route logic, pinned owner rules, and all previous meaningful tests remain correct.

## Checks
- Test-first deterministic motion/content assertions with `pnpm test`, observe RED before source changes; retain nonobsolete coverage.
- Writer: `pnpm test`, `pnpm build`, `git diff --check`, original mobile diff preservation comparison.
- Parent: one focused command spot check, native risk assessment without enabling RDD, independent verification when applicable.
- Browser: local built output, desktop/mobile, hero/footer pacing, pen lift, exact ink colors, scroll trail no circles, static fallback where supported; record any unsupported media emulation honestly.

## Progress and evidence
- Source map: points are generated SVG circles in the trail; the hero/footer/trail currently have divergent colors and duplicate pencil geometry.
- Skills loaded: GSAP core/timeline/ScrollTrigger and frontend-design. Official easing reference: https://gsap.com/docs/v3/Eases/ ; animation durations remain design judgment.
- Pre-change motion snapshots: `/private/tmp/ink-motion-original.ts` (current including user changes), `/private/tmp/ink-motion-base.ts` (committed baseline), and `/private/tmp/ink-motion-original-user.patch` (user-only diff).
- Implementation, tests, visual proof, and commit pending.

## Next step
Run one bounded writer for all five requirements, then independently verify and inspect the actual rendered animations before delivery.
