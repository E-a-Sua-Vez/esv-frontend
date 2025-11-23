/**
 * Storage Utilities
 * Safe localStorage operations with error handling
 */

/**
 * Safely get item from localStorage
 * @param {string} key - Storage key
 * @returns {any|null} Parsed value or null
 */
export function getStorageItem(key) {
  try {
    const value = localStorage.getItem(key);
    if (!value || value === 'undefined' || value === 'null') {
      return null;
    }
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value);
    } catch {
      // Not JSON, return as string
      return value;
    }
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return null;
  }
}

/**
 * Safely set item to localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export function setStorageItem(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
      return;
    }

    // Stringify if not already a string
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded. Clearing old data...');
      // Could implement LRU cache cleanup here
    }
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
}

/**
 * Clear all application storage items
 * @param {string[]} keys - Array of keys to clear
 */
export function clearStorageItems(keys) {
  keys.forEach(key => removeStorageItem(key));
}

/**
 * Check if storage is available
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
