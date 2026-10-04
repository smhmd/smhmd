import { appIDs } from 'src/apps'
import { DOMAIN } from 'src/lib/env'

/** Generated from the app registry, so a new app indexes itself. */
export async function loader() {
  const urls = ['', ...appIDs]
    .map((path) => `  <url><loc>${DOMAIN}/${path}</loc></url>`)
    .join('\n')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
