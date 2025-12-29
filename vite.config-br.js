import { fileURLToPath, URL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

// Plugin to fix html2pdf.js jsPDF dependency issue
// html2pdf.js is bundled with webpack and tries to require('jspdf') during initialization
// This plugin intercepts that require and provides jsPDF from window.jsPDF
const html2pdfFixPlugin = () => ({
  name: 'html2pdf-jsPDF-fix',
  enforce: 'pre',
  resolveId(source, importer) {
    // Intercept when html2pdf.js (or any module) tries to resolve 'jspdf'
    // But skip if the importer is our own virtual module to prevent loops
    if (source === 'jspdf' && importer !== '\0virtual:jspdf-for-html2pdf') {
      // Return a virtual module that provides jsPDF from window
      return '\0virtual:jspdf-for-html2pdf';
    }
    return null;
  },
  async load(id) {
    // Provide jsPDF from window when html2pdf.js tries to load it
    if (id === '\0virtual:jspdf-for-html2pdf') {
      try {
        // Resolve jspdf to its actual path to avoid re-interception
        // skipSelf prevents our plugin from intercepting this resolution
        const resolved = await this.resolve('jspdf', undefined, { skipSelf: true });
        const jspdfPath = resolved?.id || 'jspdf';

        // Use proper ES module syntax - exports must be at top level
        // Import from the resolved path to prevent circular resolution
        return `import jsPDFModule from ${JSON.stringify(jspdfPath)};
const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule;

// Make jsPDF available globally for html2pdf.js compatibility
if (typeof window !== 'undefined') {
  window.jsPDF = jsPDF;
}

export default jsPDF;
export { jsPDF };`;
      } catch (error) {
        // Fallback: try without resolving (guard in resolveId should prevent loop)
        return `import jsPDFModule from 'jspdf';
const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule;

if (typeof window !== 'undefined') {
  window.jsPDF = jsPDF;
}

export default jsPDF;
export { jsPDF };`;
      }
    }
    return null;
  },
});

export default defineConfig(({ mode }) =>
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  ({
    // vite config
    plugins: [
      vue(),
      VueI18nPlugin({
        include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),
      }),
      html2pdfFixPlugin(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // Ensure jspdf can be resolved when html2pdf.js looks for it
        jspdf: 'jspdf',
      },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    server: {
      fs: {
        strict: false,
        allow: ['..'],
      },
      hmr: {
        overlay: true,
      },
      https: false, // Set to true if you need HTTPS for reCAPTCHA testing
      // Uncomment the following lines if you need HTTPS:
      // https: {
      //   key: fs.readFileSync('path/to/key.pem'),
      //   cert: fs.readFileSync('path/to/cert.pem'),
      // },
    },
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
              // CRITICAL: Exclude html2pdf.js completely from chunking
              // It has circular dependencies that break when bundled
              if (id.includes('html2pdf.js')) {
                return undefined; // Let it be a separate dynamic import chunk
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
      // CommonJS options - exclude html2pdf to prevent transformation issues
      commonjsOptions: {
        include: [/node_modules/],
        exclude: [/html2pdf\.js/], // Exclude html2pdf from CommonJS transformation
        transformMixedEsModules: true,
        strictRequires: false,
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
      include: ['vue', 'vue-router', 'pinia', 'vue-i18n', 'jspdf'],
      exclude: ['html2pdf.js'], // Exclude from pre-bundling, load on demand
    },
    envDir: 'br',
  })
);
