import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  envPrefix: ["VITE_", "JWT_"],
  base: './',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('@guolao/vue-monaco-editor')) {
            return 'monaco-wrapper'
          }

          if (id.includes('monaco-editor/esm/vs/editor')) {
            return 'monaco-core'
          }

          if (id.includes('monaco-editor/esm/vs/language/typescript')) {
            return 'monaco-lang-ts'
          }

          if (id.includes('monaco-editor/esm/vs/language/html')) {
            return 'monaco-lang-html'
          }

          if (id.includes('monaco-editor/esm/vs/language/css')) {
            return 'monaco-lang-css'
          }

          if (id.includes('monaco-editor/esm/vs/language/json')) {
            return 'monaco-lang-json'
          }

          if (id.includes('monaco-editor')) {
            return 'monaco-extra'
          }

          if (id.includes('katex')) {
            return 'katex'
          }

          if (id.includes('vue') || id.includes('vue-router')) {
            return 'vue-core'
          }

          return 'vendor'
        }
      }
    }
  }
})
