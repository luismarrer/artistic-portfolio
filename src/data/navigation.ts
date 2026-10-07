/** A path without its trailing slash; the root stays "/". A static build emits "/portfolio/", the site publishes "/portfolio". */
const withoutTrailingSlash = (path: string) => path.replace(/\/+$/, '') || '/'

/**
 * Whether a configured navigation `href` is the page being viewed, so the header can mark it `aria-current="page"`.
 *
 * It is equality of two slash-trimmed paths. Nothing else can equal a pathname: a section (`/#about`), a bare
 * fragment, a query and another origin all differ from it, so none of them claims to be the current page (ARIA's
 * "page" is the page itself, not a place inside it). The one exception is a protocol-relative `//`, which trims
 * to the root, so it is excluded.
 */
export function isCurrentPage(href: string, pathname: string): boolean {
  return !href.startsWith('//') && withoutTrailingSlash(href) === withoutTrailingSlash(pathname)
}
