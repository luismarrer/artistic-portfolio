import { gsap } from "gsap"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(MotionPathPlugin, ScrollToPlugin, ScrollTrigger)

const SVG_NS = "http://www.w3.org/2000/svg"

let motionCtx: gsap.Context | undefined
let listeners: AbortController | undefined
let motionFrame: number | undefined
let motionGeneration = 0

const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

function prepDraw(path: SVGPathElement) {
    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    return length
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function smoothstep(t: number) {
    const x = clamp(t, 0, 1)
    return x * x * (3 - 2 * x)
}

/**
 * Catmull-Rom style spline through `points`, emitted as cubic Béziers. The
 * tangent at each point is capped to the shorter neighbouring chord so a long
 * sweep followed by a short hop does not overshoot into nearby content.
 */
function toSmoothPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return ""
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    const tangent = (i: number) => {
        const prev = points[i - 1] ?? points[i]
        const curr = points[i]
        const next = points[i + 1] ?? points[i]
        const dx = next.x - prev.x
        const dy = next.y - prev.y
        const len = Math.hypot(dx, dy) || 1
        const before = Math.hypot(curr.x - prev.x, curr.y - prev.y)
        const after = Math.hypot(next.x - curr.x, next.y - curr.y)
        // Damp the tangent on sharp turns so the curve does not swing outward.
        const cos =
            before && after
                ? ((curr.x - prev.x) * (next.x - curr.x) +
                      (curr.y - prev.y) * (next.y - curr.y)) /
                  (before * after)
                : 1
        const turn = 0.55 + 0.45 * clamp(cos, -1, 1)
        const reach = Math.min(before || after, after || before) * turn
        return { x: (dx / len) * reach, y: (dy / len) * reach }
    }

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]
        const t1 = tangent(i)
        const t2 = tangent(i + 1)
        const cp1x = p1.x + t1.x / 3
        const cp1y = p1.y + t1.y / 3
        const cp2x = p2.x - t2.x / 3
        const cp2y = p2.y - t2.y / 3
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
}

// ─── Ink trail: route ───────────────────────────────────────────────────────
//
// The trail is a page-long SVG path that a pen draws while the visitor scrolls.
// Its route is computed from the *layout* boxes of real elements (transforms
// from pending reveal animations are ignored) so it can hug free space: the
// outer margins, the gap between columns, and the padding bands between
// sections. It never runs through text or over controls; it goes around them.

interface Box {
    left: number
    right: number
    top: number
    bottom: number
    width: number
    height: number
    cx: number
    cy: number
}

interface Anchor {
    x: number
    y: number
    /** Leave a couple of ink drops where the pen pauses or turns. */
    blot?: boolean
}

interface TrailLayout {
    width: number
    height: number
    vw: number
    vh: number
    gutter: number
    mobile: boolean
}

const EDGE_MIN = 9

function makeBox(left: number, top: number, width: number, height: number): Box {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        cx: left + width / 2,
        cy: top + height / 2,
    }
}

/**
 * Page-space box of an element based on layout (offsetLeft/offsetTop), so
 * elements parked in their pre-reveal state (translated, rotated, hidden) are
 * still measured where they will finally sit. SVG roots are measured through
 * their HTML wrapper.
 */
function layoutBox(el: Element | null | undefined): Box | null {
    if (!el) return null
    const node = el instanceof HTMLElement ? el : el.parentElement
    if (!node) return null
    const width = node.offsetWidth
    const height = node.offsetHeight
    if (!width && !height) return null
    let x = 0
    let y = 0
    let cur: HTMLElement | null = node
    while (cur) {
        x += cur.offsetLeft
        y += cur.offsetTop
        const parent = cur.offsetParent as HTMLElement | null
        if (parent) {
            x += parent.clientLeft
            y += parent.clientTop
        }
        cur = parent
    }
    return makeBox(x, y, width, height)
}

function layoutBoxOf(selector: string, root: ParentNode = document) {
    return layoutBox(root.querySelector(selector))
}

/** Width of the rendered text inside `el` (centered headings leave free sides). */
function textWidth(el: Element | null | undefined) {
    if (!el) return 0
    const range = document.createRange()
    range.selectNodeContents(el)
    return range.getBoundingClientRect().width
}

/** x of a lane running in the free margin left of `contentLeft`. */
function laneLeft(contentLeft: number) {
    return contentLeft - clamp(contentLeft * 0.5, EDGE_MIN, 110)
}

/** x of a lane running in the free margin right of `contentRight`. */
function laneRight(contentRight: number, width: number) {
    return contentRight + clamp((width - contentRight) * 0.5, EDGE_MIN, 110)
}

