# Customization Guide

This guide will help you customize the Artistic Portfolio template to make it your own.

## 🎨 Quick Customization Checklist

### 1. Basic Information
- [ ] Update site title and description in `src/pages/index.astro`
- [ ] Replace placeholder images in Portfolio Gallery
- [ ] Update social media links in Footer
- [ ] Add your favicon to `public/favicon.svg`

### 2. Content Updates

#### Hero Section
Edit `src/pages/index.astro` and customize the Hero component:

```astro
<Hero 
  title="Your Name or Business"
  subtitle="Your tagline or description"
  ctaText="View Portfolio"
  ctaLink="#portfolio"
/>
```

#### Services Section
Edit the services array in `src/components/Services.astro` or pass custom services:

```astro
<Services 
  services={[
    {
      title: "Your Service",
      description: "Service description",
      icon: "SVG path data"
    }
  ]}
/>
```

#### Portfolio Gallery
Replace the default items in `src/components/PortfolioGallery.astro`:

```astro
<PortfolioGallery 
  items={[
    {
      title: "Project Name",
      category: "Type",
      image: "/images/project.jpg",
      description: "Project description"
    }
  ]}
/>
```

#### Contact Form
Update the form action endpoint in `src/components/Contact.astro`:

```html
<form action="/api/contact" method="POST">
```

You'll need to set up a backend API endpoint to handle form submissions. Popular options:
- [Formspree](https://formspree.io/)
- [Netlify Forms](https://www.netlify.com/products/forms/)
- [Vercel Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)

#### Footer
Customize footer in `src/pages/index.astro`:

```astro
<Footer 
  siteName="Your Brand"
  socialLinks={[
    { name: "GitHub", url: "https://github.com/yourusername", icon: "..." }
  ]}
/>
```

### 3. Styling

#### Colors
Edit `tailwind.config.mjs` to change the color scheme:

```js
theme: {
  extend: {
    colors: {
      primary: '#your-color',
      secondary: '#your-color',
    },
  },
}
```

Current color scheme uses Tailwind's `slate` palette. Search and replace to use different colors:
- `slate-50` → `your-50`
- `slate-900` → `your-900`

#### Fonts
The template uses Inter font from Google Fonts. To change:

1. Update the Google Fonts link in `src/layouts/BaseLayout.astro`
2. Update the font family in `tailwind.config.mjs`

```js
fontFamily: {
  sans: ['Your Font', 'system-ui', 'sans-serif'],
}
```

#### Spacing & Layout
Adjust container widths and spacing using Tailwind classes:
- `max-w-4xl` - Maximum width
- `px-6` - Horizontal padding
- `py-20` - Vertical padding

### 4. Images

#### Portfolio Images
1. Add your images to `public/images/` directory
2. Update image paths in `PortfolioGallery.astro`
3. Use optimized images for better performance

#### Favicon
Replace `public/favicon.svg` with your own icon:
- SVG format recommended for scalability
- PNG/ICO also supported

### 5. SEO & Meta Tags
Update meta information in `src/layouts/BaseLayout.astro`:

```astro
const { 
  title = "Your Portfolio Title", 
  description = "Your portfolio description" 
} = Astro.props;
```

### 6. Adding New Sections

To add a new section:

1. Create a new component in `src/components/`
2. Import it in `src/pages/index.astro`
3. Add it between existing sections

Example:
```astro
---
import NewSection from '../components/NewSection.astro';
---

<BaseLayout>
  <Hero />
  <Services />
  <NewSection />  <!-- Your new section -->
  <PortfolioGallery />
  <Contact />
  <Footer />
</BaseLayout>
```

## 🚀 Deployment Tips

### Environment Variables
If you need API keys or secrets, use environment variables:

1. Create `.env` file (already in .gitignore)
2. Add variables: `API_KEY=your-key`
3. Access in Astro: `import.meta.env.API_KEY`

### Performance
- Optimize images before adding them
- Use WebP format for better compression
- Enable image optimization in `astro.config.mjs`

### Analytics
Add analytics by including scripts in `BaseLayout.astro`:

```astro
<head>
  <!-- Your analytics script -->
</head>
```

## 📝 Tips

- Test mobile responsiveness after each change
- Keep the design minimal and focused on your work
- Use high-quality images that represent your best work
- Update the README.md with your project-specific information

## 🆘 Need Help?

- Check the [Astro documentation](https://docs.astro.build)
- Review [Tailwind CSS docs](https://tailwindcss.com/docs)
- Open an issue on GitHub for template-specific questions
