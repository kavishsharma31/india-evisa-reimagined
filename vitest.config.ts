import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    projects: [
      {
        test: {
          environment: 'node',
          include: ['src/**/*.test.ts'],
          name: 'unit',
        },
      },
      {
        test: {
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          name: 'component',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
