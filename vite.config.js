import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://suitmedia-backend.suitdev.com",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        work: resolve(__dirname, "work.html"),
        about: resolve(__dirname, "about.html"),
        services: resolve(__dirname, "services.html"),
        careers: resolve(__dirname, "careers.html"),
        contact: resolve(__dirname, "contact.html")
      }
    }
  }
});
