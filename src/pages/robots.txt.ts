import { site } from '../data/site.ts'

export function GET() {
  const sitemap = new URL('/sitemap-index.xml', site.publicUrl)
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
