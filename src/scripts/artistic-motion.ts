import { gsap } from "gsap"
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(MotionPathPlugin, ScrollToPlugin, ScrollTrigger)

const SVG_NS = "http://www.w3.org/2000/svg"

let motionCtx: gsap.Context | undefined
let inkTimeline: gsap.core.Timeline | undefined
let resizeTimer: number | undefined
let listeners: AbortController | undefined

const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

function prepDraw(path: SVGPathElement) {
    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    return length
}

function pointOnPage(el: Element, ox = 0.5, oy = 0.5) {
    const rect = el.getBoundingClientRect()
    return {
        x: rect.left + rect.width * ox + window.scrollX,
        y: rect.top + rect.height * oy + window.scrollY,
    }
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function toSmoothPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return ""
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] ?? points[i]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[i + 2] ?? p2
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
}

function collectTrailAnchors(width: number, height: number) {
    const pad = Math.max(28, width * 0.045)
    const points: { x: number; y: number }[] = []

    const push = (x: number, y: number) => {
        points.push({
            x: clamp(x, pad, width - pad),
            y: clamp(y, 24, height - 24),
        })
    }

    const addEl = (selector: string, ox: number, oy: number) => {
        const el = document.querySelector(selector)
        if (!el) return
        const pt = pointOnPage(el, ox, oy)
        push(pt.x, pt.y)
    }

    const hasHero = !!document.querySelector(".js-signature[data-variant='hero']")
    const hasProjects = !!document.querySelector("#projects")
    const hasContact = !!document.querySelector("#contact")

    if (hasHero) {
        addEl(".js-signature[data-variant='hero']", 0.92, 0.72)
        addEl("#start", 0.55, 1.15)
    } else {
        push(pad, 80)
    }

    if (hasProjects) {
        addEl("#about h2", 0.12, 0.65)
        addEl("#about img", -0.08, 0.2)
        addEl("#about img", -0.1, 0.9)
        addEl("#about [data-stats]", 0.92, 0.4)
        addEl("#projects h2", 0.88, 0.1)
        addEl("#projects article", -0.16, 0.05)
        addEl("#projects article", -0.14, 1.02)
        addEl("#projects article:nth-child(2)", 0.5, 1.12)
        addEl("#projects article:nth-child(3)", 1.12, 0.1)
        addEl("#projects article:nth-child(3)", 1.1, 0.95)
    } else if (hasContact) {
        addEl("#contact h2", 0.04, 0.9)
        addEl("#contact-form", 0.0, 0.25)
        addEl("#contact-form", 0.0, 0.55)
        addEl("#contact-form", 0.04, 0.92)
    }

    addEl("footer .js-signature", 0.55, 0.15)
    addEl("footer", 0.3, 0.7)

    if (points.length < 3) {
        push(pad, height * 0.25)
        push(pad + 12, height * 0.7)
    }

    const last = points[points.length - 1]
    if (last && last.y < height - 80) {
        push(hasContact ? pad + 24 : width * 0.55, height - 40)
    }

    const wanderAmount = hasProjects ? Math.min(110, width * 0.1) : 36
    const enriched: { x: number; y: number }[] = []
    for (let i = 0; i < points.length; i++) {
        enriched.push(points[i])
        const next = points[i + 1]
        if (!next) continue
        const wander = i % 2 === 0 ? 1 : -1
        enriched.push({
            x: clamp(
                (points[i].x + next.x) / 2 + wander * wanderAmount,
                pad,
                width - pad,
            ),
            y: (points[i].y + next.y) / 2,
        })
    }
    return enriched
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

function killInkTrail() {
    inkTimeline?.scrollTrigger?.kill()
    inkTimeline?.kill()
    inkTimeline = undefined
}

function initInkTrail() {
    killInkTrail()
    const root = document.querySelector<HTMLElement>("#ink-trail")
    const svg = root?.querySelector<SVGSVGElement>("svg")
    const path = root?.querySelector<SVGPathElement>("#ink-path")
    const pathShadow = root?.querySelector<SVGPathElement>("#ink-path-shadow")
    const pen = root?.querySelector<SVGGElement>("#ink-pen")
    const splatters = root?.querySelector<SVGGElement>("#ink-splatters")
    if (!root || !svg || !path || !pen || !splatters) return

    gsap.set(root, { autoAlpha: 1 })

    // Drop any previous explicit height before measuring so a stale value
    // cannot keep the document artificially tall after a resize.
    root.style.height = ""

    const width = document.documentElement.clientWidth
    const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
    )
    const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight

    if (maxScroll < 64) {
        gsap.set(root, { autoAlpha: 0 })
        return
    }

    // Size the overlay explicitly so the viewBox maps 1:1 to page pixels even
    // if the containing block ever falls back to the viewport.
    root.style.height = `${height}px`
    svg.setAttribute("width", `${width}`)
    svg.setAttribute("height", `${height}`)
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`)

    const d = toSmoothPath(collectTrailAnchors(width, height))
    path.setAttribute("d", d)
    if (pathShadow) pathShadow.setAttribute("d", d)

    const length = path.getTotalLength()
    if (!length) return

    prepDraw(path)
    if (pathShadow) prepDraw(pathShadow)

    splatters.replaceChildren()
    const blotCount = width < 768 ? 7 : 12
    for (let i = 0; i < blotCount; i++) {
        const t = (i + 0.65) / (blotCount + 1)
        const pt = path.getPointAtLength(length * t)
        const circle = document.createElementNS(SVG_NS, "circle")
        const jitter = (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 3)
        circle.setAttribute("cx", `${pt.x + jitter}`)
        circle.setAttribute("cy", `${pt.y + ((i * 13) % 11) - 5}`)
        circle.setAttribute("r", `${1.6 + (i % 4) * 0.9}`)
        circle.setAttribute("fill", i % 3 === 0 ? "#8B1A1A" : "#B22222")
        circle.setAttribute("opacity", "0")
        splatters.appendChild(circle)
    }

    const stroke = window.innerWidth < 768 ? 1.8 : 2.6
    path.setAttribute("stroke-width", `${stroke}`)
    if (pathShadow) pathShadow.setAttribute("stroke-width", `${stroke + 2.4}`)

    gsap.set(pen, { autoAlpha: 1, scale: 1.65, transformOrigin: "50% 18%" })

    const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
            id: "ink-trail",
            trigger: document.documentElement,
            start: "top top",
            end: "max",
            scrub: 0.7,
        },
    })
    inkTimeline = timeline

    if (pathShadow) {
        timeline.to(pathShadow, { strokeDashoffset: 0 }, 0)
    }
    timeline.to(path, { strokeDashoffset: 0 }, 0)
    timeline.to(
        pen,
        {
            motionPath: {
                path,
                align: path,
                alignOrigin: [0.5, 0.18],
                autoRotate: 90,
            },
        },
        0,
    )

    splatters.querySelectorAll("circle").forEach((circle, index) => {
        timeline.to(
            circle,
            { opacity: 0.45, duration: 0.04 },
            index / blotCount,
        )
    })
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

    ScrollTrigger.refresh()
}

function scheduleResize() {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
        if (prefersReducedMotion()) return
        initInkTrail()
        ScrollTrigger.refresh()
    }, 180)
}

export function bootArtisticMotion() {
    if (!prefersReducedMotion()) {
        document.documentElement.classList.add("has-motion")
    }

    document.addEventListener("astro:page-load", () => {
        requestAnimationFrame(() => initMotion())
        document.fonts?.ready.then(() => ScrollTrigger.refresh())
    })

    document.addEventListener("astro:before-swap", () => {
        listeners?.abort()
        motionCtx?.revert()
        killInkTrail()
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    })

    window.addEventListener("resize", scheduleResize)
}
