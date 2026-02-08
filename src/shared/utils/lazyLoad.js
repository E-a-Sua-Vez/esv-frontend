/**
 * Lazy Loading Utilities
 * Helper functions for lazy loading heavy libraries on demand
 */

/**
 * Lazy load html2pdf library
 * Use this instead of: import html2pdf from 'html2pdf.js'
 *
 * @returns {Promise} Promise that resolves to html2pdf
 *
 * @example
 * const html2pdf = await lazyLoadHtml2Pdf();
 * html2pdf().from(element).save();
 */
// Cache for html2pdf to avoid reloading
let html2pdfCache = null;
let loadingPromise = null;

export async function lazyLoadHtml2Pdf() {
  try {
    // CRITICAL: html2pdf.js from npm is bundled with webpack and has issues with Vite
    // The webpack code inside tries to require('jspdf') which Vite cannot resolve
    // Solution: Try CDN first (most reliable), fallback to npm with workarounds

    if (typeof window === 'undefined') {
      throw new Error('window is not available');
    }

    // Check if already loaded
    if (html2pdfCache) {
      return html2pdfCache;
    }

    if (window.html2pdf) {
      html2pdfCache = window.html2pdf;
      return window.html2pdf;
    }

    // If already loading, wait for that promise
    if (loadingPromise) {
      return await loadingPromise;
    }

    // Try CDN first (more reliable), then fallback to npm with workarounds
    loadingPromise = (async () => {
      try {
        return await loadHtml2PdfFromCDN();
      } catch (cdnError) {
        console.warn('CDN load failed, trying NPM as fallback:', cdnError);
        try {
          return await loadHtml2PdfFromNpm();
        } catch (npmError) {
          console.error('Both CDN and NPM failed:', { cdnError, npmError });
          throw new Error('Failed to load html2pdf.js from both CDN and NPM sources');
        }
      }
    })();

    const result = await loadingPromise;
    loadingPromise = null;
    return result;
  } catch (error) {
    loadingPromise = null;
    console.error('Error loading html2pdf.js:', error);
    throw error;
  }
}

// Load html2pdf.js from CDN with jsPDF loaded first
async function loadHtml2PdfFromCDN() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window is not available'));
      return;
    }

    // Check if already loaded
    if (window.html2pdf) {
      html2pdfCache = window.html2pdf;
      resolve(window.html2pdf);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="html2pdf"]');
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.html2pdf) {
          clearInterval(checkInterval);
          html2pdfCache = window.html2pdf;
          resolve(window.html2pdf);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.html2pdf) {
          reject(new Error('Timeout waiting for html2pdf.js to load'));
        }
      }, 10000);
      return;
    }

    // First load jsPDF
    const loadJsPDF = () =>
      new Promise((resolveJsPDF, rejectJsPDF) => {
        if (window.jsPDF) {
          resolveJsPDF();
          return;
        }

        const jsPDFScript = document.createElement('script');
        jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        jsPDFScript.async = true;
        jsPDFScript.crossOrigin = 'anonymous';

        jsPDFScript.onload = () => {
          // Wait a bit for initialization
          setTimeout(() => {
            if (window.jsPDF) {
              resolveJsPDF();
            } else {
              rejectJsPDF(new Error('jsPDF not available after loading'));
            }
          }, 100);
        };

        jsPDFScript.onerror = () => {
          rejectJsPDF(new Error('Failed to load jsPDF from CDN'));
        };

        document.head.appendChild(jsPDFScript);
      });

    // Then load html2pdf
    const loadHtml2PDF = () =>
      new Promise((resolveHtml2PDF, rejectHtml2PDF) => {
        const html2pdfScript = document.createElement('script');
        html2pdfScript.src = 'https://unpkg.com/html2pdf.js@0.9.3/dist/html2pdf.min.js';
        html2pdfScript.async = true;
        html2pdfScript.crossOrigin = 'anonymous';

        html2pdfScript.onload = () => {
          // Wait a bit for initialization
          setTimeout(() => {
            if (window.html2pdf) {
              html2pdfCache = window.html2pdf;
              resolveHtml2PDF(window.html2pdf);
            } else {
              rejectHtml2PDF(new Error('html2pdf not available after loading'));
            }
          }, 500);
        };

        html2pdfScript.onerror = () => {
          rejectHtml2PDF(new Error('Failed to load html2pdf.js from CDN'));
        };

        document.head.appendChild(html2pdfScript);
      });

    // Load jsPDF first, then html2pdf
    loadJsPDF()
      .then(() => loadHtml2PDF())
      .then(resolve)
      .catch(reject);
  });
}

