import React from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  return {
    esbuild: {
      pure: mode === 'production' ? ['console.log'] : [],
    },
    plugins: [
      React(),
    ],
    build: {
      outDir: 'dist/client',
    },
  }
})
