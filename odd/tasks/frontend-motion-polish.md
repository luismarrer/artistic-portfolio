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
- [x] **T3 — Motion that answers navigation.**
  - Each catalogue or featured cover morphs into its case cover through a matching `transition:name`. Animation is disabled under reduced motion.
  - Text links get a drawn annotation underline on hover and `:focus-visible`, while the resting underline and focus outline stay visible.
  - Appended arrow glyphs are removed where the underline carries the affordance.
- [x] **T4 — Navigation semantics.**
  - Add a skip link to `#main`.
  - Add `aria-current="page"` on the current destination.
  - The brand is no longer a heading, and its look is unchanged.
- [x] **T5 — Lighter first view.**
  - The header mark uses a correctly sized local derivative instead of the 1.0 MB, 1024px PNG.
  - Validated dimensions and the configuration remain coherent.
- [x] **T6 — Full-screen hero on entry (owner-pinned rule).** Added on 2026-10-07 at the owner's request. It supersedes the content-height hero from portfolio-foundations `06e6884`, which T1 kept and pinned.
  - On entry the hero grid fills the visitor's whole screen, edge to edge and top to bottom, as in production: `min-h-svh` on the hero, with the header floating over it.
  - The rule is recorded for every agent (`AGENTS.md`, `CLAUDE.md`, `docs/DESIGN.md`, `CUSTOMIZATION.md`) and guarded by a dedicated test.
  - The two assertions that pinned the opposite are removed. The grid tail below the first screen stays.

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

- **Work-unit commit.** `412bd4a`, `feat(motion): write the hero intro within the documented budget`. Local boundary branch: `codex/frontend-02-motion`. No push and no PR.

## T3 evidence

- **Route.** Delegated direct to one bounded writer. Trigger: card, collage, case-page, header and CSS changes, plus rendered tests.
- **RED.** 97 tests, 89 pass / 8 fail, each failing for the intended reason. The writer also ran 21 temporary single-point mutations; each failed on its intended assertion, and the files were restored.
- **GREEN.** 97 / 97. The parent re-ran `pnpm test`: 97 pass / 0 fail.
- **Functional checks.** Writer `pnpm build`: astro check over 32 files with 0 errors, warnings or hints; 6 pages. `git diff --check`: clean.
- **Production-build browser check (parent, `dist-static`).**
  - The catalogue prints carry `project-cover-1..3`.
  - Case page 2's cover print carries `project-cover-2` with `view-transition-class: project-cover`. It has no `data-reveal`, so it gets no entrance.
  - With the drawn state forced, the annotation stroke sits under "View collection", the project navigation and the footer-adjacent links in both accent and ink colours. There is no overflow at 375px.
  - When "Next collection: <title>" wraps at 375px, the stroke spans the label box under its last line. That is an accepted corner case: on touch devices hover drawing is disabled, so it only shows on keyboard focus.
- **Not visually verified.** The morph animation itself. The Browser pane is hidden, so `document.startViewTransition` is skipped (`InvalidStateError`). Pairing, classes and timing are verified structurally and by tests. The morph quality is pending a visible-browser check.
- **Decisions.**
  - The named prints use `transition:animate="initial"`, because Astro's default 180ms fade would end before the .42s group morph.
  - Astro inlines its reduced-motion view-transition rule only on pages that declare a name, so the global reduced-motion rule is the guard on `/contact`.
  - `.annotate` sits on a `<span>` inside each link, so the link keeps its focus ring and 44px target.
  - Hover drawing is gated by `(hover: hover) and (pointer: fine)`.
  - The directional arrows in the case navigation stay, as `aria-hidden` spans. The decorative arrows were removed.
- **Native assessment.** Risk `medium` (`executable_change`), RDD off: writer self-verification plus parent spot check. No review was started.
- **Size.** 453 authored lines (+414 / -39; tests about 230). This is a cohesive behaviour with its tests, slightly over the planning heuristic.

- **Work-unit commit.** `711e3a7`, `feat(navigation): morph covers between pages and draw link annotations`. Local boundary branch: `codex/frontend-03-navigation`.

## T4 evidence

- **Route.** Delegated direct to one bounded writer. Trigger: layout, header, CSS, a new navigation helper and rendered plus unit tests.
- **RED.** 105 tests, 97 pass / 8 fail. The 8 failures are exactly the new tests. The writer's mutation pass of 29 single-point mutations killed every one, and the files were restored.
- **GREEN.** 105 / 105. The parent re-ran `pnpm test`: 105 pass / 0 fail.
- **Functional checks.** Writer `pnpm build`: astro check over 34 files with 0 errors, warnings or hints; 6 pages. `git diff --check`: clean.
- **Production-build browser check (parent, `dist-static`, real key presses).**
  - The first Tab focuses "Skip to content": an ink chip at the top-left with the accent outline, `:focus-visible`.
  - Enter moves to `#main`, and the next Tab lands on the first project card, skipping the brand and nav.
  - `/portfolio` marks only Portfolio with `aria-current="page"` and its permanently drawn stroke.
  - The header contains no headings. The brand renders as Mansalva 24px, weight 400.
- **Decisions.**
  - The skip-link label stays in the layout, like the other landmark names, instead of becoming a new required `site` key.
  - The pure `isCurrentPage(href, pathname)` in `src/data/navigation.ts` normalizes trailing slashes and is unit-tested.
  - ClientRouter's same-page hash path ends in native fragment navigation, so there is no `data-astro-reload`.
- **Native assessment.** Risk `medium` (`executable_change`), RDD off: writer self-verification plus parent spot and runtime checks. No review was started.
- **Size.** 268 authored lines (+264 / -4; tests about 200).

- **Work-unit commit.** `232005b`, `feat(a11y): add skip link, current-page state and non-heading brand`. Local boundary branch: `codex/frontend-04-a11y`.

