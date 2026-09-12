# Artistic Portfolio Example

Musea Art is a fully responsive portfolio template built with Astro and Tailwind CSS. Perfect for artists, designers, photographers, and creative professionals to showcase their work.

## TODO

- [x] Hacer la animación del marcador bajando a la sección de proyectos cuando se hace click en el botón
- [x] Hacer la animación de la firma
- [X] Hacer que el formulario de contacto funcione: Mike lo trabajo
- [X] Hacer que la página contacto funcione
- [X] Diseño de la página de portfolio
- [x] Arreglar animaciones
- [x] Mejorar footer

Utilizar solo Astro, Tailwind CSS y GSAP

## Design

[Design](https://www.figma.com/design/QRa4rBb9uLO4gufnYdf8ip/Musea-Art?node-id=0-1&t=yBuV6SR51YNoOUya-1)

### Layout tokens

- `--page-gutter`: `clamp(1.25rem, 4vw, 3rem)` — horizontal page padding
- `--header-space`: `9rem` (desktop `8rem`) — offset under the absolute header
- Breakpoints follow Tailwind defaults; mobile nav wraps, galleries stay single-column until `sm`/`lg`
- Type: Mansalva for headings, Josefin Sans for body (SemiBold faces use `font-weight: 600`)

### Motion

- GSAP signature draw (hero + footer), scroll-scrubbed ink trail, section reveals
- CTA `#start` smooth-scrolls to `#projects` and drives the trail
- Honors `prefers-reduced-motion`; trail/signature reinits after Astro view transitions
- Stack remains Astro + Tailwind + GSAP only (LeaderLine removed)

### Still open

- Set a canonical `site` URL in `astro.config.mjs` when the production domain is known (sitemap SEO)

## ✨ Features

- 🎨 **Clean & Minimal Design** - Focus on your work with a distraction-free layout
- 📱 **Fully Responsive** - Looks great on all devices from mobile to desktop
- ⚡ **Fast Performance** - Built with Astro for optimal loading speeds
- 🎯 **SEO Friendly** - Optimized for search engines

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm

### Installation

1. **Use this template** by clicking the "Use this template" button above, or clone the repository:

    ```bash
    git clone https://github.com/luismarrer/artistic-portfolio.git
    cd artistic-portfolio
    ```

2. **Install dependencies:**

    ```bash
    pnpm install
    ```

3. **Start the development server:**

    ```bash
    pnpm dev
    ```

4. **Open your browser** and visit `http://localhost:4321`

## 🛠️ Customization

### Content

All components accept props for easy customization. Edit `src/pages/index.astro` to modify the content and pass custom props to components.

### Images

- Replace placeholder images in `PortfolioGallery.astro` with your own
- Add your favicon to `public/favicon.svg`
- Place other static assets in the `public/` directory

## 📦 Building for Production

```bash
pnpm build
```

The built site will be in the `dist/` directory, ready to be deployed to any static hosting service.

## 🚢 Deployment

This template can be deployed to:

- [Vercel](https://vercel.com/)
- [Netlify](https://netlify.com/)
- Any static hosting service

## 📱 Mobile Responsiveness

The template is fully responsive with:

- Mobile-first design approach
- Responsive grid layouts
- Touch-friendly interactive elements
- Optimized images for different screen sizes

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/luismarrer/artistic-portfolio/issues).

## 🚀 Tech Stack

- Built with [Astro](https://astro.build/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- GSAP for animations
  
## 📄 License

This project is open source and available under the [MIT License](LICENSE).
