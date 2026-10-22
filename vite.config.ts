import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths, so the same build works at the root of the home server and under Home Assistant's ingress path.
  base: './',
  // In development, forward data requests to the local server (npm start).
  server: { proxy: { '/api': 'http://localhost:8080' } },
})
