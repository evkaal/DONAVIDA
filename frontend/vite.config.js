import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Las imágenes se sirven desde frontend/public/assets/
  // y se referencian como /assets/... , así funcionan igual
  // en dev y en el build de producción, sin colisiones por
  // nombres repetidos en carpetas distintas.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // No se personaliza assetFileNames: Vite pone hash por defecto
    // (assets/[name]-[hash][extname]) y así dos archivos con el
    // mismo nombre en carpetas distintas no se pisan en dist/.
  },
})
