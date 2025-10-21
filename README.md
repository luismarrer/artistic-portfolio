# Artistic Portfolio Example

Musea Art is a fully responsive portfolio template built with Astro and Tailwind CSS. Perfect for artists, designers, photographers, and creative professionals to showcase their work.

## TODO

- [X] Hacer páginas de proyectos individuales
- [X] Pensar en el contenido de los proyectos
- [X] Conseguir las ilustraciones de cada proyecto
- [X] Hacer diseño de la página de proyectos
- [ ] Hacer la animación del marcador bajando a la sección de proyectos cuando se hace click en el botón
- [ ] Hacer la animación de la firma
- [X] Hacer que el formulario de contacto funcione: Mike lo trabajo
- [X] Hacer que la página contacto funcione
- [X] Diseño de la página de portfolio
- [ ] Arreglar animaciónes
- [ ] Mejorar footer

Utilizar solo Astro, Tailwind CSS y GSAP

## ✨ Features

- 🎨 **Clean & Minimal Design** - Focus on your work with a distraction-free layout
- 📱 **Fully Responsive** - Looks great on all devices from mobile to desktop
- ⚡ **Fast Performance** - Built with Astro for optimal loading speeds
- 🎯 **SEO Friendly** - Optimized for search engines
- 🔧 **Easy to Customize** - Well-organized components and clear code structure
- 🎭 **Ready-to-use Components** - Hero, Services, Portfolio Gallery, Contact Form, and Footer

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

## 📁 Project Structure

```bash
artistic-portfolio/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── Services.astro
│   │   ├── PortfolioGallery.astro
│   │   ├── Contact.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       └── index.astro
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

## 🎨 Components

### Hero

The main landing section with a headline, subtitle, and call-to-action button.

```astro
<Hero 
  title="Your Custom Title"
  subtitle="Your custom subtitle"
  ctaText="Get Started"
  ctaLink="#portfolio"
/>
```

### Portfolio Gallery

Display your work in a responsive grid layout.

```astro
<PortfolioGallery 
  items={[
    {
      title: "Project Title",
      category: "Category",
      image: "/path/to/image.jpg",
      description: "Project description"
    }
  ]}
/>
```

### Contact Form

A ready-to-use contact form (you'll need to set up the backend endpoint).

```astro
<Contact 
  title="Get In Touch"
  subtitle="Let's work together"
/>
```

### Footer

Complete footer with navigation links and social media icons.

```astro
<Footer 
  siteName="Your Site Name"
  socialLinks={[
    { name: "GitHub", url: "https://github.com", icon: "..." }
  ]}
/>
```

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

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Astro](https://astro.build/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Animations with [GSAP](https://gsap.com/)
- Icons from [Heroicons](https://heroicons.com/)\
**Made with ❤️ for the creative community**