## T5 evidence

- **Route.** Direct inline: one mechanical asset change plus one data line, one test and one doc sentence. No design decision was left open.
- **RED.** `node --test tests/content.test.mjs`: 21 tests, 20 pass / 1 fail. The new budget test failed with "logo 1024x1024 is larger than any header display needs".
- **GREEN.**
  - `public/logo.png` was resized in place with `sips -Z 192` to 192x192 with alpha. It went from 1.0 MB to 16 KB, and a visual readback was crisp.
  - `site.logo` was updated to 192x192.
  - `pnpm test`: 106 pass / 0 fail.
  - `pnpm build`: 0 errors, warnings or hints; 6 pages.
  - `git diff --check`: clean.
- **Runtime (dist-static).** The header logo is natural 192x192, rendered 45x45, with a transfer size of 16 KB.
- **Docs.** `CUSTOMIZATION.md` now recommends a header mark of about 192px (135-256px, at most 48 KiB), checked by `pnpm test`.
- **Native assessment.** Risk `medium` (`executable_change`), 15 changed text lines plus the binary. RDD is off.

## T6 evidence

- **Trigger.** On 2026-10-07 the owner pinned a design rule: on entry the grid must take the visitor's whole screen, as in production, and no agent may change it again.
  - Production (`main`) has `min-h-svh` on the hero. Portfolio-foundations `06e6884` removed it.
  - Two tests pinned the content-height hero: one from that slice ("the introduction must not reserve a screen before artwork") and one from T1.
- **Route.** Direct inline: one class on the hero, one new test with two obsolete assertions removed, and documentation of a rule the owner already decided. No research and no open design decision.
- **RED.** `pnpm test`: 107 tests, 106 pass / 1 fail. The new test failed with "the hero is at least one full screen tall, never just its content".
- **GREEN.**
  - `min-h-svh` is restored on the hero section, with a source comment pointing to `AGENTS.md`.
  - `pnpm test`: 107 pass / 0 fail.
  - `pnpm build`: astro check over 34 files with 0 errors, warnings or hints; 6 pages.
  - `git diff --check`: clean.
- **Runtime (dist-static).**
  - At 1440x900 the hero box is 1440x900 at the origin. At 375x812 it is 375x812, with no horizontal overflow.
  - Points at both bottom corners, the bottom centre and the left edge resolve inside the hero.
  - A zoomed readback shows the ruled grid reaching the bottom edge.
- **Rule recorded.**
  - `AGENTS.md` holds the pinned design rules, read by Codex and other agents. `CLAUDE.md` imports it for Claude Code.
  - Also in `docs/DESIGN.md`, `CUSTOMIZATION.md` and a supersession note in `odd/tasks/portfolio-foundations.md`.
  - Saved to Claude project memory and Engram.
- **Delivery caveat.** The fix sits at the tip as slice 6. Slices `codex/portfolio-03-presentation` through `codex/frontend-05-weight` still carry the content-height hero, so merging them to `main` without slice 6 would deploy that regression. Publish slice 6 in the same deploy window, or restack the fix right after `06e6884` before publishing.

## Outcome

All six accepted tasks are implemented, verified and committed as local, stacked work units. The owner added T6 on 2026-10-07. Commit and branch details are in the slice table below.

| Slice | Task | Local boundary branch | Commit | Authored lines |
| --- | --- | --- | --- | --- |
| 1 | T1 paper and print system | `codex/frontend-01-paper` | `f2ec28d` | 783 (tests 415) |
| 2 | T2 written intro within budget | `codex/frontend-02-motion` | `412bd4a` | 883 (tests 422) |
| 3 | T3 motion that answers navigation | `codex/frontend-03-navigation` | `711e3a7` | 453 (tests about 230) |
| 4 | T4 navigation semantics | `codex/frontend-04-a11y` | `232005b` | 268 (tests about 200) |
| 5 | T5 lighter first view | `codex/frontend-05-weight` | `51f1906` | 15 plus binary |
| 6 | T6 full-screen hero on entry | `codex/frontend-06-hero-screen` | recorded in the slice branch | 41 (tests 25) |

- **Size and delivery.** About 2,400 authored lines plus tracking, against a 900-1,300 forecast. The forecast was low, mostly because strict TDD tests are about half of every slice; it was never a cap.
  - Slices 1-3 exceed 400 lines as cohesive behaviours with their tests. Recommend `size:exception` for those when publishing.
  - The chain stacks on `f6ce18a` (the `codex/portfolio-foundations` tip), whose slices are not on `main` yet.
- **Checks not performed or not conclusive.**
  - The cover morph animation was not watched. The hidden Browser pane skips view transitions; pairing, classes and timing are covered by tests and structural checks.
  - WebKit/Safari was not tested.
  - The full DESIGN width matrix was not run. Checked widths: 375 and 1440.
  - Reduced motion was verified by unit tests and CSS assertions, not by browser emulation.
- **Out of band.** A separate session is removing unreferenced assets on `claude/remove-dead-assets`. It was told to skip `Drawing.astro`, which T2 already deleted.

## Next step

Watch the cover morph and the drawn underline in a visible browser, including Safari, and review the slices. Publishing pull requests, in order toward `main` after the portfolio-foundations slices, needs explicit authorization. Slice 6 must ship with them (see the T6 delivery caveat).

## Verification method note

The session paused once at a usage limit after T2 and resumed without loss.

For agent-driven browser checks:
- Use the local `dist-static` preview (Python serving `dist` on port 4322) rather than the dev server.
- While the Browser pane is hidden, native `requestAnimationFrame` never fires and view transitions are skipped. Load pages in an iframe with a setTimeout-based rAF polyfill to measure GSAP timing.
