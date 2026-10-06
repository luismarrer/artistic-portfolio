import type { SiteConfig } from './types.ts'
import { validateSite } from './validation.ts'

/** Customize identity, copy and destinations here. Keep demo contact until explicitly configured. */
export const site = validateSite({
  name: 'Musea Art',
  lang: 'en',
  description: 'A curated artistic portfolio demo built around imagery, illustration and visual storytelling.',
  publicUrl: 'https://artistic-portfolio-nine.vercel.app',
  logo: { src: '/logo.png', alt: 'Musea Art identity mark', width: 1024, height: 1024 },
  signature: { label: 'Musea', useDemoArtwork: true },
  hero: { title: 'Turn Your Ideas Into Art', buttonLabel: 'Explore the collections', buttonHref: '#projects' },
  portfolio: {
    selectedTitle: 'Selected collection',
    selectedDescription: 'A closer look at one credited reference collection.',
    catalogueTitle: 'All collections',
    catalogueDescription: 'Photography and illustration, presented as credited reference collections.',
    catalogueLinkLabel: 'Explore all collections',
    caseLinkLabel: 'View collection',
  },
  navigation: [
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'About', href: '/#about' },
    { label: 'Contact', href: '/contact' },
  ],
  socials: [{
    name: 'Template source on GitHub',
    url: 'https://github.com/luismarrer/artistic-portfolio',
    icon: 'M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.8-.26.8-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.83 2.81 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1-.33 3.3 1.23a11.52 11.52 0 0 1 6.01 0c2.29-1.56 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.6-2.81 5.63-5.48 5.93.43.37.82 1.1.82 2.22v3.3c0 .32.2.69.81.57A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0Z',
  }],
  footer: {
    description: 'A curated demo for presenting creative work. Replace these references with your own portfolio.',
    linksTitle: 'Template links',
    rights: 'Artwork rights remain with the credited creators.',
  },
  about: {
    title: 'About this portfolio',
    description: 'A starting point for an artist’s own work, story and contact details.',
    image: { src: '/images/profile.png', alt: 'Sketch-style portrait used as a demo placeholder', width: 512, height: 512 },
    heading: 'An artist’s story belongs here',
    paragraphs: [
      'Musea Art is a portfolio template, not a verified artist biography. The reference collections demonstrate how photography and illustration can be presented with context and credits.',
      'Replace this introduction with your practice, materials and interests. Add only experience, collaborations and results you can substantiate.',
    ],
    skillsTitle: 'Example practice areas',
    skills: ['Digital illustration', 'Visual storytelling', 'Graphic design', 'Creative direction'],
    stats: [],
  },
  pages: {
    home: { title: 'Musea Art', description: 'Explore curated demo collections of photography and illustration in an artistic portfolio template.' },
    portfolio: { title: 'Portfolio · Musea Art', description: 'Three credited reference collections demonstrating a personal artistic portfolio.' },
    contact: { title: 'Contact · Musea Art', description: 'A safe demo contact form. No message is delivered until the portfolio owner configures it.' },
  },
  contact: {
    mode: 'demo',
    title: 'Get in touch',
    subtitle: 'This portfolio is a demo. Configure your own contact destination before receiving messages.',
    demoMessage: 'Demo mode — this form does not send messages.',
  },
} satisfies SiteConfig)
