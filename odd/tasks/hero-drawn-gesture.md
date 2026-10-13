# Hero drawn gesture

## Objective
Replace the repeated Musea wordmark beneath the hero headline with a tasteful, non-verbal ink gesture while retaining the animation-led character of the template.

## Problem and rationale
The header already identifies Musea Art. The hero signature repeats the name rather than adding a distinct visual idea. A small open, asymmetrical ink sweep should feel like an artist's working mark, not another logo or a generic decorative icon.

## Scope and constraints
- Keep the header brand and footer signature unchanged.
- Preserve the owner-pinned full-screen hero grid, `min-h-svh`, scroll hint timing, and `bottom-6` wrapper.
- Reuse existing signature drawing hooks and existing ink color; introduce no dependencies, extra animation engine, loops, or new brand text.
- Keep the gesture visible with no JavaScript and reduced motion; hide the pen when static.
- Preserve pre-existing mobile trail edits in `src/scripts/artistic-motion.ts`; do not stage or commit them.
- Authorized source surfaces: `src/components/sections/Hero.astro`, new `src/components/svgs/HeroGesture.astro`, `src/scripts/artistic-motion.ts` (only the path-only drawing-duration fallback), `tests/motion.test.mjs`, `tests/content-rendering.test.mjs`.

## Delivery
Feature branch: `codex/hero-drawn-gesture`, branch point `4442588`.
Strategy: `ask-on-risk`; forecast approximately 150–220 authored changed lines, generated files excluded. No push, PR, merge, or deployment authorized.
RDD: off, decided by global preference; ordinary verification applies.

## Tasks
- [x] **T1 — Replace the duplicate hero signature with an ink gesture.** Route: delegated direct; reading prepares a write and several non-trivial files require a bounded writer. Added a decorative path-only SVG, retained the footer signature, and reused writing-plus-underline time for a deliberate 0.72s drawing. Deterministic contracts, independent verification, and desktop/mobile visual checks passed. Work-unit commit identity is recorded below after commit creation.

## Acceptance criteria
- The header remains Musea Art; the hero gesture has no visible brand text and is hidden from accessibility semantics.
- The gesture draws continuously within the existing intro budget and its pen lifts at completion.
- Footer signature choreography and both pinned owner rules remain intact.
- No-JS and reduced-motion views display the complete gesture without a stray pen.
- The unrelated mobile trail diff remains unstaged and byte-for-byte preserved.

## Applicable checks
- Test-first: observe failing deterministic content and path-only timeline contracts before implementation; `pnpm test` is the established runner.
- Writer: `pnpm test`, `pnpm build`, `git diff --check`.
- Parent: one focused reported-command spot check; native risk assessment with RDD off; independent verification if high/unassessable.
- Browser: built local preview, desktop and narrow viewport composition, normal animation states, and reduced-motion/static behavior where the available browser can inspect them.

## Progress and evidence
- Exploration complete: existing motion supports paths without clip/text. A path-only gesture currently receives only underline time; reuse writing time for the hero-only path to retain a deliberate drawing rhythm.
- Pre-existing motion hash: `4c641d0cff9c4eea49262402cd2bf023d8539995475b90cbbd0d590b556872ec`.
- Original motion snapshot: `/private/tmp/hero-drawn-gesture-original-motion.ts` (preservation evidence only, not review authority).
- Writer implemented the gesture and isolated duration fallback. RED: two expected contract failures before implementation. GREEN: `pnpm test` 111/111; `pnpm build` passed with zero Astro diagnostics; `git diff --check` passed. Parent repeated `git diff --check` successfully.
- Writer preservation check: removing only its fallback hunk reproduces the original motion snapshot byte-for-byte.
- RDD remains off/global (`disabled/unmanaged`). Native risk assessment was unassessable/high due the untracked-file inventory; independent verification completed without starting a native review. Independent `pnpm test`: 111/111; `pnpm build`: six pages and zero errors/warnings/hints; `git diff --check`: passed. No code findings.
- The writer's Astro preview did not become reachable. A loopback-only Python static server for the built output succeeded after local bind approval; preview at `http://127.0.0.1:4321/`, exec session 75714.
- Browser visual QA: desktop 1280x720 and mobile 390x844; no duplicate hero brand text, balanced composition, complete path visible, pen hidden at completion. After reload, observed the path's stroke offset at 397.832px, then at 0px with opacity 1; final pen opacity 0/visibility hidden. No captured browser errors. Temporary viewport override reset.
- No-JS and reduced-motion behavior were checked through static markup and deterministic tests, not through browser media emulation (unavailable in the exposed controls).
- Screenshot: desktop proof saved in the session visualization directory as `hero-gesture-desktop.jpg`.
- Commit identity and final authored line count pending.

## Next step
Commit the verified work unit, record its identity, and keep the user's original mobile trail diff unstaged. No remote delivery is authorized.
