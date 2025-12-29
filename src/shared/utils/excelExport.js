/**
 * Enhanced Excel/CSV Export Utility
 * Provides formatted exports with headers, metadata, and better structure
 */

/**
 * Convert JSON data to CSV with enhanced formatting
 * @param {Array} data - Array of objects to convert
 * @param {Object} options - Export options
 * @returns {string} CSV string
 */
export function jsonToFormattedCSV(data, options = {}) {
  if (!data || data.length === 0) {
    return '';
  }

  const {
    includeHeader = true,
    includeMetadata = true,
    metadata = {},
    sheetName = 'Data',
    delimiter = ',',
  } = options;

  let csv = '';

  // Add BOM for UTF-8 encoding (helps Excel recognize special characters)
  csv = '\uFEFF';

  // Add metadata section if requested
  if (includeMetadata && Object.keys(metadata).length > 0) {
    csv += `# ${sheetName}\n`;
    csv += `# Generated: ${new Date().toLocaleString()}\n`;
    Object.keys(metadata).forEach(key => {
      csv += `# ${key}: ${metadata[key]}\n`;
    });
    csv += '\n';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Add header row
  if (includeHeader) {
    csv += headers.map(header => escapeCSVValue(header)).join(delimiter) + '\n';
  }

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    });
    csv += values.join(delimiter) + '\n';
  });

  return csv;
}

/**
 * Escape CSV value (handles commas, quotes, newlines)
 * @param {*} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Create a multi-sheet CSV structure (simulated with sections)
 * @param {Object} sheets - Object with sheet names as keys and data arrays as values
 * @param {Object} options - Export options
 * @returns {string} Formatted CSV string
 */
export function createMultiSheetCSV(sheets, options = {}) {
  const { includeMetadata = true } = options;
  let csv = '\uFEFF'; // BOM for UTF-8

  if (includeMetadata) {
    csv += '# Multi-Sheet Report\n';
    csv += `# Generated: ${new Date().toLocaleString()}\n`;
    csv += `# Sheets: ${Object.keys(sheets).length}\n\n`;
  }

  Object.keys(sheets).forEach((sheetName, index) => {
    if (index > 0) {
      csv += '\n\n';
    }
    csv += `# ===== ${sheetName} =====\n`;
    csv += jsonToFormattedCSV(sheets[sheetName], {
      includeHeader: true,
      includeMetadata: false,
      sheetName,
    });
  });

  return csv;
}

/**
 * Download CSV file with enhanced formatting
 * @param {Array|Object} data - Data to export (array for single sheet, object for multi-sheet)
 * @param {string} filename - Filename without extension
 * @param {Object} options - Export options
 */
export function downloadFormattedCSV(data, filename, options = {}) {
  let csvContent;
  const isMultiSheet = !Array.isArray(data);

  if (isMultiSheet) {
    csvContent = createMultiSheetCSV(data, options);
  } else {
    csvContent = jsonToFormattedCSV(data, {
      includeMetadata: true,
      metadata: {
        'Report Type': options.reportType || 'Financial Report',
        Period: options.period || '',
        Commerce: options.commerce || '',
      },
      sheetName: options.sheetName || 'Data',
      ...options,
    });
  }

  // Create blob with UTF-8 encoding
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for CSV export
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrencyForCSV(value, currency = 'USD') {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format percentage for CSV export
 * @param {number} value - Numeric value (0-100)
 * @returns {string} Formatted percentage string
 */
export function formatPercentageForCSV(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  return `${Number(value).toFixed(2)}%`;
}
