import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    //bez tego wywala sie strona bo react i react-dom sa zainstalowane w node_modules frontendu i backendu, a vite nie wie ktorego uzyc
    dedupe: ['react', 'react-dom']
  }
})