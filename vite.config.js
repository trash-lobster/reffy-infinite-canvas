import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 8080, open: '/' },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.json'],
  },
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/util/color.ts',
        'src/util/customEventType.ts',
        'src/util/webgl/uniform.ts',
        'src/shaders/'
      ]
    },
    include: ['./tests/unit/**/*.spec.ts']
  }
});
