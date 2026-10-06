# Front-end and motion polish

## Objective and authorization

Make the portfolio read as one coherent "open workbook" (the `docs/DESIGN.md` concept) and bring its motion within the documented budget. The user authorized implementation on 2026-10-06 with **"Ahora mejora el front-end y las animaciones de este proyecto. /goal"**.

## Problem and why

Observed in the local dev server at 1440x900 and 375x812, and in the delegated code map:

- Surfaces disagree. Home is on paper; the portfolio intro, case pages and footer are white. The workbook stops between routes, and the ink trail crosses a white band into the footer.
- The hero grid ends in a hard horizontal cut directly above the first artwork.
- Catalogue covers keep their native ratios, so the three-column grid is ragged. Artworks use rounded web-card corners instead of reading as mounted prints.
- Body copy is below the documented 1.125rem/1.6 scale. The case category is a tracked all-caps eyebrow.
- Motion runs over budget and has defects:
  - Hero words fly in with rotation, and the signature pen runs 1.85s, beyond the ~1.2s intro budget.
  - The signature clip wipe has been a no-op since `42fb874`, so only the pen moves.
  - The scroll hint bobs forever, against the documented "no loops" rule.
  - Secondary reveals slide every block.
  - Ink blots float detached from the stroke.
- Navigation gives no visual link between a catalogue cover and its case page. Links rely on a static underline plus an appended arrow glyph.
- Navigation semantics are missing: no skip link, no `aria-current`, and the brand is an `<h2>` (DESIGN asks for no heading).
- Every page loads a 1.0 MB, 1024px logo that renders at 45px.

## Design plan

- **Color.**
  - Paper `#FEEACA` is the surface of every page.
  - Peach `#F3AC9E` is only the hero wash.
  - Ink `#201B20` is for text.
  - Muted ink `#494149` is secondary text.
  - Accent `#B22222` is for actions, focus and ink.
  - Surface `#FFFFFF` is for print mounts and form fields.
- **Type.**
  - Mansalva for h1, h2, the signature and short annotations.
  - Josefin Sans 400 for body: 1.125rem/1.6, measure at most 64ch.
  - Josefin Sans 600 for labels: 0.9375rem, sentence case.
  - Josefin Sans 700 for card and section titles.
- **Layout.**
  - Each route is one paper page.
  - The hero grid continues behind the top of the first work and fades out.
  - Artworks appear as mounted prints: white mount, near-square corners, a tight contact shadow.
  - Catalogue covers are a stable 4:3.
- **Principles.**
  - Spend boldness on the hero page: a written headline, the signature, and the grid flowing into the first print. Everything else stays quiet.
  - There is one orchestrated intro. Elsewhere, motion only answers a person's action: a cover morph between pages and a drawn annotation underline on hover or focus.
- **Review against generic defaults.**
  - The hero stays centered. Its identity and the trail routing are tuned for it, so this is not a new layout.
  - Scattered fade-up reveals, card hover lifts and arrow glyphs are rejected as template tells.
  - The warm paper and red palette are the brief's own identity, not a default.

## Scope and constraints

- **Keep:**
  - Astro, Tailwind and GSAP. No new animation library.
  - The six routes, content and copy claims, credits and honest demo labelling.
  - Mansalva Regular only. Josefin Sans at 400, 600 and 700.
- **Preserve every hook that tests or `CUSTOMIZATION.md` pin:**
  - `data-hero`, `.js-hero-title span`, `#start` (`href="#projects"`, never `data-reveal`), `data-magnetic` and `.js-scroll-hint`.
  - `#projects` (exactly one eager image), `#about` and `data-trail-content`.
  - Sections and footer as direct children of `main`.
  - `article[data-project-entry]` > `a.project-card` with no nested links. Credits come after the card link.
  - `data-project-cover`, always-visible figcaptions and `nav[aria-label="Project navigation"]`.
  - Contact form ids and attributes.
  - The literal `<html lang="en">`.
  - The CSS facts `--color-ink: #201b20`, `.hero-heading { color: var(--color-ink) }` and no `.has-motion #start`.
- **Keep the motion harness contract:**
  - `buildTrailRoute`, `toSmoothPath`, `initCtaAndHover`, `initReveals` and the `bootArtisticMotion` export.
  - Only the double-backed GSAP/ScrollTrigger APIs.
  - Two permanent `document` listeners and two `window` listeners.
- **Reduced motion:**
  - Show the final state immediately.
  - `ClientRouter` already disables view-transition animations under reduced motion. This was verified in the Astro docs through Context7.
  - Focus never waits for an animation.
