import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 8080, open: '/' },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.json'],
  },
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['./src/**/*.{ts,tsx}']
    },
    include: ['./tests/unit/**/*.spec.ts']
  }
});
