/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

/**
 * Handle API errors consistently
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {Object} Error information object
 */
export function handleApiError(error, context = 'API') {
  // Log error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }

  // Extract error message
  let message = 'An error occurred';
  let status = 0;
  let shouldLogout = false;
  let shouldRetry = false;

  if (error.response) {
    // API returned error response
    status = error.response.status;
    const data = error.response.data;

    message = data?.message || data?.error || `Error ${status}`;

    // Handle specific status codes
    switch (status) {
      case 401:
        // Unauthorized - session expired
        message = 'Session expired. Please login again.';
        shouldLogout = true;
        break;

      case 403:
        // Forbidden - no permission
        message = "Access denied. You don't have permission for this action.";
        shouldLogout = false;
        break;

      case 404:
        // Not found
        message = 'Resource not found.';
        break;

      case 422:
        // Validation error
        message = data?.message || 'Validation error. Please check your input.';
        break;

      case 429:
        // Rate limited
        message = 'Too many requests. Please try again later.';
        shouldRetry = true;
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        message = 'Server error. Please try again later.';
        shouldRetry = true;
        break;

      default:
        message = data?.message || `Error ${status}`;
    }
  } else if (error.request) {
    // Request made but no response
    message = 'Network error. Please check your connection.';
    shouldRetry = true;
  } else {
    // Error in request setup
    message = error.message || 'An unexpected error occurred';
  }

  return {
    message,
    status,
    shouldLogout,
    shouldRetry,
    originalError: error,
  };
}

/**
 * Format error message for user display
 * @param {Error|Object} error - Error object or error info
 * @param {string} defaultMessage - Default message if error can't be parsed
 * @returns {string} User-friendly error message
 */
export function getUserErrorMessage(error, defaultMessage = 'An error occurred') {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return defaultMessage;
}

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean}
 */
export function isRetryableError(error) {
  if (!error.response) {
    // Network errors are retryable
    return true;
  }

  const status = error.response.status;
  // Retry on server errors and rate limits
  return status >= 500 || status === 429;
}