// Load html2pdf.js from npm with workarounds for webpack compatibility
async function loadHtml2PdfFromNpm() {
  try {
    // CRITICAL: html2pdf.js uses webpack internally and calls require('jspdf') during module init
    // We must set up window.require BEFORE importing html2pdf.js

    // Step 1: Load jsPDF first
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule;

    // Step 2: Make jsPDF available globally
    window.jsPDF = jsPDF;
    if (typeof globalThis !== 'undefined') {
      globalThis.jsPDF = jsPDF;
    }

    // Step 3: Create/update require shim BEFORE importing html2pdf.js
    // This is critical because html2pdf.js webpack code runs during import
    const moduleCache = {};
    if (!window.require) {
      window.require = function (moduleName) {
        // Check cache first
        if (moduleCache[moduleName]) {
          return moduleCache[moduleName];
        }
        // Handle jspdf requests
        if (moduleName === 'jspdf' || moduleName === './jspdf' || moduleName.includes('jspdf')) {
          moduleCache[moduleName] = jsPDF;
          return jsPDF;
        }
        // For other modules, try to throw a helpful error
        throw new Error(`Module ${moduleName} not found. html2pdf.js requires jspdf.`);
      };
      window.require.cache = moduleCache;
    } else {
      // Update existing require cache
      if (!window.require.cache) {
        window.require.cache = {};
      }
      window.require.cache['jspdf'] = jsPDF;
      window.require.cache['./jspdf'] = jsPDF;
      window.require.cache['jspdf/dist/jspdf.es.min.js'] = { jsPDF };
      window.require.cache['jspdf/dist/jspdf.es.min'] = { jsPDF };
    }

    // Also set global require
    if (typeof globalThis !== 'undefined') {
      globalThis.require = window.require;
    }

    // Step 4: Wait to ensure everything is initialized
    await new Promise(resolve => setTimeout(resolve, 50));

    // Step 5: Now import html2pdf.js - it should find jsPDF via window.require
    const html2pdfModule = await import('html2pdf.js');

    // Step 6: Extract html2pdf from module
    let html2pdf = null;
    if (html2pdfModule.default) {
      html2pdf = html2pdfModule.default;
    } else if (html2pdfModule.html2pdf) {
      html2pdf = html2pdfModule.html2pdf;
    } else {
      html2pdf = html2pdfModule;
    }

    html2pdfCache = html2pdf;
    return html2pdf;
  } catch (error) {
    console.error('Failed to load html2pdf.js from npm:', error);
    // Provide more context about the error
    if (error.message && error.message.includes('jsPDF')) {
      console.error('jsPDF setup may have failed. window.jsPDF:', window.jsPDF);
      console.error('window.require:', window.require);
    }
    throw error;
  }
}

/**
 * Lazy load Chart.js library
 * Use this instead of: import { Chart, registerables } from 'chart.js'
 *
 * @returns {Promise<Object>} Promise that resolves to { Chart, registerables }
 *
 * @example
 * const { Chart, registerables } = await lazyLoadChartJs();
 * Chart.register(...registerables);
 */
export async function lazyLoadChartJs() {
  const chartModule = await import('chart.js');
  return {
    Chart: chartModule.Chart,
    registerables: chartModule.registerables,
  };
}

/**
 * Lazy load vue-chart-3 components
 * Use this instead of: import { LineChart, BarChart } from 'vue-chart-3'
 *
 * @returns {Promise<Object>} Promise that resolves to chart components
 *
 * @example
 * const { LineChart, BarChart } = await lazyLoadVueCharts();
 */
export async function lazyLoadVueCharts() {
  return import('vue-chart-3');
}

/**
 * Lazy load jsPDF library
 * Use this instead of: import jsPDF from 'jspdf'
 *
 * @returns {Promise} Promise that resolves to jsPDF
 *
 * @example
 * const jsPDF = await lazyLoadJsPDF();
 * const doc = new jsPDF();
 */
export async function lazyLoadJsPDF() {
  const jsPDF = (await import('jspdf')).default;
  return jsPDF;
}