function buildTrailRoute(L: TrailLayout): Anchor[] {
    const pts: Anchor[] = []
    const add = (x: number, y: number, blot = false) => {
        pts.push({
            x: clamp(x, EDGE_MIN, L.width - EDGE_MIN),
            y: clamp(y, 12, L.height - 12),
            blot,
        })
    }
    /** Straight run down a lane with a faint hand wobble kept inside `room`. */
    const run = (x: number, fromY: number, toY: number, room = 0) => {
        if (toY - fromY < 40) {
            add(x, toY)
            return
        }
        const wobble = Math.min(room * 0.3, 14)
        add(x, fromY)
        add(x + wobble, fromY + (toY - fromY) * 0.5)
        add(x, toY)
    }
    /** How far a turn may lean into the content side of the current lane. */
    const inward = (room: number, want = 14) => Math.min(want, Math.max(0, room * 0.5))
    /**
     * Leave the current lane just below the content it was running beside,
     * leaning a little inward so the turn does not swing past the page edge.
     */
    const leadOut = (bandTop: number) => {
        const last = pts[pts.length - 1]
        if (!last || last.y >= bandTop) return
        const dir = side === "right" ? -1 : 1
        add(last.x + dir * inward(laneRoom), bandTop + 14)
    }
    /**
     * Cross from the right margin to the left one inside a free band and land
     * at (`landX`, `landY`); `landRoom` is the free width beside the new lane.
     */
    const crossToLeft = (
        bandTop: number,
        bandBottom: number,
        landX: number,
        landY: number,
        landRoom: number,
    ) => {
        const y = (bandTop + Math.max(bandBottom, bandTop + 40)) / 2
        leadOut(bandTop)
        add(L.width * 0.66, y - 8)
        add(L.width * 0.3, y + 6, true)
        add(landX + inward(landRoom), landY)
        side = "left"
        laneRoom = landRoom
    }

    let side: "left" | "right" = "left"
    // Free width between the current lane and the content beside it.
    let laneRoom = L.gutter
    // Bottom of the last content block the trail passed; the padding band
    // between it and the next block's text is free to cross.
    let contentBottom = 0
    let started = false

    const mainEl = document.querySelector<HTMLElement>("main")
    const blocks = mainEl ? Array.from(mainEl.children) : []
    const footerEl = blocks.find((el): el is HTMLElement => el.tagName === "FOOTER")

    /** Opening stroke for pages without a hero: start in the left margin. */
    const startInMargin = (contentLeft: number, top: number) => {
        const lx = laneLeft(contentLeft)
        const startY = Math.max(top + 24, 96)
        add(lx, startY)
        add(lx + inward(contentLeft - lx, 6), startY + 60)
        contentBottom = startY + 60
        started = true
        side = "left"
        laneRoom = contentLeft - lx
    }

    // ── Hero: leave the signature where the pen lifted, skirt the CTA and
    //    underline it, then glide down to the left margin.
    const heroSegment = (heroEl: HTMLElement, hero: Box) => {
        const sig = layoutBoxOf(".js-signature[data-variant='hero']")
        const cta = layoutBoxOf("#start")
        if (sig) add(sig.left + sig.width * 0.25, sig.top + sig.height * 0.81)
        else add(hero.cx - 40, hero.top + hero.height * 0.45)

        if (cta) {
            add(cta.left - 30, cta.top + cta.height * 0.15)
            add(cta.left - 18, cta.bottom + 4)
            add(cta.left + cta.width * 0.3, cta.bottom + 17)
            add(cta.right + 4, cta.bottom + 9, true)
            add(cta.right + 34, cta.bottom + 34)
        }

        const glideFrom = cta ? cta.bottom + 34 : hero.cy
        // Follow the actual next section: the work-first home no longer leads into About.
        const nextBlock = blocks.slice(blocks.indexOf(heroEl) + 1).find((el) =>
            el instanceof HTMLElement && el !== footerEl && el.offsetHeight > 0,
        )
        const nextContent = nextBlock instanceof HTMLElement
            ? layoutBox(nextBlock.querySelector("[data-trail-content]") ?? nextBlock)
            : null
        const nextContentLeft = nextContent && nextContent.left > 1 ? nextContent.left : L.gutter
        const nextLeft = laneLeft(nextContentLeft)
        add(hero.cx + L.width * 0.05, glideFrom + (hero.bottom - glideFrom) * 0.5, true)
        add(nextLeft + inward(nextContentLeft - nextLeft, 10), hero.bottom - 20)
        contentBottom = hero.bottom
        started = true
        side = "left"
        laneRoom = nextContentLeft - nextLeft
    }

    // ── About: beside the portrait, then either through the gap between the
    //    two columns (wide layouts) or down the margin beside the bio.
    const aboutSegment = (el: HTMLElement, about: Box) => {
        const article = layoutBox(el.querySelector("article")) ?? about
        const img = layoutBox(el.querySelector("img"))
        const bio = layoutBox(el.querySelector("[data-reveal='right']"))
        const stats = layoutBox(el.querySelector("[data-stats]")) ?? bio
        const columns = !!(img && bio && img.right < bio.left)
        const corridor = columns && img && bio ? bio.left - img.right : 0
        const contentLeft = article.left > 1 ? article.left : L.gutter

        const marginX = laneLeft(contentLeft)
        if (!started) startInMargin(contentLeft, about.top)
        if (side === "right") {
            crossToLeft(contentBottom, about.top + 40, marginX, about.top + 30, contentLeft - marginX)
        } else {
            add(marginX, about.top + 30)
        }
        laneRoom = contentLeft - marginX

        if (img) {
            const lx = laneLeft(img.left)
            // Stay in the margin until the centred intro text is behind us.
            if (lx > marginX + 8) add(marginX, img.top - 16)
            add(lx, img.top + img.height * 0.18)
            add(lx - 4, img.top + img.height * 0.78)
            const rowBottom = Math.max(stats?.bottom ?? 0, img.bottom + 60)

            if (columns && bio && corridor >= 64) {
                // Clear the portrait's corner (it sits slightly rotated), duck
                // under it, then either drop into the gap between the columns
                // or head straight for the next section.
                const gapX = (img.right + bio.left) / 2
                add(lx + 6, img.bottom + 38)
                add(img.cx - img.width * 0.12, img.bottom + 44)
                if (rowBottom - img.bottom > 150) {
                    add(gapX, img.bottom + 44 + Math.min(120, (rowBottom - img.bottom) * 0.45))
                    add(gapX, rowBottom - 14)
                } else {
                    add(gapX - corridor * 0.2, rowBottom + 10)
                }
                laneRoom = corridor / 2
            } else if (columns) {
                add(lx, img.bottom + 30)
                add(marginX, rowBottom - 16)
            } else if (bio) {
                // Stacked layout: the bio spans the full width, so stay in the margin.
                const bx = laneLeft(bio.left)
                run(bx, bio.top + 24, rowBottom - 16, bio.left - bx)
                laneRoom = bio.left - bx
            }
            contentBottom = rowBottom
        } else {
            contentBottom = article.bottom
        }
        side = "left"
    }

    // ── Portfolio grid: cross the padding band, pass right of the centered
    //    heading, then follow the right margin, dipping toward each artwork.
    const projectsSegment = (el: HTMLElement, projects: Box) => {
        const h2El = el.querySelector("h2")
        const h2 = layoutBox(h2El)
        const cards = Array.from(el.querySelectorAll<HTMLElement>(".project-card"))
        const cardBoxes = cards.map((card) => layoutBox(card))
        const grid = layoutBox(el.querySelector("[data-trail-content]"))
            ?? layoutBox(cards[0]?.parentElement) ?? projects
        const rx = laneRight(grid.right, L.width)

        if (!started) startInMargin(grid.left > 1 ? grid.left : L.gutter, projects.top)

        const bandTop = Math.max(contentBottom, projects.top - 120)
        const bandBottom = h2 ? h2.top : grid.top
        // The catalogue heading lives in the preceding intro; only cross its real padding gap.
        const sweepY = bandTop + Math.max(0, bandBottom - bandTop) / 2
        const rightRoom = L.width - rx
        if (side === "left") {
            const fromX = pts[pts.length - 1]?.x ?? 0
            leadOut(bandTop)
            add(Math.max(L.width * 0.42, fromX + 60), sweepY - 6, true)
            add(L.width * 0.72, sweepY + 4)
        } else {
            add(rx, sweepY)
        }
        if (h2) {
            const halfText = textWidth(h2El) / 2
            const rightOfTitle = Math.max(rx, h2.cx + halfText + 40)
            // Land a touch inside the lane so the turn downward stays on-page.
            add(Math.min(rightOfTitle, L.width - EDGE_MIN) - inward(rightRoom, 12), h2.top + h2.height * 0.35)
        } else {
            // Reach the outside lane before any image begins, not diagonally through the first row.
            add(rx, Math.max(sweepY, grid.top - 8))
        }

        let lastY = h2 ? h2.bottom : sweepY
        cardBoxes.forEach((card, index) => {
            if (!card) return
            // Only the cards touching the right edge of the grid are beside the lane.
            if (card.right < grid.right - 8) return
            const artEl = cards[index].querySelector(".project-artwork")
            const art = layoutBox(artEl)
            // The artwork is centred inside its box; when that box spans the
            // whole card (text below, not beside), the space next to the
            // drawing is free and the trail can lean toward it.
            const drawing = artEl?.querySelector("svg, img")
            const drawingWidth = drawing
                ? Math.min(drawing.getBoundingClientRect().width, art?.width ?? 0)
                : (art?.width ?? 0)
            const artRight = art ? art.cx + drawingWidth / 2 : rx
            const room = rx - artRight
            const stacked = !!art && art.width >= card.width * 0.8
            if (art && stacked && room >= 44 && art.cy > lastY + 40) {
                add(artRight + room * 0.5, art.cy)
                // Back in the lane before the card's text begins.
                add(rx, art.bottom + 12)
            } else {
                add(rx, card.top + card.height * 0.3)
            }
            add(rx, card.bottom - 20)
            lastY = card.bottom
        })

        contentBottom = grid.bottom
        started = true
        side = "right"
        laneRoom = rx - grid.right
    }

    // ── Contact: a quiet margin line beside the form.
    const contactSegment = (el: HTMLElement, contact: Box) => {
        const h1 = layoutBox(el.querySelector("h1, h2"))
        const form = layoutBox(el.querySelector("form"))
        const ref = form ?? contact
        const contentLeft = ref.left > 1 ? ref.left : L.gutter
        const lx = laneLeft(contentLeft)
        if (!started) startInMargin(contentLeft, contact.top)
        if (side === "right") {
            crossToLeft(contentBottom, h1 ? h1.top : contact.top + 40, lx, (h1 ?? ref).top - 10, contentLeft - lx)
        }
        if (h1) add(lx, h1.cy)
        if (form) run(lx, form.top + 20, form.bottom - 20, contentLeft - lx)
        contentBottom = ref.bottom
        side = "left"
        laneRoom = contentLeft - lx
    }

    // ── Any other section (intros, galleries): keep to the left margin.
    const genericSegment = (el: HTMLElement, box: Box) => {
        if (box.height < 80) return
        const inner = layoutBox(el.querySelector(".grid, figure, svg, img")) ?? box
        const contentLeft = Math.max(inner.left, box.left + L.gutter)
        const lx = laneLeft(contentLeft)
        const runTop = Math.max(inner.top + 20, contentBottom + 40)
        if (!started) startInMargin(contentLeft, box.top)
        if (side === "right") {
            const heading = layoutBox(el.querySelector("h1, h2, h3"))
            crossToLeft(contentBottom, heading ? heading.top : inner.top, lx, runTop - 30, contentLeft - lx)
        }
        run(lx, runTop, inner.bottom - 20, contentLeft - lx)
        contentBottom = inner.bottom
        side = "left"
        laneRoom = contentLeft - lx
    }

    // ── Footer: come down the left margin and flow into the footer signature.
    const footerSegment = (el: HTMLElement, footer: Box) => {
        const heading = layoutBox(el.querySelector("h3"))
        const textLeft = heading ? heading.left : footer.left + L.gutter
        const lx = laneLeft(textLeft)
        const sigEl = el.querySelector(".js-signature")
        const sig = layoutBox(sigEl)
        const sigSection = layoutBox(sigEl?.closest("section"))

        const room = textLeft - lx
        if (!started) startInMargin(textLeft, footer.top)
        if (side === "right") {
            crossToLeft(contentBottom, heading ? heading.top : footer.top + 40, lx, footer.top + 28, room)
        } else {
            add(lx, footer.top + 28)
        }

        if (sig && sigSection) {
            add(lx + inward(room, 10), sigSection.top + 8)
            add(sig.left - sig.width * 0.32, sig.top + sig.height * 0.66)
            add(sig.left + sig.width * 0.04, sig.top + sig.height * 0.59)
        } else {
            add(lx, footer.bottom - 60)
            add(lx + 30, footer.bottom - 30)
        }
    }

    for (const el of blocks) {
        if (!(el instanceof HTMLElement) || el === footerEl) continue
        const box = layoutBox(el)
        if (!box) continue
        if (el.matches("[data-hero]")) heroSegment(el, box)
        else if (el.id === "about") aboutSegment(el, box)
        else if (el.id === "projects") projectsSegment(el, box)
        else if (el.id === "contact") contactSegment(el, box)
        else genericSegment(el, box)
    }

    const footer = layoutBox(footerEl)
    if (footerEl && footer) {
        footerSegment(footerEl, footer)
    } else if (pts.length > 0) {
        const last = pts[pts.length - 1]
        add(last.x, L.height - 40)
    }

    if (pts.length < 3) {
        const lx = laneLeft(L.gutter)
        pts.length = 0
        add(lx, 96)
        add(lx + 8, L.height * 0.5)
        add(lx, L.height - 40)
    }

    return pts
}

