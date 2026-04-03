import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // Optimiza los imports de barrel files de librerías grandes (bundle-barrel-imports)
  // Esto evita cargar miles de módulos no usados de antd y @ant-design/icons
  optimizeDeps: {
    include: ['antd', '@ant-design/icons'],
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor splitting: separa las librerías del código de la app (bundle size)
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['recharts'],
          'vendor-axios': ['axios'],
        },
      },
    },
  },
})
