import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    passWithNoTests: false,
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.test.ts'] } },
      { extends: true, test: { name: 'components', environment: 'jsdom', include: ['tests/components/**/*.test.tsx'], setupFiles: ['tests/setup.ts'] } },
    ],
  },
});
