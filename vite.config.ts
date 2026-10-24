import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas pesadas em chunks separados: melhor cache entre deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(recharts|d3-[^/]+|victory-vendor|recharts-scale|react-smooth|lodash|decimal\.js-light|fast-equals|eventemitter3|tiny-invariant|clsx)\//.test(id)) {
            return 'charts'
          }
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
