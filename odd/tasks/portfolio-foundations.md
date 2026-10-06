# Portfolio foundations

## Objective and authorization

Implement the accepted assessment priorities: a convincing, honestly labelled artistic demo that is easier to personalize, with readable presentation, safe contact behavior and reproducible checks. The user authorized this direction with **"Pon el esfuerzo donde va"** after the project assessment.

## Problem and why

Identity is scattered across components; every project uses the same fallback collage; work appears after a full-screen introduction and biography. The hero heading has weak contrast. Contact sends to a demo owner's endpoint without pending/error states. A passing build currently skips the sitemap, and there are no automated regression tests or CI workflows.

## Scope and constraints

- Preserve Astro, Tailwind, GSAP, the grid, handwritten typography, warm palette, signature and ink trail.
- Keep `/`, `/portfolio`, `/contact`, `/projects/1`, `/projects/2` and `/projects/3` available.
- Centralize site identity, biography, navigation, social links, contact and metadata; validate project data and asset references.
- Give each demo case its own credited gallery; complete one editorial reference case. Use existing assets only, label curated demonstrations, and do not invent authorship, clients, metrics, production process or results. Existing credits are not proof of licensing.
- Show selected work before biography; distinguish the homepage selection from the full catalogue.
- Default contact to explicit demo/no-send mode. Configured live mode needs safe submission states and native HTML fallback.
- Fix public URL/canonical/social metadata and generated sitemap using the already documented demo URL with a customization override.
- Add targeted tests and CI, and align existing Spanish customization documentation with observed behavior. New code/UI/task artifacts are English.
- No CMS, lightbox, slug migration, new animation system, release, push, PR creation, merge, deployment or real contact delivery is authorized.
- Preserve unrelated untracked `.atl/` and `.codegraph/` directories.

## Execution and delivery

- Feature branch: `codex/portfolio-foundations`.
- Branch point: `e67896f34e2674606418b58ee172035ca1304761`.
- Route: delegated direct. Mapping/preparation needed more than four files; every behavior task touches multiple non-trivial files. No SDD artifacts.
- TDD: **enabled**, explicit source `/Users/luis/AGENTS.md:624-626`; no project override found.
- Runner: native Node test runner, `node --test tests/*.test.mjs`, exposed as `pnpm test`; local Node 26 supports relative erasable TypeScript imports, CI will use Node 24. No test dependency installation is needed. Each task must record observed RED, GREEN and refactor/check results.
- Functional checks: focused tests and `pnpm build` for each unit; final local browser navigation, 390px/1440px presentation, reduced-motion/code-lifecycle checks, no actual Formspree delivery.
- RDD: **disabled/unmanaged**, `gentle-ai review mode status --cwd /Users/luis/Dev/artistic-portfolio` reported off, deciding source global. Do not start reviews.
- Forecast: **1,300-1,950 authored additions + deletions**, generated outputs excluded. This is an estimate, not a code cap. Keep tests/docs with behavior; do not compress, omit checks or split artificial units to fit 400 lines.
- Delivery strategy: `ask-on-risk` (default).
- Chain strategy: **`stacked-to-main`**, explicitly selected by the user: "cambios integrables por separado hacia `main`". Each slice can land in order; later PRs use their immediate parent until it lands and can be retargeted to main. PR publication still needs separate authorization.
- Running authored count: **2,484 committed additions + deletions**, including 123 lines of tracking changes; implementation/tests/docs subtotal 2,361. Generated outputs excluded. The original forecast was low; remaining quality/contact scope is retained.

## Tasks and acceptance

- [x] **T1 — Centralize and validate content.** Delegated configuration/data/model wiring and focused tests. Identity, language, biography, navigation, social links, public URL and contact configuration use validated typed sources; compatible numeric IDs and media metadata fail before publication when invalid. Observed checks are recorded below; work-unit commit is recorded after creation.
- [x] **T2 — Give cases their own evidence.** Delegated project gallery/editorial rendering and tests. All three case galleries are distinct (3 / 1 / 2 images); reference images have visible captions, creator/source links and grounded editorial notes. Configurable required disclosure retains honest demo attribution without mislabelling future original work. No fallback substitution; observed checks below, commit recorded after creation.
- [x] **T3 — Put work first and improve readability.** Delegated home/portfolio/hero/controller changes and tests. One selected real cover precedes biography; the full catalogue has three real covers, dark hero ink is readable, controls/credits remain immediately visible, and ink follows the actual layout. Observed checks below; work-unit commit identity recorded after creation.
- [x] **T4 — Make contact safe and reliable.** Delegated submission lifecycle/states and controlled tests. Demo mode never sends; live configuration is validated; in-flight duplicates are blocked; success, provider rejection, network failure and retry are accessible; failed input is retained; navigation reinitializes without duplicate listeners; actual live HTML preserves native configured POST. No real delivery; observed checks below, commit recorded after creation.
- [ ] **T5 — Verify publication and document customization.** Delegate metadata/sitemap checks, critical motion lifecycle regressions, CI and accurate docs. Six routes, distinct galleries, asset/internal links and publication metadata are checked; sitemap is generated; reduced-motion and repeated page-load/swap are tested, including cancellation of queued frame/late-font setup found during verification. CI uses the verified Node/pnpm commands; README/CUSTOMIZATION and scoped roadmap status describe implemented behavior without claiming remote execution or release. RED/GREEN, final build/tests/browser checks, rollback boundary and commit: pending.

