import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The site lives at https://learn.hamropedia.com/ (a custom domain set in the
// repo's Pages settings; GitHub forwards the old github.io address there).
// Every lesson has its own address, such as /sql/<lesson>/ (src/game/addresses.ts).
// GitHub Pages has no fallback for unknown paths, so the build writes a real
// page for each address: the app's HTML with that page's title, description,
// canonical address and text. Search engines read them, and the app takes over
// once it loads. The text comes from generated/site-pages.json, which
// `npm run site-pages` writes from the lessons (npm run build runs it first).

interface SitePage {
  path: string
  title: string
  description: string
  trail: { name: string; path: string }[]
  body: string
}

const PAGES_FILE = 'generated/site-pages.json'

// The top bar as the app draws it (components/app/TopBar.tsx), for the moment
// before the app has loaded, so the page doesn't jump when the real one appears.
// The app's bar adds the sign-in button and the streak.
const MENU_ICON = 'M4 18h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1m0-5h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1M3 7c0 .55.45 1 1 1h16c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1'
const ROUTE_ICON = 'M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18c-1.16.41-2 1.51-2 2.82 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.3-.84-2.4-2-2.82'
const NAV = [
  { href: '/', label: 'Path' },
  { href: '/foundations/', label: 'ML Foundations' },
  { href: '/sql/', label: 'SQL' },
  { href: '/system-design/', label: 'System Design' },
]
const staticBar = (path: string) => {
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))
  const svg = (d: string, cls: string) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`
  return `<header class="seo-bar"><span class="seo-bar-menu">${svg(MENU_ICON, 'seo-bar-icon')}</span>`
    + `<a class="seo-bar-logo" href="/">${svg(ROUTE_ICON, 'seo-bar-route')}<span>AI Engineer Path</span></a>`
    + `<nav class="seo-bar-nav">${NAV.map(item => `<a href="${item.href}"${active(item.href) ? ' class="on" aria-current="page"' : ''}>${item.label}</a>`).join('')}</nav></header>`
}

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Replaces exactly one match; a template change that breaks a replacement fails the build. */
const replaceOnce = (html: string, find: string | RegExp, value: string) => {
  const count = typeof find === 'string' ? html.split(find).length - 1 : (html.match(new RegExp(find, 'g')) ?? []).length
  if (count !== 1) throw new Error(`site-pages: expected one ${String(find)} in index.html, found ${count}`)
  return html.replace(find, () => value)
}

const sitePages = (): Plugin => ({
  name: 'site-pages',
  apply: 'build',
  writeBundle(options) {
    const outDir = options.dir ?? 'dist'
    if (!existsSync(PAGES_FILE)) {
      this.warn(`${PAGES_FILE} is missing, so only the home page was built. Run npm run build, which writes it first.`)
      return
    }
    const { site, pages } = JSON.parse(readFileSync(PAGES_FILE, 'utf8')) as { site: string; pages: SitePage[] }
    const template = readFileSync(join(outDir, 'index.html'), 'utf8')

    const render = (page: SitePage) => {
      const url = `${site}${page.path}`
      const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: page.trail.map((step, i) => ({ '@type': 'ListItem', position: i + 1, name: step.name, item: `${site}${step.path}` })),
      }
      const head = [
        `<link rel="canonical" href="${esc(url)}" />`,
        `<meta property="og:type" content="${page.path === '/' ? 'website' : 'article'}" />`,
        `<meta property="og:site_name" content="AI Engineer Path" />`,
        `<meta property="og:title" content="${esc(page.title)}" />`,
        `<meta property="og:description" content="${esc(page.description)}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        // The picture shown when a link is shared (public/og.png, drawn from an HTML page: the guides, Maya and Felix, and the headline).
        `<meta property="og:image" content="${site}/og.png" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="AI Engineer Path: learn ML, SQL and system design, one step at a time, with Maya and Felix, the guides" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:image" content="${site}/og.png" />`,
        ...(page.trail.length > 1 ? [`<script type="application/ld+json">${JSON.stringify(breadcrumbs).replace(/</g, '\\u003c')}</script>`] : []),
      ].join('\n  ')
      let html = replaceOnce(template, /<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
      html = replaceOnce(html, /<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(page.description)}" />`)
      html = replaceOnce(html, '</head>', `  ${head}\n</head>`)
      return replaceOnce(html, '<div id="root"></div>', `<div id="root">${staticBar(page.path)}${page.body}</div>`)
    }

    for (const page of pages) {
      const file = join(outDir, page.path, 'index.html')
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, render(page))
    }

    // Unknown addresses: GitHub Pages serves this with a 404 status, and the app
    // sends the visitor to the nearest real page.
    let notFound = replaceOnce(template, /<title>[\s\S]*?<\/title>/, '<title>Page not found | AI Engineer Path</title>')
    notFound = replaceOnce(notFound, '</head>', '  <meta name="robots" content="noindex" />\n</head>')
    writeFileSync(join(outDir, '404.html'), notFound)

    writeFileSync(
      join(outDir, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
        .map(page => `  <url><loc>${esc(`${site}${page.path}`)}</loc></url>`)
        .join('\n')}\n</urlset>\n`,
    )
    writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)
  },
})

export default defineConfig({
  base: '/',
  plugins: [react(), sitePages()],
  build: {
    sourcemap: false,
    // The lessons are big on purpose (every topic is a full lesson), and each
    // course loads as its own chunk only when it is opened.
    chunkSizeWarningLimit: 4000,
  },
})
