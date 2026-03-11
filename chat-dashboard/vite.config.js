import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://backend:5000", // ← localhost → backend
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: env.VITE_API_URL || "http://backend:5000", // ← localhost → backend
          changeOrigin: true,
          ws: true,
        },
      },
    },

    build: {
      outDir: "dist",
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor";
            }
            if (id.includes("@reduxjs/toolkit") || id.includes("react-redux")) {
              return "redux";
            }
            if (id.includes("socket.io-client")) {
              return "socket";
            }
          },
        },
      },
    },

    define: {
      "process.env": {},
    },

    optimizeDeps: {
      include: ["react", "react-dom", "socket.io-client"],
    },
  };
});
