import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Bind a real port: honour PORT when the host sets a numeric one, else 5173.
  // Guards against an unset/literal $PORT being passed through.
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
  resolve: {
    // Force a single copy of three.js — without this, importing from
    // three/examples/jsm spins up a second instance, breaking loader registration.
    dedupe: ['three'],
  },
})
