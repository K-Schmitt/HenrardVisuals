import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
    },
    plugins: [react()],

    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },

    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
    },

    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        // Optimize chunk splitting
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    supabase: ['@supabase/supabase-js'],
                },
            },
        },
        // Reduce chunk size warnings
        chunkSizeWarningLimit: 500,
    },

    // Optimize dependencies
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
    },
});
