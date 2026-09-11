import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server for the browser-only admin panel (separate from the Expo mobile app).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
});