// ─── Intro: one written moment ──────────────────────────────────────────────
//
// The page-load intro is the only orchestrated motion, and it is over by about
// 1.2 s: the headline is written word by word, and the signature starts as its
// last words land (the pen and a clip wipe write it together, then the pen
// underlines it and lifts). Nothing flies, spins or loops. The one exception is
// the arrow under the hero, which keeps its production animation outside this
// budget (see PINNED_SCROLL_HINT). Every time below is in seconds.

/** Headline words are revealed left to right by a clip wipe, in reading order. */
const WORD_WIPE = {
    // Negative insets keep Mansalva's overhangs and descenders unclipped at rest.
    hidden: "inset(-30% 110% -45% -12%)",
    shown: "inset(-30% -12% -45% -12%)",
    delay: 0.05,
    duration: 0.38,
    stagger: 0.08,
    /** A long headline tightens its stagger so it is still written by this time. */
    end: 0.8,
}

/**
 * The hero signature joins the headline while its last words are being written;
 * the footer one plays on arrival, with the same character, a little slower.
 */
const SIGNATURE_TIMING = {
    hero: { start: 0.4, write: 0.5, underline: 0.22, lift: 0.12 },
    footer: { start: 0.05, write: 0.7, underline: 0.3, lift: 0.15 },
}
/** The pen starts lifting this long before the underline ends, as the stroke closes. */
const PEN_LIFT_OVERLAP = 0.05

