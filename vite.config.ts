import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'supabase', test: /node_modules\/@supabase\// }],
        },
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts', css: false },
})
