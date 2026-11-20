import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the site at https://<user>.github.io/ai-engineer-path/,
// so every built file is looked up under that folder. Routes are hash routes
// (/#/sql), because Pages has no fallback for unknown paths.
export default defineConfig({
  base: '/ai-engineer-path/',
  plugins: [react()],
  build: {
    sourcemap: false,
    // The lessons are big on purpose (every topic is a full lesson), and each
    // course loads as its own chunk only when it is opened.
    chunkSizeWarningLimit: 4000,
  },
})