/**
 * The arrow under the hero: it enters, then bounces without end, as on the production site. The
 * owner pinned these exact values (see AGENTS.md), so they must not be tuned.
 */
const PINNED_SCROLL_HINT = {
    enter: {
        from: { autoAlpha: 0, y: -6 },
        to: { autoAlpha: 1, y: 0, duration: 0.6, delay: 1.4 },
    },
    bounce: { y: 8, duration: 1.1, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.8 },
}

/** Secondary reveals and cards settle from at most this many pixels below: a hint, not an entrance. */
const REVEAL_RISE = 12

const WRITING_EASE = "power1.inOut"

function initSignatures() {
    const signatures = document.querySelectorAll<SVGSVGElement>(".js-signature")

    signatures.forEach((svg) => {
        const paths = Array.from(
            svg.querySelectorAll<SVGPathElement>("[data-draw]"),
        )
        const writePath = svg.querySelector<SVGPathElement>(
            ".signature-write-path",
        )
        const clipRect = svg.querySelector<SVGRectElement>(".signature-clip")
        const pen = svg.querySelector<SVGGElement>(".signature-pen")
        const word = svg.querySelector<SVGTextElement>(".signature-word")
        if (paths.length === 0 && !clipRect) return

        const variant = svg.dataset.variant
        const { start, write, underline, lift } =
            SIGNATURE_TIMING[variant === "hero" ? "hero" : "footer"]

        paths.forEach((path) => {
            prepDraw(path)
            gsap.set(path, { autoAlpha: 1 })
        })
        // The pen is a prop: hidden until it writes, and the last tween below always lifts it.
        if (pen) gsap.set(pen, { autoAlpha: 0 })
        // Close the clip before the word is shown, so the finished word can never flash. Only when
        // the timeline below will open it again: a clip nothing wipes open must stay as authored.
        if (clipRect && writePath) gsap.set(clipRect, { attr: { width: 0 } })
        if (word) gsap.set(word, { autoAlpha: 1 })

        const timeline = gsap.timeline({
            paused: true,
            defaults: { ease: WRITING_EASE },
        })
        const follow = (path: SVGPathElement) => ({
            path,
            align: path,
            alignOrigin: [0.5, 0.12],
            autoRotate: 90,
        })

        // Absolute times, so the whole schedule can be read (and budgeted) at a glance.
        let cursor = start
        if (pen) timeline.set(pen, { autoAlpha: 1 }, cursor)

        // The pen writes the word along its path while the clip opens in step with it.
        if (clipRect && writePath) {
            if (pen) {
                timeline.to(
                    pen,
                    { motionPath: follow(writePath), duration: write, ease: WRITING_EASE },
                    cursor,
                )
            }
            timeline.to(
                clipRect,
                { attr: { width: 560 }, duration: write, ease: WRITING_EASE },
                cursor,
            )
            cursor += write
        }

        // A non-verbal hero path replaces both word-writing and underline phases, so it keeps their full rhythm.
        const drawDuration = variant === "hero" && !clipRect && !writePath && !word
            ? write + underline
            : underline
        const stroke = drawDuration / Math.max(1, paths.length)
        paths.forEach((path) => {
            if (pen) {
                timeline.to(
                    pen,
                    { motionPath: follow(path), duration: stroke, ease: WRITING_EASE },
                    cursor,
                )
            }
            timeline.to(
                path,
                { strokeDashoffset: 0, duration: stroke, ease: WRITING_EASE },
                cursor,
            )
            cursor += stroke
        })

        if (pen) {
            timeline.to(
                pen,
                { autoAlpha: 0, duration: lift },
                Math.max(start, cursor - PEN_LIFT_OVERLAP),
            )
        }

        const play = () => {
            if (timeline.progress() === 0 && !timeline.isActive()) {
                timeline.play(0)
            }
        }
        ScrollTrigger.create({
            trigger: svg,
            start: variant === "hero" ? "top 95%" : "top 99%",
            once: true,
            onEnter: play,
        })
        if (svg.getBoundingClientRect().top < window.innerHeight * 0.99) {
            play()
        }
    })
}

