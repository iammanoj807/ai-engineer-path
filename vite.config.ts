import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site's home is https://learn.hamropedia.com/ (a custom domain set in the
// repo's Pages settings). Until that domain's DNS record exists it is served at
// https://iammanoj807.github.io/ai-engineer-path/, and afterwards GitHub
// forwards that address to the domain. A relative base makes the same build work
// at both. Routes are hash routes (/#/sql), so the page itself is always the
// site's index and relative asset paths always resolve.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    sourcemap: false,
    // The lessons are big on purpose (every topic is a full lesson), and each
    // course loads as its own chunk only when it is opened.
    chunkSizeWarningLimit: 4000,
  },
})
