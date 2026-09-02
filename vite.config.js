import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/hypixel": {
        target: "https://api.hypixel.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hypixel/, ""),
      },
    },
  },
});