// ─── Ink trail: drawing ─────────────────────────────────────────────────────
//
// Scroll is mapped to *page depth*, not to path length: at any scroll position
// the pen tip sits where the reader is looking (a little below the middle of
// the viewport, drifting toward the bottom near the end of the page). Long
// horizontal flourishes therefore never make the pen lag behind or race ahead
// of the visible area.

/** A blot's radius as a multiple of the stroke width: a pool just wider than the line. */
const BLOT_RADIUS = 1.1
/** Opacity of a revealed blot, close to the stroke's own so it reads as the same ink. */
const BLOT_OPACITY = 0.7

interface InkTrail {
    timeline: gsap.core.Timeline
    trigger: ScrollTrigger
    glide: ReturnType<typeof gsap.quickTo>
    proxy: { p: number }
    progressFor: (scroll: number) => number
    key: string
}

let inkTrail: InkTrail | undefined
let trailTimer: number | undefined
let trailObserver: ResizeObserver | undefined

/**
 * Builds a monotonic lookup from page depth (y) to the path length at which
 * the pen first reaches that depth, plus the length at which the pen is nearest
 * to a given point of the page (used to time ink that sits on the stroke).
 */
function buildDepthLookup(path: SVGPathElement, length: number) {
    const n = Math.max(2, Math.ceil(length / 6))
    const lens = new Float32Array(n + 1)
    const depth = new Float32Array(n + 1)
    const xs = new Float32Array(n + 1)
    const ys = new Float32Array(n + 1)
    let maxY = -Infinity
    for (let i = 0; i <= n; i++) {
        const l = (i / n) * length
        const pt = path.getPointAtLength(l)
        if (pt.y > maxY) maxY = pt.y
        lens[i] = l
        depth[i] = maxY
        xs[i] = pt.x
        ys[i] = pt.y
    }
    const startY = depth[0]
    const endY = depth[n]
    const lengthAt = (y: number) => {
        if (y <= startY) return 0
        if (y >= endY) return length
        let lo = 0
        let hi = n
        while (lo < hi) {
            const mid = (lo + hi) >> 1
            if (depth[mid] < y) lo = mid + 1
            else hi = mid
        }
        const i0 = Math.max(0, lo - 1)
        const y0 = depth[i0]
        const y1 = depth[lo]
        const t = y1 > y0 ? (y - y0) / (y1 - y0) : 1
        return lens[i0] + (lens[lo] - lens[i0]) * t
    }
    const lengthNear = (x: number, y: number) => {
        let nearest = 0
        let best = Infinity
        for (let i = 0; i <= n; i++) {
            const distance = (xs[i] - x) ** 2 + (ys[i] - y) ** 2
            if (distance < best) {
                best = distance
                nearest = i
            }
        }
        return lens[nearest]
    }
    return { startY, endY, lengthAt, lengthNear }
}

