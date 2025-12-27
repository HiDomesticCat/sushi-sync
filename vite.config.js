import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 1420,
    strictPort: true,
    host: "0.0.0.0",
    
    // 關鍵修改：禁用 HMR 或換 port
    hmr: false,  // 先試這個
    
    // 或者用這個配置：
    // hmr: {
    //   protocol: "ws",
    //   host: "localhost",  
    //   port: 1421,
    //   clientPort: 1421,
    // },
    
    // 增加超時時間
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  
  // 禁用預打包優化（可能導致模組載入問題）
  optimizeDeps: {
    exclude: ['@sveltejs/kit'],
  },
});