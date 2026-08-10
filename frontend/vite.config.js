import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        const normalizedId = id.replace(/\\/g, '/');
                        if (normalizedId.includes('/katex/')) {
                            return 'vendor-katex';
                        }
                        if (normalizedId.includes('/pdfjs-dist/')) {
                            return 'vendor-pdfjs';
                        }
                    }
                }
            }
        }
    },
    server: {
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            },
            '/ws-live-updates': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                ws: true,
                secure: false,
            }
        }
    }
})
