import { renderToStaticMarkup } from 'react-dom/server'
import type { LinkDescriptor, MetaDescriptor } from 'react-router'

import { DOMAIN, SITE, TWITTER_HANDLE } from './env'
import { svgToURL } from './graphics'
import { type AppMetadata } from './types'

const iconToFavicon = (icon: React.ReactNode): LinkDescriptor => ({
  rel: 'icon',
  type: 'image/svg+xml',
  href: svgToURL(renderToStaticMarkup(icon)),
})

interface Meta {
  title: string
  description: string
  url: string
  image: string
  imageAlt: string
}

export function generateMeta({
  title,
  description,
  url,
  image,
  imageAlt,
}: Meta): MetaDescriptor[] {
  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },

    { property: 'og:site_name', content: SITE.siteName },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    // JPEG, not AVIF: X, Facebook, LinkedIn, WhatsApp, Slack… don't render AVIF previews
    { property: 'og:image', content: image },
    { property: 'og:image:secure_url', content: image },
    { property: 'og:image:type', content: 'image/jpeg' },
    { property: 'og:image:alt', content: imageAlt },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
    { name: 'twitter:image:alt', content: imageAlt },
    { name: 'twitter:site', content: TWITTER_HANDLE },
    { name: 'twitter:creator', content: TWITTER_HANDLE },
  ]
}

interface HeadOptions {
  metadata: AppMetadata
  icon: React.ReactNode
  font?: string | string[]
  styles?: string
  links?: LinkDescriptor[]
}

export function generateHead({
  metadata,
  icon,
  font,
  styles,
  links = [],
}: HeadOptions) {
  return {
    meta: () =>
      generateMeta({
        title: `${metadata.name} | ${SITE.name}`,
        description: metadata.description,
        url: `${DOMAIN}/${metadata.id}`,
        image: `${DOMAIN}/og/${metadata.id}.jpg`,
        imageAlt: `${metadata.name}: ${metadata.summary}, on smhmd.dev by Simo`,
      }),
    links: () => {
      const result = [iconToFavicon(icon), ...links]
      if (styles) {
        result.push({ rel: 'stylesheet', href: styles })
      }
      if (font) {
        result.push({
          rel: 'stylesheet',
          href: `https://fonts.googleapis.com/css2?display=swap&family=${font}`,
        })
      }
      return result
    },
  }
}
