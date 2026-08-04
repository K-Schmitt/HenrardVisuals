/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        exclude: ['node_modules', 'e2e/**'],
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
                // Function form, not object form: the object form matches only
                // exact module ids, and main.tsx imports 'react-dom/client'
                // while the code itself lives in react-dom/cjs/*. Nothing
                // matched, so `vendor` came out at 30 bytes and React was
                // swept into the router chunk.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    // Must precede the react test — 'react-router' contains 'react'.
                    if (id.includes('react-router')) return 'router';
                    if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
                        return 'react-vendor';
                    }
                    if (id.includes('@supabase')) return 'supabase';
                    if (id.includes('i18next')) return 'i18n';
                    return undefined;
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
