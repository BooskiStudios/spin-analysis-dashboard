import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      proxy: {
        '/health': 'http://localhost:4000',
        '/games': 'http://localhost:4000',
        '/upload-session-video': 'http://localhost:4000',
        '/sessions': 'http://localhost:4000',
        '/spins': 'http://localhost:4000',
        '/storage': 'http://localhost:4000',
      },
    },
  }
})