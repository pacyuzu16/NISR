import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base so the build works from any path (GitHub Pages serves it under /NISR/).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
