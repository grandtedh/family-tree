import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  resolve: {
    alias: {
      "@family-tree": path.resolve(import.meta.dirname, "./src"),
      "@families": path.resolve(import.meta.dirname, "./families"),
    },
  },
  server: {
    port: 3000,
  },
})
