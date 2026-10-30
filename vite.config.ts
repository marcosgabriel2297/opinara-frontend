import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Los puertos reenviados desde VS Code llegan con el dominio del túnel.
    allowedHosts: ['.devtunnels.ms'],
    // Con `VITE_API_BASE_URL=/api`, el dev server reenvía la API al backend local: desde otro
    // dispositivo (un túnel, el celular en la red) alcanza con exponer este puerto.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    // La landing del QR se abre con 3G: queremos ver cuánto pesa cada dependencia en cada build,
    // no un único bundle opaco. Además react/router/zod cambian poco, así que cachean mejor solos.
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: 'router', test: /node_modules\/react-router/ },
            { name: 'zod', test: /node_modules\/zod/ },
            { name: 'query', test: /node_modules\/@tanstack/ },
            // Sin grupo "vendor" catch-all a propósito: juntar todo node_modules en un chunk
            // obliga a la landing a bajarse react-hook-form, que solo usan login y registro.
            // El resto se parte solo, siguiendo el grafo de imports.
          ],
        },
      },
    },
    chunkSizeWarningLimit: 250,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
