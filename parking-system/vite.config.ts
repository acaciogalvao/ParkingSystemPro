import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Custom plugin to inject "built by scout" tag
function injectBuiltByScoutPlugin() {
  return {
    name: 'inject-built-by-scout',
    transformIndexHtml(html: string) {
      // Inject the scout tag script reference
      const scriptTag = '<script defer src="/scout-tag.js"></script>';
      
      // Inject the script before the closing body tag
      return html.replace('</body>', scriptTag + '\n  </body>');
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), injectBuiltByScoutPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['.preview.emergentagent.com', '3000-i5h9wf3gavw92870r4onf-420a3a34.manus.computer'],
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
