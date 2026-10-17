import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    svgr(),
  ],
  ssr: {
    noExternal: ['@react-three/drei', '@react-three/rapier'],
  },
  optimizeDeps: {
    // Only workers import it, and workers aren't scanned.
    include: ['@huggingface/transformers'],
    exclude: ['@react-three/rapier'],
  },
})
