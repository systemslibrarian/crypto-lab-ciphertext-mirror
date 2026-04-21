import { defineConfig } from 'vite'

export default defineConfig({
  base: '/crypto-lab-ciphertext-mirror/',
  server: {
    port: 5173,
    host: true,
  },
})
