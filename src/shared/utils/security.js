/**
 * Security Utilities
 * Input sanitization, validation, and security helpers
 */

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Sanitize object recursively
 * @param {any} obj - Object to sanitize
 * @param {number} maxDepth - Maximum recursion depth (default: 10)
 * @returns {any} Sanitized object
 */
export function sanitizeObject(obj, maxDepth = 10) {
  if (maxDepth <= 0) {
    return obj; // Prevent infinite recursion
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth - 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 */
export function isValidUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number format (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') {
    return false;
  }
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()+]/g, '');
  // Check if it's all digits and has reasonable length (7-15 digits)
  return /^\d{7,15}$/.test(cleaned);
}

/**
 * Generate a secure random token
 * @param {number} length - Token length (default: 32)
 * @returns {string} Random token
 */
export function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string (simple hash for non-cryptographic purposes)
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
export function simpleHash(str) {
  if (typeof str !== 'string') {
    return '';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if a value contains potentially dangerous content
 * @param {any} value - Value to check
 * @returns {boolean} True if potentially dangerous
 */
export function containsDangerousContent(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const dangerousPatterns = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /data:text\/html/gi,
  ];

  return dangerousPatterns.some(pattern => pattern.test(value));
}

/**
 * Log security event (for monitoring)
 * @param {string} event - Event type
 * @param {object} details - Event details
 */
export function logSecurityEvent(event, details = {}) {
  const environment = import.meta.env.VITE_NODE_ENV || 'local';

  // Only log in development or if explicitly enabled
  if (environment === 'local' || import.meta.env.VITE_ENABLE_SECURITY_LOGGING === 'true') {
    console.warn('[Security Event]', {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  // In production, you might want to send this to a logging service
  // Example: sendToLoggingService({ event, details, timestamp: new Date() });
}
