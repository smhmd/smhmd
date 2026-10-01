export const SHOW_APP_DRAWER = true
export const SHOW_TAILWIND_BREAKPOINTS = import.meta.env.DEV && false

export const DOMAIN = `https://smhmd.dev`
export const GITHUB_REPO = `smhmd/smhmd`
export const REPO_LINK = `https://github.com/${GITHUB_REPO}/`

export const SITE = {
  name: `Simo`,
  title: `Mohamed (Simo) Marhraoui | Senior Frontend Engineer`,
  description: `I'm Mohamed (Simo) Marhraoui, a senior frontend engineer. I design and build for the web. This is my portfolio. Please try all the apps I've made! I think they're super fun.`,
  siteName: `Simo's Portfolio`,
  image: `${DOMAIN}/og/about-me.avif`,
} as const

export const EMAIL = `hello@smhmd.dev`
export const TWITTER_HANDLE = `@_smhmd`

export const SOCIALS = {
  LinkedIn: `https://www.linkedin.com/in/smhmd/`,
  GitHub: `https://github.com/smhmd`,
  Twitter: `https://x.com/_smhmd`,
}

const MOBILE_REGEX =
  /iPhone|iPod|iPad|\bAndroid|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i

export const isClient = typeof window !== 'undefined'
export const isServer = typeof window === 'undefined'

export const isMobile = isClient && MOBILE_REGEX.test(navigator.userAgent)
export const isDesktop = !isMobile
