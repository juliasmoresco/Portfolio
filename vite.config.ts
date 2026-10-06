import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The preview tool hands out a free port through PORT; 5173 otherwise.
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    rolldownOptions: {
      // The BoraInvest prototype ships as its own page at /bora/, so the case study can link or embed it.
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        bora: resolve(import.meta.dirname, "bora/index.html"),
      },
    },
  },
});