function killInkTrail() {
    if (!inkTrail) return
    inkTrail.glide.tween.kill()
    inkTrail.trigger.kill()
    inkTrail.timeline.kill()
    inkTrail = undefined
}

/** Resolved `--page-gutter`, read from an element that uses it as padding. */
function resolveGutter(vw: number) {
    const probe = document.querySelector<HTMLElement>(
        "[data-hero], #about, #contact, .page-intro, footer > div",
    )
    if (probe) {
        const pad = parseFloat(getComputedStyle(probe).paddingLeft)
        if (Number.isFinite(pad) && pad > 0) return pad
    }
    return clamp(vw * 0.04, 20, 48)
}

/**
 * Fingerprint of the layout the trail was built for. Uses the body's own
 * height so the page-long overlay cannot mask a document that grew or shrank.
 */
function layoutKey() {
    return `${document.documentElement.clientWidth}x${document.body.offsetHeight}x${window.innerHeight}`
}

function trailLayout(): TrailLayout {
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    return {
        width: vw,
        vw,
        vh,
        gutter: resolveGutter(vw),
        mobile: vw < 640,
        height: Math.max(
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
        ),
    }
}

function initInkTrail() {
    const root = document.querySelector<HTMLElement>("#ink-trail")
    const svg = root?.querySelector<SVGSVGElement>("svg")
    const path = root?.querySelector<SVGPathElement>("#ink-path")
    const pathShadow = root?.querySelector<SVGPathElement>("#ink-path-shadow")
    const pen = root?.querySelector<SVGGElement>("#ink-pen")
    const splatters = root?.querySelector<SVGGElement>("#ink-splatters")
    if (!root || !svg || !path || !pen || !splatters) return

    // Drop any previous explicit height before measuring so a stale value
    // cannot keep the document artificially tall after a resize.
    root.style.height = ""

    const L = trailLayout()
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const key = layoutKey()
    if (inkTrail && inkTrail.key === key) {
        root.style.height = `${L.height}px`
        return
    }
    killInkTrail()

    if (maxScroll < 64) {
        gsap.set(root, { autoAlpha: 0 })
        return
    }
    gsap.set(root, { autoAlpha: 1 })

    // Size the overlay explicitly so the viewBox maps 1:1 to page pixels even
    // if the containing block ever falls back to the viewport.
    root.style.height = `${L.height}px`
    svg.setAttribute("width", `${L.width}`)
    svg.setAttribute("height", `${L.height}`)
    svg.setAttribute("viewBox", `0 0 ${L.width} ${L.height}`)

    const anchors = buildTrailRoute(L)
    const d = toSmoothPath(anchors)
    path.setAttribute("d", d)
    if (pathShadow) pathShadow.setAttribute("d", d)

    const length = path.getTotalLength()
    if (!length) return

    prepDraw(path)
    if (pathShadow) prepDraw(pathShadow)

    const { startY, endY, lengthAt, lengthNear } = buildDepthLookup(path, length)

    const stroke = L.mobile ? 1.7 : L.vw < 1024 ? 2.1 : 2.6
    path.setAttribute("stroke-width", `${stroke}`)
    if (pathShadow) pathShadow.setAttribute("stroke-width", `${stroke + 2.4}`)

    // One ink pool where the pen pauses or turns, revealed as it passes by. The
    // route runs exactly through its anchors (they are the end points of the
    // spline's segments), so a blot centred on an anchor sits on the stroke
    // instead of floating beside it.
    splatters.replaceChildren()
    const blots: { circle: SVGCircleElement; at: number }[] = []
    anchors.forEach((anchor) => {
        if (!anchor.blot) return
        const circle = document.createElementNS(SVG_NS, "circle")
        // Rounded like the path data, so the centre is the path's own vertex.
        circle.setAttribute("cx", anchor.x.toFixed(1))
        circle.setAttribute("cy", anchor.y.toFixed(1))
        circle.setAttribute("r", `${(stroke * BLOT_RADIUS).toFixed(2)}`)
        circle.style.fill = "var(--color-accent)"
        circle.setAttribute("opacity", "0")
        splatters.appendChild(circle)
        blots.push({ circle, at: clamp(lengthNear(anchor.x, anchor.y) / length, 0, 0.98) })
    })

    const penScale = L.mobile ? 1.25 : L.vw < 1024 ? 1.45 : 1.65
    gsap.set(pen, { autoAlpha: 0, scale: penScale, transformOrigin: "50% 18%" })

    // The timeline is linear in path length; scroll drives its progress
    // through the depth lookup below.
    const timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } })
    if (pathShadow) timeline.to(pathShadow, { strokeDashoffset: 0, duration: 1 }, 0)
    timeline.to(path, { strokeDashoffset: 0, duration: 1 }, 0)
    timeline.to(
        pen,
        {
            motionPath: {
                path,
                align: path,
                alignOrigin: [0.5, 0.18],
                autoRotate: 90,
            },
            duration: 1,
        },
        0,
    )
    // The pen shows up as soon as it starts moving and lifts once it has
    // handed the stroke over to the footer signature.
    timeline.fromTo(pen, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.012 }, 0.0005)
    timeline.to(pen, { autoAlpha: 0, duration: 0.015 }, 0.985)
    blots.forEach(({ circle, at }) => {
        timeline.to(circle, { opacity: BLOT_OPACITY, duration: 0.02 }, at)
    })

    const progressFor = (scroll: number) => {
        const p = clamp(scroll / maxScroll, 0, 1)
        // Pen tip a little below mid-viewport, drifting to the bottom edge so
        // the very end of the page is reached before scrolling stops.
        const lead = L.vh * (0.55 + 0.45 * p * p)
        // Nothing is drawn until the reader actually starts scrolling.
        const ramp = smoothstep(scroll / Math.max(120, L.vh * 0.22))
        const depth = clamp(startY + (scroll + lead - startY) * ramp, startY, endY)
        return lengthAt(depth) / length
    }

    const proxy = { p: 0 }
    const apply = () => timeline.progress(proxy.p)
    const glide = gsap.quickTo(proxy, "p", {
        duration: 0.6,
        ease: "power2.out",
        onUpdate: apply,
    })
    const snapTo = (scroll: number) => {
        glide.tween.pause()
        proxy.p = progressFor(scroll)
        apply()
    }

    const trigger = ScrollTrigger.create({
        id: "ink-trail",
        trigger: document.documentElement,
        start: 0,
        end: "max",
        onUpdate: (self) => glide(progressFor(self.scroll())),
        onRefresh: (self) => snapTo(self.scroll()),
    })
    snapTo(window.scrollY)

    inkTrail = { timeline, trigger, glide, proxy, progressFor, key }
}

