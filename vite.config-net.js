import { fileURLToPath, URL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

export default defineConfig(({ command, mode }) =>
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  ({
    // vite config
    plugins: [
      vue(),
      VueI18nPlugin({
        include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    envDir: 'net',
    // Build optimizations for better performance
    build: {
      // Target modern browsers for smaller bundles
      target: 'es2015',
      // Minification (esbuild is faster and built-in)
      minify: 'esbuild',
      // Remove console.log in production
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Rollup options for better code splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching and loading
          manualChunks: id => {
            // Split node_modules into separate chunks
            if (id.includes('node_modules')) {
              // Heavy libraries get their own chunks
              if (id.includes('html2pdf.js')) {
                return 'html2pdf';
              }
              if (id.includes('chart.js') || id.includes('vue-chart-3')) {
                return 'charts';
              }
              if (id.includes('firebase')) {
                return 'firebase';
              }
              if (id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-core';
              }
              if (id.includes('bootstrap')) {
                return 'bootstrap';
              }
              // Other vendor libraries
              return 'vendor';
            }
            // Split large locale files
            if (id.includes('locales')) {
              return 'locales';
            }
          },
          // Better chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return 'assets/[ext]/[name]-[hash][extname]';
          },
        },
      },
      // Source maps for production (can disable for smaller builds)
      sourcemap: false,
      // CSS code splitting
      cssCodeSplit: true,
      // Optimize assets
      assetsInlineLimit: 4096, // Inline assets < 4KB
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
      exclude: ['html2pdf.js'], // Exclude from pre-bundling, load on demand
    },
  })
);
