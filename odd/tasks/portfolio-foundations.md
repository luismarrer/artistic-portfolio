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
- Running authored count: 0 committed lines. Slice boundaries/commit identities will be recorded from actual work units.

## Tasks and acceptance

- [x] **T1 — Centralize and validate content.** Delegated configuration/data/model wiring and focused tests. Identity, language, biography, navigation, social links, public URL and contact configuration use validated typed sources; compatible numeric IDs and media metadata fail before publication when invalid. Observed checks are recorded below; work-unit commit is recorded after creation.
- [ ] **T2 — Give cases their own evidence.** Delegate project gallery/editorial rendering and tests. All three case galleries are distinct; one reference case has at least three relevant credited images with visible captions, grounded context/process/result, honest demo attribution and navigation back/next/contact; no fallback gallery substitution. RED/GREEN, build, runtime scenario, rollback boundary and commit: pending.
- [ ] **T3 — Put work first and improve readability.** Delegate home/portfolio/hero changes and tests. Selected work precedes biography, the homepage is not the full catalogue, dark hero ink is readable, existing motion hooks remain functional, and relevant essential copy/credits do not require hover. RED/GREEN, build, desktop/mobile browser checks, rollback boundary and commit: pending.
- [ ] **T4 — Make contact safe and reliable.** Delegate submission lifecycle/states and controlled tests. Demo mode never sends; live configuration is validated; in-flight duplicates are blocked; success, provider rejection, network failure and retry are accessible; failed input is retained; navigation reinitializes without duplicate listeners; native configured POST remains available without JS. No real delivery. RED/GREEN, build, runtime scenario, rollback boundary and commit: pending.
- [ ] **T5 — Verify publication and document customization.** Delegate metadata/sitemap checks, CI and accurate docs. Six routes, distinct galleries, asset/internal links and publication metadata are checked; sitemap is generated; CI uses the verified Node/pnpm commands; README/CUSTOMIZATION and scoped roadmap status describe implemented behavior without claiming remote execution or release. RED/GREEN, final build/tests/browser checks, rollback boundary and commit: pending.

## Progress and evidence

- Exploration complete: delegated content/quality mapping; existing asset dimensions/credits and demo limitations inspected.
- Baseline `pnpm build`: exit 0, Astro checked 22 files with zero errors/warnings/hints, six static pages; separate warning skipped sitemap because `site` is missing.
- Native test modules available; no existing test runner or CI workflow. Strict TDD comes from inherited instructions, not test presence.
- User delivery choice resolved; source implementation can begin. Tracking document and branch were created before source implementation.
- Engram mirror: topic `odd/portfolio-foundations/tasks`; full document must be read back after every update.

## Next step

Delegate T2 with strict RED/GREEN/refactor evidence using `site`, `projects`, `GalleryImage` and `editorial` from `src/data/`. Preserve the full goal and chosen stacked-to-main delivery.

## Planned local delivery slices

| Slice | Task | Local end-boundary branch | Dependency | Commits / actual lines |
| --- | --- | --- | --- | --- |
| 1 | T1 | `codex/portfolio-01-content` | branch point / main | pending |
| 2 | T2 | `codex/portfolio-02-cases` | slice 1 | pending |
| 3 | T3 | `codex/portfolio-03-presentation` | slice 2 | pending |
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
- Work-unit commit: pending creation.