## Progress and evidence

- Exploration complete: delegated content/quality mapping; existing asset dimensions/credits and demo limitations inspected.
- Baseline `pnpm build`: exit 0, Astro checked 22 files with zero errors/warnings/hints, six static pages; separate warning skipped sitemap because `site` is missing.
- Native test modules available; no existing test runner or CI workflow. Strict TDD comes from inherited instructions, not test presence.
- User delivery choice resolved; source implementation can begin. Tracking document and branch were created before source implementation.
- Engram mirror: topic `odd/portfolio-foundations/tasks`; full document must be read back after every update.

## Next step

Delegate T5: publication identity/metadata/sitemap, critical reduced-motion/navigation checks, reproducible CI and accurate documentation. Retain local-only authorization and the explicit demo no-send contact default.

## Planned local delivery slices

| Slice | Task | Local end-boundary branch | Dependency | Commits / actual lines |
| --- | --- | --- | --- | --- |
| 1 | T1 | `codex/portfolio-01-content` | branch point / main | `42fb874e67ff86173f06748b6bb5e3c11d2fef17` / 1,374 (1,293 excluding tracking) |
| 2 | T2 | `codex/portfolio-02-cases` | slice 1 | `fb242f33d6dc61ffbf1c0acab33029caa6175f3b` / 450 (429 excluding tracking) |
| 3 | T3 | `codex/portfolio-03-presentation` | slice 2 | `06e68846cc18b15dc6ddf932dde5e26a9cb33dd6` / 660 (639 excluding tracking) |
| 4 | T4 | `codex/portfolio-04-contact` | slice 3 | pending |
| 5 | T5 | `codex/portfolio-05-quality` | slice 4 | pending |

These are local work-unit boundaries, not published pull requests. Actual counts may justify a cohesive over-budget slice; recommend `size:exception` when publishing if a single honest slicing pass cannot keep it below 400, never reduce implementation or tests for line count.

## T1 evidence

- Route: delegated direct; multiple configuration, consumer and test files required mapping/preparation and a bounded writer.
- RED: new validator tests failed before implementation; after validator GREEN, rendered integration tests had 13 pass / 3 fail before component wiring; custom branding regression had 12 pass / 1 fail before its fix.
- GREEN/refactor: parent reran `pnpm test`, 16 passed / 0 failed, exit 0. Tests build current source instead of trusting stale output.
- Functional: parent reran `pnpm build`, 28 checked files, zero errors/warnings/hints, six static pages, exit 0. Separate missing-site sitemap warning remains intentionally pending T5. `git diff --check` passed.
- Runtime boundary: production HTML verifies configured identity/biography/route content and disabled demo contact without remote action. No external delivery occurred; live controller checks belong to T4.
- Discovery/fix: bundling relocates `import.meta.url`; validation resolves the build cwd/public root (or explicit override), not a bundled-chunk directory. Signature is visible without JS and falls back to configured branding.
- Rollback: revert new typed data/validation/tests and migrated consumers together, restoring `projects.json`; unrelated local tooling is outside the boundary.
- Delivery: exactly one read-only slicing pass found no independent existing-byte behavior/test/doc split below 400. Implementation/tests/docs are 1,293 authored lines; no line-golf or omission. Recommend `size:exception` before eventual PR publication, not before this authorized local commit.
- RDD outcome: disabled/unmanaged; no native review or fabricated approval.
- Work-unit commit: `42fb874e67ff86173f06748b6bb5e3c11d2fef17` — `feat(content): centralize validated portfolio configuration`; local end-boundary branch `codex/portfolio-01-content` created. No push/PR.

## T2 evidence