/** Rebuild the trail once layout settles (resize, fonts, images, view swaps). */
function scheduleTrailRebuild(delay = 160) {
    window.clearTimeout(trailTimer)
    const signal = listeners?.signal
    if (!signal || signal.aborted || prefersReducedMotion()) return
    const generation = motionGeneration
    trailTimer = window.setTimeout(() => {
        if (generation !== motionGeneration || signal.aborted || prefersReducedMotion()) return
        trailTimer = undefined
        initInkTrail()
        ScrollTrigger.refresh()
    }, delay)
}

function watchTrailLayout() {
    trailObserver?.disconnect()
    if (typeof ResizeObserver === "undefined") return
    trailObserver = new ResizeObserver(() => {
        if (inkTrail && inkTrail.key !== layoutKey()) scheduleTrailRebuild()
    })
    trailObserver.observe(document.body)
}

function initReveals() {
    const heroWords = document.querySelectorAll<HTMLElement>(".js-hero-title span")
    if (heroWords.length > 0) {
        const { hidden, shown, delay, duration, end } = WORD_WIPE
        // The words arrive already in place and are written by a clip wipe. Opacity is 1 from the
        // first frame (overriding the .has-motion gate) because the clip is what hides them, and
        // only the clip is cleared afterwards, so a finished headline can never be left hidden.
        const stagger = Math.min(
            WORD_WIPE.stagger,
            (end - delay - duration) / Math.max(1, heroWords.length - 1),
        )
        gsap.fromTo(
            heroWords,
            { autoAlpha: 1, clipPath: hidden },
            {
                autoAlpha: 1,
                clipPath: shown,
                duration,
                stagger,
                delay,
                ease: WRITING_EASE,
                clearProps: "clipPath",
            },
        )
    }

    // The CTA has no entrance: the primary action is simply there. Its only motion answers the pointer.

    // Both tweens are made here, inside the controller's gsap context, so reverting that context on
    // teardown is what stops the endless bounce. They get copies: GSAP writes onto the vars it is given.
    const hint = document.querySelector<HTMLElement>(".js-scroll-hint")
    if (hint) {
        const { enter, bounce } = PINNED_SCROLL_HINT
        gsap.fromTo(hint, { ...enter.from }, { ...enter.to })
        gsap.to(hint, { ...bounce })
    }

    // Secondary reveals are short fades with a small rise: no lateral entrance, no tilt.
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        if (el.dataset.reveal === "card" || el.matches("a, button, input, select, textarea")
            || el.querySelector("a, button, input, select, textarea")) return

        gsap.fromTo(
            el,
            { x: 0, y: REVEAL_RISE, rotate: 0, autoAlpha: 0 },
            {
                x: 0,
                y: 0,
                rotate: 0,
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 90%",
                    toggleActions: "play none none none",
                },
            },
        )
    })

    // Cards hold links and artwork, so they are never hidden: they only settle a few pixels.
    const cards = gsap.utils.toArray<HTMLElement>("[data-reveal='card']")
    if (cards.length > 0) {
        gsap.set(cards, { y: REVEAL_RISE })
        ScrollTrigger.batch(cards, {
            start: "top 90%",
            onEnter: (batch) => {
                gsap.to(batch, {
                    y: 0,
                    duration: 0.5,
                    stagger: 0.06,
                    ease: "power2.out",
                    overwrite: true,
                })
            },
        })
    }

    gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count)
        if (Number.isNaN(end)) return
        const suffix = el.dataset.countSuffix ?? ""
        const counter = { val: 0 }
        gsap.to(counter, {
            val: end,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                once: true,
            },
            onUpdate: () => {
                el.textContent = `${Math.round(counter.val)}${suffix}`
            },
        })
    })
}

