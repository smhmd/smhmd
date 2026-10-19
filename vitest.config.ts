import { defineConfig } from 'vitest/config'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

// Unit tests run in Node, without the app's Vite plugins (Cloudflare, React Router).
export default defineConfig({
  plugins: [tsconfigPaths(), svgr()],
  test: { include: ['src/**/*.test.ts'] },
})
