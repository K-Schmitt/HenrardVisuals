/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        // Nested paths matter: a git worktree under .claude/worktrees carries
        // its own node_modules, and a bare 'node_modules' entry only excludes
        // the top-level one — vitest would walk in and run dependencies' own
        // suites.
        exclude: ['**/node_modules/**', 'e2e/**', '.claude/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/types/**', 'src/i18n/**'],
            thresholds: {
                // Raise as coverage grows; never lower to make a build pass.
                // Measured on vitest 4 (52.88 / 40.13 / 45.86 / 54.56),
                // rounded down to the nearest 5. The branch figure is far
                // below the vitest 2 reading of the same suite — v8 coverage
                // remaps to the AST now and counts branches the old provider
                // never saw. A threshold the suite cannot meet teaches
                // everyone to ignore the badge on day one.
                statements: 50,
                branches: 40,
                functions: 45,
                lines: 50,
            },
        },
    },
    plugins: [react()],

    resolve: {
        alias: {
            // import.meta.dirname, not __dirname: Vite 8's native config
            // loader does not provide the CJS global.
            '@': resolve(import.meta.dirname, './src'),
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
        // Vite 8 bundles with rolldown/oxc; naming esbuild here now requires
        // installing esbuild separately. `true` uses the built-in minifier.
        minify: true,
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
