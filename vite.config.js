import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        about: resolve(__dirname, 'public/about.html'),
        work: resolve(__dirname, 'public/work.html'),
        services: resolve(__dirname, 'public/services.html'),
        careers: resolve(__dirname, 'public/careers.html'),
        contact: resolve(__dirname, 'public/contact.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://suitmedia-backend.suitdev.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});