import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    include: ['antd', '@ant-design/icons'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
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
