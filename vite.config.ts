import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8"));

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@mui/icons-material/Done": path.resolve(__dirname, "src/mui-icons/Done.tsx"),
      "@mui/icons-material/DoneAll": path.resolve(__dirname, "src/mui-icons/DoneAll.tsx"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_CHANNEL__: JSON.stringify(process.env.VITE_APP_CHANNEL || "beta"),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
          }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri` and visual studio/git metadata
      ignored: ["**/src-tauri/**", "**/.vs/**", "**/.git/**"],
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@mui") || id.includes("@emotion")) {
              return "vendor-mui";
            }
            if (id.includes("codemirror") || id.includes("@codemirror") || id.includes("@lezer")) {
              return "vendor-codemirror";
            }
            if (id.includes("/react/") || id.includes("/scheduler/") || id.includes("/react-dom/")) {
              return "vendor-react";
            }
            if (id.includes("@tauri-apps")) {
              return "vendor-tauri";
            }
            return "vendor-core";
          }
        },
      },
    },
  },
}));
