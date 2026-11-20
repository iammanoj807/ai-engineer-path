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
        `<meta name="twitter:card" content="summary" />`,
        ...(page.trail.length > 1 ? [`<script type="application/ld+json">${JSON.stringify(breadcrumbs).replace(/</g, '\\u003c')}</script>`] : []),
      ].join('\n  ')
      let html = replaceOnce(template, /<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`)
      html = replaceOnce(html, /<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(page.description)}" />`)
      html = replaceOnce(html, '</head>', `  ${head}\n</head>`)
      return replaceOnce(html, '<div id="root"></div>', `<div id="root">${page.body}</div>`)
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