- **Out of scope:** no new pages, CMS, lightbox, content rewrite, push, pull request, merge or deployment.
- **Local files:** untracked `.atl/`, `.codegraph/` and `.claude/launch.json` stay local. They are excluded through `.git/info/exclude` and not committed.

## Execution and delivery

- **Branch.** Feature branch `codex/frontend-motion-polish`, created from `f6ce18a` (the tip of `codex/portfolio-foundations`).
- **Route.** Delegated direct: the mapping needed more than four files, and each task writes several non-trivial files. No SDD artifacts.
- **TDD.** Enabled. Source: the user's global instructions (`~/.claude/CLAUDE.md` "Strict TDD Mode: enabled" and `/Users/luis/AGENTS.md`).
  - Runner: `pnpm test` (`node --test tests/*.test.mjs`). `content-rendering.test.mjs` runs `pnpm build` at import, so new rendered assertions live there to avoid concurrent builds racing on `dist`.
- **Baseline.**
  - `pnpm test`: 57 pass / 0 fail.
  - `pnpm build`: astro check over 33 files with 0 errors, warnings or hints; 6 pages; sitemap generated.
- **Functional checks per task.**
  - `pnpm test` and `pnpm build`.
  - Parent browser review at 1440x900 and 375x812.
  - Reduced-motion code path covered by tests.
- **RDD.** Disabled/unmanaged (`gentle-ai review mode status`: off, decided by global). Delegated writer verification follows `gentle-ai review assess` tiers.
- **Forecast.** 900-1,300 authored additions plus deletions, generated outputs excluded. This is an estimate, not a cap.
- **Delivery.**
  - Strategy: `ask-on-risk`.
  - Chain strategy: `stacked-to-main`, reused from the user's explicit preference ("cambios integrables por separado hacia `main`").
  - Each task is a local slice stacked on the previous boundary.
  - Publishing pull requests needs separate authorization.

## Tasks and acceptance

- [x] **T1 — Paper and print system.**
  - Introduce color, type and print tokens.
  - Every route and the footer sit on paper with no hard-coded white or `#FEEACA` surfaces in components.
  - The footer gets a drawn rule.
  - The hero grid continues behind the first work and fades out.
  - Artworks (featured, catalogue, gallery) use one mounted-print treatment, with catalogue covers at 4:3.
  - Body text follows the 1.125rem/1.6 scale with a 64ch measure. Labels are sentence case.
  - Contact fields use surface and token borders with at least 3:1 contrast.
- [x] **T2 — One written intro within budget.**
  - Hero words are written left to right by a clip wipe, with no flight or rotation.
  - The signature clip actually wipes, synchronized with a shorter pen.
  - The complete intro ends by about 1.2s.
  - The scroll hint appears once, with no infinite loop.
  - Secondary reveals become short, translation-light fades.
  - Ink blots sit on the stroke or are removed.
  - The legacy `initSketch` is removed with its orphan `Drawing.astro`.
  - Reduced motion and lifecycle guarantees are unchanged.
- [ ] **T3 — Motion that answers navigation.**
  - Each catalogue or featured cover morphs into its case cover through a matching `transition:name`. Animation is disabled under reduced motion.
  - Text links get a drawn annotation underline on hover and `:focus-visible`, while the resting underline and focus outline stay visible.
  - Appended arrow glyphs are removed where the underline carries the affordance.
- [ ] **T4 — Navigation semantics.**
  - Add a skip link to `#main`.
  - Add `aria-current="page"` on the current destination.
  - The brand is no longer a heading, and its look is unchanged.
- [ ] **T5 — Lighter first view.**
  - The header mark uses a correctly sized local derivative instead of the 1.0 MB, 1024px PNG.
  - Validated dimensions and the configuration remain coherent.

## Progress and evidence

- Exploration complete:
  - Delegated read-only map of the toolchain, pinned hooks, motion controller, components, content and design docs.
  - Parent browser review of all routes on desktop and mobile.
  - Context7 confirmed the Astro `transition:name` pairing and the reduced-motion behavior.
- Discoveries saved to Engram as #555 (`discovery/frontend-redesign-constraints`) through the CLI fallback. MCP `mem_save` refuses with "multiple active runtime sessions".
- Engram mirror: topic `odd/frontend-motion-polish/tasks`, written through the CLI fallback for the same reason.

## T1 evidence

- **Route.** Delegated direct to one bounded writer. Trigger: 14+ non-trivial files across tokens, components, pages and tests.
- **RED.**
  - 68 tests, 57 pass / 11 fail. The 11 failures are exactly the new presentation tests.
  - The focal-point correction then had 72 tests, 68 pass / 4 fail.
