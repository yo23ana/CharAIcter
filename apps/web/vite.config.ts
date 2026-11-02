import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const directory = fileURLToPath(new URL('.', import.meta.url))
// The API that /analyze is forwarded to. End-to-end tests start their own API
// on another port and set API_PROXY_TARGET.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  root: directory,
  server: {
    port: 5173,
    proxy: { '/analyze': apiTarget },
  },
  preview: {
    proxy: { '/analyze': apiTarget },
  },
})
