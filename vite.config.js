import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 8080, open: '/' },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.json'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/unit/setup.ts',
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/util/color.ts',
        'src/util/customEventType.ts',
        'src/util/webgl/uniform.ts',
        'src/shaders/',
        'src/shapes/Triangle.ts'
      ]
    },
    include: ['./tests/unit/**/*.spec.ts']
  }
});
