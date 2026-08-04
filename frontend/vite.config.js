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
                        if (id.includes('katex')) {
                            return 'vendor-katex';
                        }
                        if (id.includes('pdfjs-dist')) {
                            return 'vendor-pdfjs';
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-icons';
                        }
                        if (id.includes('react-dom') || id.includes('react-router-dom') || (id.includes('/react/') && !id.includes('lucide'))) {
                            return 'vendor-react';
                        }
                        if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                            return 'vendor-charts';
                        }
                        return 'vendor-core';
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
