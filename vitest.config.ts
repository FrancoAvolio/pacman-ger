import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/game/**/*.ts',
        'src/store/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/HUD.tsx',
        'src/components/StartScreen.tsx',
      ],
      exclude: ['src/game/runtime.ts'],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
})
