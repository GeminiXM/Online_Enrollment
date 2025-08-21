import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";
import spaFallbackPlugin from "./src/vite-spa-fallback-plugin.js";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), spaFallbackPlugin()],
  server: {
    port: 5000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
    hmr: {
      host: "vwbwebdev",
      port: 5000,
    },
    allowedHosts: ["localhost", "vwbwebdev"],
    // This middleware ensures SPA routes work correctly when accessed directly
    middlewares: [
      {
        name: "spa-fallback",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // If request is for the root path of the app
            if (
              req.url === "/online-enrollment/" ||
              req.url === "/online-enrollment"
            ) {
              req.url = "/index.html";
            }
            next();
          });
        },
      },
    ],
  },
  base: "/online-enrollment/",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});
