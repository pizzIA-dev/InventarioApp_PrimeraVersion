import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // URL base del build (producción)
  // Si el frontend se sirve desde un subpath, cambiarlo aquí
  // Para Vercel/Netlify/CDN en la raíz: mantener '/'
  base: '/',

  server: {
    port: 5173,
    host: '0.0.0.0',  // Escucha en todas las interfaces (nip.io y localhost)
    // NO usar proxy aquí — api.js construye la URL dinámicamente desde
    // window.location.hostname, preservando el subdominio del tenant.
  },

  // Optimiza los imports de barrel files de librerías grandes
  optimizeDeps: {
    include: ['antd', '@ant-design/icons'],
  },

  build: {
    // Advertir si algún chunk supera 1MB
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',  // Sourcemaps solo en dev (no exponer código en prod)
    rollupOptions: {
      output: {
        // Vendor splitting: separa las librerías del código de la app (bundle size)
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd':   ['antd', '@ant-design/icons'],
          'vendor-charts': ['recharts'],
          'vendor-axios':  ['axios'],
        },
      },
    },
  },
}))
