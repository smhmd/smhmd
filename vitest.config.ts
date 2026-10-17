import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

// Unit tests run in Node, without the app's Vite plugins (Cloudflare, React Router).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ['src/**/*.test.ts'] },
})
