import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const directory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: directory,
  server: {
    port: 5173,
    proxy: {
      '/analyze': 'http://localhost:3000',
    },
  },
})
