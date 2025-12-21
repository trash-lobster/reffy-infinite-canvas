import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: { port: 8080, open: "/" },
  resolve: { extensions: [".mjs", ".js", ".ts", ".json"] },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "ReffyInfiniteCanvas",
      formats: ["es"],
      fileName: "index",
    },
    // Generate source maps for production bundles
    sourcemap: true,
    rollupOptions: {
      external: [
        "lit",
        "mobx",
        "eventemitter3",
        "gl-matrix",
        "uuid",
        "@antv/g-device-api",
        "@loaders.gl/core",
        "@loaders.gl/images",
        "stats.js",
        "dexie",
      ],
      output: {
        globals: {
          lit: "Lit",
          mobx: "mobx",
          eventemitter3: "EventEmitter3",
          "gl-matrix": "glMatrix",
          uuid: "uuid",
          "@antv/g-device-api": "gDeviceApi",
          "@loaders.gl/core": "loaders",
          "@loaders.gl/images": "loadersImages",
          "stats.js": "Stats",
          dexie: "Dexie",
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [dts()],
});
