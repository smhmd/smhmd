import type { Config } from '@react-router/dev/config'

export default {
  appDirectory: 'src',
  ssr: true,
  future: {
    v8_viteEnvironmentApi: true,
    // Scans every route for dependencies up front, so a cold dev server doesn't reload mid-load.
    unstable_optimizeDeps: true,
  },
} satisfies Config