- **GREEN.** 72 / 72. The parent re-ran `pnpm test` before commit: 72 pass / 0 fail.
- **Functional checks.**
  - Writer `pnpm build`: astro check over 33 files with 0 errors, warnings or hints; 6 pages.
  - `git diff --check`: clean (parent re-ran it).
- **Browser review (parent, 1440x900 and 375x812).**
  - The grid continues seamlessly behind the first print and fades.
  - One paper surface on home, portfolio, case pages, contact and footer.
  - Aligned 4:3 mounted covers, and project 3's head stays inside the crop.
  - No horizontal overflow at 375px.
- **Accepted correction.** The 4:3 crop cut the top of project 3's cover. An optional, strictly validated media `focalPoint` (`"<x>% <y>%"`, 0-100) now positions cropped covers only. Project 3 uses `50% 0%`, a value measured against the artwork.
- **Decisions.**
  - Synthetic bold removed from the Regular-only Mansalva.
  - The grid line colour is a literal with 20% alpha, because the minifier rewrote `color-mix()` over `var()` into a solid fallback.
  - The About portrait tilt moved onto the image, since GSAP owns the wrapper's transform.
- **Observed for T2, not caused by T1.**
  - A small signature pen mark stays visible after the hero and footer signatures finish (computed opacity 1).
  - Ink blots float off the stroke.
  - The dev server needs a restart after builds: "504 Outdated Optimize Dep" stops GSAP from loading in dev only.
- **Native assessment.** `gentle-ai review assess`: risk `medium` (`executable_change`). RDD is off, so the writer's self-verification plus the parent spot check is the record. No review was started.
- **Size.** 783 authored lines (+679 / -104; tests +415), plus tracking.
  - One slicing pass found no independent split below 400: paper, prints and type share tokens, `PortfolioComponent` and their tests.
  - Recommend `size:exception` when publishing.

- **Work-unit commit.** `f2ec28d`, `feat(presentation): put every page on one paper with mounted prints`. Local boundary branch: `codex/frontend-01-paper`. No push and no PR.

## T2 evidence

- **Route.** Delegated direct to one bounded writer. Trigger: the motion controller, global CSS, markup and two test files are non-trivial.
- **RED.**
  - Full suite: 88 tests, 72 pass / 16 fail. That is 14 motion failures plus 2 built-output failures; the motion file alone was 24 tests, 10 pass / 14 fail.
  - One more edge-case test was proven RED by temporarily reverting the line under test.
- **GREEN.** 89 / 89. The parent re-ran `pnpm test`: 89 pass / 0 fail.
- **Functional checks.** Writer `pnpm build`: astro check over 32 files with 0 errors, warnings or hints; 6 pages. `git diff --check`: clean.
- **Production-build browser check (parent).**
  - Method: the built `dist` was served statically. The Browser pane is hidden, so native `requestAnimationFrame` never fires there. The page was loaded in an iframe with a setTimeout-based rAF polyfill injected before its scripts. Timers measured 60 Hz.
  - Observed from motion boot:
    - Words are clip-written from 0.28s to 0.78s.
    - The signature clip wipes 0 to 560 in sync with the pen from 0.44s to 0.93s.
    - The pen lifts by 1.20s.
    - The scroll hint fades in once from 0.93s to 1.20s and never moves again.
  - The final state shows no pen mark and no clipped glyphs.
  - Ink blots are measured within 0.7px of the stroke.
  - CTA activation focuses `#projects` immediately with no outline, and the scroll settles in about 0.9s with the target 16px from the top.
- **Root cause of the visible pen mark.** The pen had no default hidden state. Only the `.has-motion` gate and GSAP inline styles hid it, and the reduced-motion block even forced it visible. It is now hidden by default and in the static fallback.
- **Decisions.**
  - The suggested timings summed to about 1.37s, so the writer tightened them (start .40, write .50, underline .22, lift .12) to meet the 1.25s assertion.
  - The pen rule uses `opacity: 0; visibility: hidden`, because Lightning CSS merged an opacity-only rule into a `:has()` list that older browsers would drop.
  - `Drawing.astro` and `initSketch` were removed. No `.firma` CSS existed.
- **Environment notes.** The dev server returns "504 Outdated Optimize Dep" after builds, which stops GSAP from loading in dev. Production-build checks are authoritative.
- **Native assessment.** Risk `medium` (`executable_change`), RDD off: writer self-verification plus parent spot check and runtime check. No review was started.
- **Size.** 883 authored lines (+624 / -259; tests +410 / -12).
  - The motion rewrite is one cohesive controller change: timing constants, signature schedule, reveals, CTA focus and blots share `initSignatures`, `initReveals` and the harness doubles.
  - Recommend `size:exception` when publishing.

## Next step

Commit T2, then delegate T3 (motion that answers navigation).
