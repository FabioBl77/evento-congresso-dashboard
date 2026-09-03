import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      // Durante lo sviluppo inoltro le chiamate API al backend Express.
      // Cosi' nel codice React posso usare URL relativi come `/api/analytics/summary`.
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
