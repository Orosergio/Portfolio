import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Relative base so the SAME dist works on:
//  - GitHub Pages under /Portfolio/  (orosergio.github.io/Portfolio/)
//  - Netlify at root                 (your-site.netlify.app/)
// Runtime image paths in the app are plain-relative ("assets/...") for the same reason.
export default defineConfig({
  base: './',
  plugins: [
    viteStaticCopy({
      // Pass legacy/public files through to dist byte-for-byte at their original paths.
      // These must NOT go through Vite's HTML transform — they are publicly linked URLs.
      targets: [
        { src: 'visual-campaign-board-*.html', dest: '.' },
        { src: 'portfolio-hero.html', dest: '.' },
        { src: 'classic.html', dest: '.' },
        { src: 'assets/screenshots/*', dest: 'assets/screenshots' },
        { src: 'assets/favicon.svg', dest: 'assets' },
        { src: 'assets/og-cover.png', dest: 'assets' },
        { src: '.nojekyll', dest: '.' }
      ]
    })
  ],
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900
  },
  server: { host: true }
})
