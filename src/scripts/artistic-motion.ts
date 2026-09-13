import { gsap } from "gsap"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(MotionPathPlugin, ScrollToPlugin, ScrollTrigger)

const SVG_NS = "http://www.w3.org/2000/svg"

let motionCtx: gsap.Context | undefined
let listeners: AbortController | undefined

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
    const heroSegment = (hero: Box) => {
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
        const nextContent = layoutBoxOf("#about article")
        const nextContentLeft = nextContent && nextContent.left > 1 ? nextContent.left : L.gutter
        const nextLeft = laneLeft(nextContentLeft)
        add(hero.cx + L.width * 0.05, glideFrom + (hero.bottom - glideFrom) * 0.5, true)
        add(nextLeft + 28, hero.bottom - 26)
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
        const grid = layoutBox(cards[0]?.parentElement) ?? projects
        const rx = laneRight(grid.right, L.width)

        if (!started) startInMargin(grid.left > 1 ? grid.left : L.gutter, projects.top)

        const bandTop = Math.max(contentBottom, projects.top - 120)
        const bandBottom = h2 ? h2.top : projects.top + 60
        const sweepY = (bandTop + Math.max(bandBottom, bandTop + 40)) / 2
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
        if (el.matches("[data-hero]")) heroSegment(box)
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

        paths.forEach((path) => {
            prepDraw(path)
            gsap.set(path, { autoAlpha: 1 })
        })
        if (pen) gsap.set(pen, { autoAlpha: 0 })
        if (word) gsap.set(word, { autoAlpha: 1 })

        const timeline = gsap.timeline({
            paused: true,
            defaults: { ease: "power1.inOut" },
        })

        if (clipRect && writePath) {
            const writeDuration = 1.85
            if (pen) {
                timeline.set(pen, { autoAlpha: 1 }, 0.08)
                timeline.to(
                    pen,
                    {
                        motionPath: {
                            path: writePath,
                            align: writePath,
                            alignOrigin: [0.5, 0.12],
                            autoRotate: 90,
                        },
                        duration: writeDuration,
                        ease: "power1.inOut",
                    },
                    0.08,
                )
            }
            timeline.to(
                clipRect,
                { attr: { width: 560 }, duration: writeDuration, ease: "power1.inOut" },
                0.08,
            )
        }

        paths.forEach((path, index) => {
            const length = path.getTotalLength()
            const duration = clamp(length / 240, 0.45, 1.4)
            const at = clipRect ? ">" : index === 0 ? 0.05 : ">"

            if (pen) {
                timeline.set(pen, { autoAlpha: 1 }, at)
                timeline.to(
                    pen,
                    {
                        motionPath: {
                            path,
                            align: path,
                            alignOrigin: [0.5, 0.12],
                            autoRotate: 90,
                        },
                        duration,
                        ease: "power1.inOut",
                    },
                    "<",
                )
            }

            timeline.to(
                path,
                { strokeDashoffset: 0, duration },
                pen ? "<" : at,
            )
        })

        if (pen) {
            timeline.to(pen, { autoAlpha: 0, duration: 0.25 }, ">-0.05")
        }

        const variant = svg.dataset.variant
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
 * the pen first reaches that depth.
 */
function buildDepthLookup(path: SVGPathElement, length: number) {
    const n = Math.max(2, Math.ceil(length / 6))
    const lens = new Float32Array(n + 1)
    const depth = new Float32Array(n + 1)
    let maxY = -Infinity
    for (let i = 0; i <= n; i++) {
        const l = (i / n) * length
        const pt = path.getPointAtLength(l)
        if (pt.y > maxY) maxY = pt.y
        lens[i] = l
        depth[i] = maxY
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
    return { startY, endY, lengthAt }
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

    const { startY, endY, lengthAt } = buildDepthLookup(path, length)

    // Ink drops where the pen pauses or turns, revealed as it passes by.
    splatters.replaceChildren()
    const blots: { circle: SVGCircleElement; at: number }[] = []
    anchors.forEach((anchor, index) => {
        if (!anchor.blot) return
        const count = L.mobile ? 1 : 2
        for (let k = 0; k < count; k++) {
            const seed = index * 7 + k * 3
            const circle = document.createElementNS(SVG_NS, "circle")
            const dx = (seed % 2 === 0 ? 1 : -1) * (6 + (seed % 5) * 3)
            const dy = ((seed * 13) % 17) - 8
            circle.setAttribute("cx", `${anchor.x + dx}`)
            circle.setAttribute("cy", `${anchor.y + dy}`)
            circle.setAttribute("r", `${(L.mobile ? 1.2 : 1.6) + (seed % 3) * 0.7}`)
            circle.setAttribute("fill", seed % 3 === 0 ? "#8B1A1A" : "#B22222")
            circle.setAttribute("opacity", "0")
            splatters.appendChild(circle)
            blots.push({ circle, at: clamp(lengthAt(anchor.y) / length, 0, 0.98) })
        }
    })

    const stroke = L.mobile ? 1.7 : L.vw < 1024 ? 2.1 : 2.6
    path.setAttribute("stroke-width", `${stroke}`)
    if (pathShadow) pathShadow.setAttribute("stroke-width", `${stroke + 2.4}`)

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
        timeline.to(circle, { opacity: 0.45, duration: 0.02 }, at)
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
    trailTimer = window.setTimeout(() => {
        if (prefersReducedMotion()) return
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
        gsap.fromTo(
            heroWords,
            { y: 42, autoAlpha: 0, rotateZ: -6 },
            {
                y: 0,
                autoAlpha: 1,
                rotateZ: 0,
                duration: 0.85,
                stagger: 0.1,
                ease: "back.out(1.5)",
                delay: 0.05,
            },
        )
    }

    const cta = document.querySelector<HTMLElement>("#start")
    if (cta) {
        gsap.fromTo(
            cta,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.7, delay: 1.15, ease: "power3.out" },
        )
    }

    const hint = document.querySelector<HTMLElement>(".js-scroll-hint")
    if (hint) {
        gsap.fromTo(
            hint,
            { autoAlpha: 0, y: -6 },
            { autoAlpha: 1, y: 0, duration: 0.6, delay: 1.4 },
        )
        gsap.to(hint, {
            y: 8,
            duration: 1.1,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 1.8,
        })
    }

    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const type = el.dataset.reveal
        if (type === "card") return
        const from =
            type === "left"
                ? { x: -56, y: 0, rotate: -8, autoAlpha: 0 }
                : type === "right"
                  ? { x: 48, y: 16, rotate: 0, autoAlpha: 0 }
                  : { y: 30, rotate: 0, autoAlpha: 0 }

        gsap.fromTo(el, from, {
            x: 0,
            y: 0,
            rotate: 0,
            autoAlpha: 1,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none none",
            },
        })
    })

    const cards = gsap.utils.toArray<HTMLElement>("[data-reveal='card']")
    if (cards.length > 0) {
        gsap.set(cards, { y: 48, rotate: 2.2, autoAlpha: 0 })
        ScrollTrigger.batch(cards, {
            start: "top 90%",
            onEnter: (batch) => {
                gsap.to(batch, {
                    y: 0,
                    rotate: 0,
                    autoAlpha: 1,
                    duration: 0.8,
                    stagger: 0.12,
                    ease: "power3.out",
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

function initCtaAndHover(signal: AbortSignal) {
    const cta = document.querySelector<HTMLAnchorElement>("#start")
    if (cta) {
        cta.addEventListener(
            "click",
            (event) => {
                const target = document.querySelector<HTMLElement>("#projects")
                if (!target) return
                event.preventDefault()
                event.stopPropagation()
                const y =
                    target.getBoundingClientRect().top + window.scrollY - 16
                gsap.to(window, {
                    duration: 1.55,
                    scrollTo: { y, autoKill: true },
                    ease: "power2.inOut",
                    overwrite: "auto",
                })
            },
            { signal },
        )

        cta.addEventListener(
            "mousemove",
            (event) => {
                const rect = cta.getBoundingClientRect()
                const x = event.clientX - rect.left - rect.width / 2
                const y = event.clientY - rect.top - rect.height / 2
                gsap.to(cta, { x: x * 0.22, y: y * 0.22, duration: 0.28 })
            },
            { signal },
        )

        cta.addEventListener(
            "mouseleave",
            () => {
                gsap.to(cta, {
                    x: 0,
                    y: 0,
                    duration: 0.55,
                    ease: "elastic.out(1, 0.45)",
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
                gsap.to(el, { x: x * 0.18, y: y * 0.18, duration: 0.28 })
            },
            { signal },
        )
        el.addEventListener(
            "mouseleave",
            () => {
                gsap.to(el, {
                    x: 0,
                    y: 0,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.5)",
                })
            },
            { signal },
        )
    })
}

function initSketch() {
    const sketches = document.querySelectorAll<SVGSVGElement>(".firma")
    sketches.forEach((svg) => {
        const fillPath = svg.querySelector<SVGPathElement>("#Combined-Shape")
        const inkPaths = Array.from(
            svg.querySelectorAll<SVGPathElement>("#Ink path"),
        ).filter((path) => path.getTotalLength() > 12)

        if (fillPath) {
            gsap.set(fillPath, { autoAlpha: 0 })
        }

        inkPaths.forEach((path) => {
            path.setAttribute("stroke", "#111")
            path.setAttribute("fill", "none")
            prepDraw(path)
        })

        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: svg,
                start: "top 75%",
                once: true,
            },
        })

        inkPaths.forEach((path) => {
            timeline.to(
                path,
                {
                    strokeDashoffset: 0,
                    duration: clamp(path.getTotalLength() / 420, 0.2, 0.9),
                    ease: "none",
                },
                "<0.05",
            )
        })

        if (fillPath) {
            timeline.to(fillPath, { autoAlpha: 1, duration: 0.8 }, ">-0.2")
        }
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
    const trailPen = document.querySelector<SVGGElement>("#ink-pen")
    if (trailPen) trailPen.style.opacity = "0"
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
        initSketch()
        initCtaAndHover(listeners!.signal)
    })
    initInkTrail()
    watchTrailLayout()

    ScrollTrigger.refresh()
}

function teardownMotion() {
    window.clearTimeout(trailTimer)
    trailObserver?.disconnect()
    trailObserver = undefined
    listeners?.abort()
    motionCtx?.revert()
    killInkTrail()
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
}

export function bootArtisticMotion() {
    if (!prefersReducedMotion()) {
        document.documentElement.classList.add("has-motion")
    }

    document.addEventListener("astro:page-load", () => {
        requestAnimationFrame(() => initMotion())
        // Web fonts and late images move things around: re-route the trail
        // once they have settled (no-op when the layout did not change).
        document.fonts?.ready.then(() => scheduleTrailRebuild(60))
    })

    document.addEventListener("astro:before-swap", teardownMotion)

    window.addEventListener("load", () => scheduleTrailRebuild(60))
    window.addEventListener("resize", () => scheduleTrailRebuild(180))
}
