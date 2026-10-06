export interface LocalImage {
  src: string
  alt: string
  width: number
  height: number
}

export interface GalleryImage extends LocalImage {
  caption: string
  size: 'small' | 'medium' | 'large'
  authorName: string
  authorLink: string
  sourceName: string
  sourceLink: string
}

export interface SocialLink {
  name: string
  url: string
  icon: string
}

export type ContactConfig = {
  title: string
  subtitle: string
  demoMessage: string
} & (
  | { mode: 'demo'; endpoint?: never }
  | { mode: 'live'; endpoint: string }
)

export interface SiteConfig {
  name: string
  lang: string
  description: string
  publicUrl: string
  logo: LocalImage
  signature: { label: string; useDemoArtwork: boolean }
  hero: { title: string; buttonLabel: string; buttonHref: string }
  navigation: { label: string; href: string }[]
  socials: SocialLink[]
  footer: { description: string; linksTitle: string; rights: string }
  about: {
    title: string
    description: string
    image: LocalImage
    heading: string
    paragraphs: string[]
    skillsTitle: string
    skills: string[]
    stats?: { value: number; suffix: string; label: string }[]
  }
  pages: Record<'home' | 'portfolio' | 'contact', { title: string; description: string }>
  contact: ContactConfig
}

export interface Project {
  id: number
  title: string
  category: string
  image: 'Reportage' | 'Connected' | 'Grown'
  description: string
  featured: boolean
  gallery: GalleryImage[]
  editorial: { context: string; process: string; outcome: string }
}
