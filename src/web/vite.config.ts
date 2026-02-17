import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SilverPoint',
        short_name: 'SilverPoint',
        description: 'Find the lowest price near you.',
        theme_color: '#c0c0c0',
        background_color: '#f5f5f5',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/health': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
