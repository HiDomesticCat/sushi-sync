import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        // runes: true // Default in Svelte 5
      }
    })
  ],
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    hmr: {
      host: "127.0.0.1",
      port: 1420,
    },
    watch: {
      usePolling: false,
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    include: ["lucide-svelte"],
  },
});