/** Motion that answers a person's action: a gentle pull toward the pointer, and a short scroll. */
const MAGNETIC_PULL = 0.12
const CTA_SCROLL_DURATION = 0.9

function initCtaAndHover(signal: AbortSignal) {
    const cta = document.querySelector<HTMLAnchorElement>("#start")
    if (cta) {
        cta.addEventListener(
            "click",
            (event) => {
                const href = cta.getAttribute("href")
                if (!href?.startsWith("#")) return
                const target = document.getElementById(href.slice(1))
                if (!target) return
                event.preventDefault()
                event.stopPropagation()
                // Focus never waits for the scroll: the next Tab starts inside the destination, as it
                // does after a native anchor jump. A target that cannot take focus yet is made a
                // programmatic one (tabindex="-1" keeps it out of the Tab order).
                if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1")
                target.focus({ preventScroll: true })
                const y =
                    target.getBoundingClientRect().top + window.scrollY - 16
                gsap.to(window, {
                    duration: CTA_SCROLL_DURATION,
                    scrollTo: { y, autoKill: true },
                    ease: "power2.inOut",
                    overwrite: "auto",
                })
            },
            { signal },
        )
    }

    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        el.addEventListener(
            "mousemove",
            (event) => {
                const rect = el.getBoundingClientRect()
                const x = event.clientX - rect.left - rect.width / 2
                const y = event.clientY - rect.top - rect.height / 2
                gsap.to(el, {
                    x: x * MAGNETIC_PULL,
                    y: y * MAGNETIC_PULL,
                    duration: 0.28,
                })
            },
            { signal },
        )
        el.addEventListener(
            "mouseleave",
            () => {
                gsap.to(el, {
                    x: 0,
                    y: 0,
                    duration: 0.45,
                    ease: "power3.out",
                })
            },
            { signal },
        )
    })
}

function showStaticFallback() {
    document
        .querySelectorAll<SVGPathElement>(
            ".js-signature [data-draw], #ink-path, #ink-path-shadow",
        )
        .forEach((path) => {
            path.style.strokeDashoffset = "0"
            path.style.strokeDasharray = "none"
        })
    document
        .querySelectorAll<SVGRectElement>(".signature-clip")
        .forEach((rect) => {
            rect.setAttribute("width", "560")
        })
    document
        .querySelectorAll<HTMLElement>(
            "[data-reveal], .js-hero-title span, #start, .js-scroll-hint, .js-signature .signature-word",
        )
        .forEach((el) => {
            el.style.opacity = "1"
            el.style.transform = "none"
        })
    // Pens are motion-only props: static mode never shows them (the stylesheet hides them too).
    const trailPen = document.querySelector<SVGGElement>("#ink-pen")
    if (trailPen) trailPen.style.opacity = "0"
    document
        .querySelectorAll<SVGGElement>(".js-signature .signature-pen")
        .forEach((pen) => {
            pen.style.opacity = "0"
        })
}

function initMotion() {
    listeners?.abort()
    motionCtx?.revert()
    killInkTrail()
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())

    if (prefersReducedMotion()) {
        showStaticFallback()
        return
    }

    document.documentElement.classList.add("has-motion")
    listeners = new AbortController()

    motionCtx = gsap.context(() => {
        initSignatures()
        initReveals()
        initCtaAndHover(listeners!.signal)
    })
    initInkTrail()
    watchTrailLayout()

    ScrollTrigger.refresh()
}

function teardownMotion() {
    motionGeneration += 1
    if (motionFrame !== undefined) cancelAnimationFrame(motionFrame)
    motionFrame = undefined
    window.clearTimeout(trailTimer)
    trailTimer = undefined
    trailObserver?.disconnect()
    trailObserver = undefined
    listeners?.abort()
    listeners = undefined
    motionCtx?.revert()
    motionCtx = undefined
    killInkTrail()
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
}

export function bootArtisticMotion() {
    if (!prefersReducedMotion()) {
        document.documentElement.classList.add("has-motion")
    }

    document.addEventListener("astro:page-load", () => {
        teardownMotion()
        const generation = motionGeneration
        motionFrame = requestAnimationFrame(() => {
            if (generation !== motionGeneration) return
            motionFrame = undefined
            initMotion()
        })
        // Web fonts and late images move things around: re-route the trail
        // once they have settled (no-op when the layout did not change).
        document.fonts?.ready.then(() => {
            if (generation !== motionGeneration) return
            scheduleTrailRebuild(60)
        })
    })

    document.addEventListener("astro:before-swap", teardownMotion)

    window.addEventListener("load", () => scheduleTrailRebuild(60))
    window.addEventListener("resize", () => scheduleTrailRebuild(180))
}
