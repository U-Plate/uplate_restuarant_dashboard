import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'


const root = resolve(__dirname, 'src')
const outDir = resolve(__dirname, 'dist')
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root,
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  base: '/',
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(root, 'index.html'),

      },
    },
  },
})