- Route: delegated direct; gallery, case renderer, data contract, tests and docs form one behavior unit.
- RED: 19 tests, 16 pass / 3 fail for own galleries/editorial/catalogue; new disclosure validation then had 20 tests, 18 pass / 2 fail, followed by 19 pass / 1 fail until rendered from data.
- GREEN/refactor: parent reran `pnpm test`, 20 passed / 0 failed, exit 0. Worker `pnpm build` checked 28 files with zero errors/warnings/hints and six pages, exit 0; sitemap remains T5. Diff check passed.
- Runtime: production HTML asserts exact per-case galleries, intrinsic image dimensions, eager uncropped covers, visible captions/credits, editorial and onward links. Parent browsed the nature case on desktop and crossing case at 390x844: loaded own image, readable settled content and documentWidth=viewportWidth=390; no form delivery.
- Contract: `Collage.images` is mandatory/nonempty; every project has validated nonempty `disclosure`. Current content stays explicitly curated reference/demo, not commissioned or original artwork claims.
- Rollback: revert the ten rendering/data/test/doc files together to T1 boundary; no unrelated tooling changes.
- Authored implementation/tests/docs count: 429; keep the coherent unit and recommend publication size exception if needed rather than stripping checks for 400.
- RDD: disabled/unmanaged. Work-unit commit: `fb242f33d6dc61ffbf1c0acab33029caa6175f3b` — `feat(portfolio): render credited project-specific cases`; local end-boundary branch `codex/portfolio-02-cases` created. No push/PR.

## T3 evidence

- Route: delegated direct; home/catalogue/hero, shared content, motion and their tests/docs form one presentation behavior unit.
- RED: initial 24 tests had 20 pass / 4 fail for work order, real covers, full-screen hero and obsolete decorative image key. Actual-controller tests exposed duplicate magnetic handlers and hidden controls. Mobile overflow regression observed x48 instead of x0. Final ink curve regression had 5 pass / 1 fail before measuring the full grid and actual pre-image gap.
- GREEN/refactor: parent final `pnpm test` passed 31 / 31, exit 0; parent `pnpm build` checked 29 files, zero errors/warnings/hints, six HTML pages, exit 0. Separate skipped-sitemap warning stays pending T5. `git diff --check` passed.
- Runtime: parent browser verified 1440x900 and 390x844 home, work before biography, loaded first artwork beginning at y533/y568 respectively; mobile cover ends at y801 before the fold. Settled dark heading is rgb(32,27,32). Document width equals viewport at 320, 390 and 1440. CTA settles at the selected work (section top16), and trail is a direct body child. Mobile catalogue has three loaded distinct covers; desktop ink stays outside cards and below artwork/copy. No remote form delivery.
- Fixes: narrow reveals use vertical motion when lateral room is absent; essential links/cards are never hidden by either CSS or GSAP. Ink routing uses the actual adjacent section and explicit full grid, not the later biography or first card wrapper. Non-anchor CTA destinations keep native navigation.
- Rollback: revert the T3 home/catalogue/hero/data-contract/CSS/controller/test/doc files together to T2; preserve the gallery/disclosure foundation and unrelated tooling.
- Authored implementation/tests/docs: 639 additions + deletions. One coherent presentation/motion unit; recommend publication size exception rather than splitting tests from the behavior or removing required checks.
- RDD: disabled/unmanaged. Work-unit commit: `06e68846cc18b15dc6ddf932dde5e26a9cb33dd6` — `feat(presentation): put credited artwork before biography`; local end-boundary branch `codex/portfolio-03-presentation` created. No push/PR.

## T4 evidence

- Route: delegated direct; contact component, import-safe injectable controller, runtime/rendering tests and scoped docs are one behavior unit.
- RED: missing controller/rendering semantics yielded 33 tests, 31 pass / 2 fail; old disposer regression yielded 46 tests, 45 pass / 1 fail before its idempotence guard.
- GREEN/refactor: parent `pnpm test` passed 46 / 46, exit 0, rebuilding default-demo output. Worker and parent local live-fixture build checked 31 files, zero diagnostics, six pages, exit 0; separate sitemap warning stays T5. Diff check passed.
- Runtime: fourteen actual-controller scenarios use injected transport and native EventTarget/Response/FormData, proving demo/invalid/missing-action no-send, payload/signal, pending lock, success, HTTP/network errors with retained input and retry, abort/noncooperative late-result guards, navigation return and idempotent disposal/reinitialization. No external POST occurs.
- Native fallback: parent temporarily changed only contact mode/endpoint to a synthetic Formspree URL, built production HTML and asserted explicit action, POST, data-astro-reload, enabled required/email fields and polite status. Exact original config was restored in finally, then default-demo tests rebuilt output. This proves markup, not provider ownership or delivery.
- Browser: mobile native navigation to contact shows explicit demo disclosure, no action, disabled visible fields, empty polite status, documentWidth=viewportWidth=390; no console errors/warnings observed. No real send was attempted.
- Rollback: revert src/scripts/contact-form.ts, src/components/ContactForm.astro, tests/contact-form.test.mjs, tests/content-rendering.test.mjs and the contact doc changes together to T3, preserving unrelated tooling/tracking.
- Authored implementation/tests/docs: 518 additions + deletions; keep transport/lifecycle tests with their controller and recommend publication size exception instead of an artificial split.
- RDD: disabled/unmanaged. Work-unit commit/end-boundary branch: pending creation; no push/PR.
