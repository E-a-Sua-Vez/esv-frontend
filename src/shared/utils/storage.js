/**
 * Storage Utilities
 * Safe storage operations with error handling
 * Uses sessionStorage for sensitive data (tokens, user data)
 * Uses localStorage for non-sensitive data (preferences, UI state)
 */

// Sensitive keys that should use sessionStorage (cleared on tab close)
const SENSITIVE_KEYS = ['currentUser', 'currentPermissions', 'currentActiveAttentions'];

/**
 * Determine which storage to use based on key sensitivity
 * @param {string} key - Storage key
 * @returns {Storage} - sessionStorage for sensitive, localStorage for others
 */
function getStorage(key) {
  return SENSITIVE_KEYS.includes(key) ? sessionStorage : localStorage;
}

/**
 * Safely get item from storage (sessionStorage for sensitive, localStorage for others)
 * @param {string} key - Storage key
 * @returns {any|null} Parsed value or null
 */
export function getStorageItem(key) {
  try {
    const storage = getStorage(key);
    const value = storage.getItem(key);
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
 * Safely set item to storage (sessionStorage for sensitive, localStorage for others)
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export function setStorageItem(key, value) {
  try {
    const storage = getStorage(key);
    if (value === null || value === undefined) {
      storage.removeItem(key);
      return;
    }

    // Stringify if not already a string
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    storage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded. Clearing old data...');
      // Could implement LRU cache cleanup here
    }
  }
}

/**
 * Remove item from storage (checks both sessionStorage and localStorage)
 * @param {string} key - Storage key
 */
export function removeStorageItem(key) {
  try {
    // Remove from both storages to ensure cleanup
    sessionStorage.removeItem(key);
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
