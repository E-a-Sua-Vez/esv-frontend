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
export async function lazyLoadHtml2Pdf() {
  try {
    const html2pdfModule = await import('html2pdf.js');
    // html2pdf.js exports vary by version, try multiple patterns
    if (html2pdfModule.default) {
      return html2pdfModule.default;
    }
    // Some versions export as named export
    if (html2pdfModule.html2pdf) {
      return html2pdfModule.html2pdf;
    }
    // Fallback to module itself
    return html2pdfModule;
  } catch (error) {
    console.error('Error loading html2pdf.js:', error);
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
