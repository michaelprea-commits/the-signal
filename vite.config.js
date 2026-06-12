import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force a single copy of three.js — without this, importing from
    // three/examples/jsm spins up a second instance, breaking loader registration.
    dedupe: ['three'],
  },
})
