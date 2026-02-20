/**
 * Utility functions for managing non-working dates
 * Implements additive logic: Business + Commerce + Queue non-working dates
 */

/**
 * Get all non-working dates from Business, Commerce and Queue levels
 * @param {Object} business - Business entity
 * @param {Object} commerce - Commerce entity
 * @param {Object} queue - Queue entity
 * @returns {Array<string>} Array of non-working dates in YYYY-MM-DD format
 */
export const getNonWorkingDates = (business = null, commerce = null, queue = null) => {
  const dates = new Set();

  // Accumulate from Business level
  if (business?.serviceInfo?.nonWorkingDates && Array.isArray(business.serviceInfo.nonWorkingDates)) {
    business.serviceInfo.nonWorkingDates.forEach(date => {
      if (date && typeof date === 'string') {
        dates.add(date);
      }
    });
  }

  // Accumulate from Commerce level
  if (commerce?.serviceInfo?.nonWorkingDates && Array.isArray(commerce.serviceInfo.nonWorkingDates)) {
    commerce.serviceInfo.nonWorkingDates.forEach(date => {
      if (date && typeof date === 'string') {
        dates.add(date);
      }
    });
  }

  // Accumulate from Queue level
  if (queue?.serviceInfo?.nonWorkingDates && Array.isArray(queue.serviceInfo.nonWorkingDates)) {
    queue.serviceInfo.nonWorkingDates.forEach(date => {
      if (date && typeof date === 'string') {
        dates.add(date);
      }
    });
  }

  return Array.from(dates).sort();
};

/**
 * Check if a specific date is a non-working date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} business - Business entity
 * @param {Object} commerce - Commerce entity
 * @param {Object} queue - Queue entity
 * @returns {boolean} True if date is non-working
 */
export const isNonWorkingDate = (date, business = null, commerce = null, queue = null) => {
  if (!date) return false;
  const nonWorkingDates = getNonWorkingDates(business, commerce, queue);
  return nonWorkingDates.includes(date);
};

/**
 * Filter available dates removing non-working dates
 * @param {Array<string>} availableDates - Array of available dates
 * @param {Object} business - Business entity
 * @param {Object} commerce - Commerce entity
 * @param {Object} queue - Queue entity
 * @returns {Array<string>} Filtered array without non-working dates
 */
export const filterNonWorkingDates = (availableDates, business = null, commerce = null, queue = null) => {
  if (!availableDates || !Array.isArray(availableDates)) {
    return [];
  }

  const nonWorkingDates = getNonWorkingDates(business, commerce, queue);

  if (nonWorkingDates.length === 0) {
    return availableDates;
  }

  return availableDates.filter(date => !nonWorkingDates.includes(date));
};

/**
 * Get non-working dates for a specific month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {Object} business - Business entity
 * @param {Object} commerce - Commerce entity
 * @param {Object} queue - Queue entity
 * @returns {Array<string>} Non-working dates in that month
 */
export const getNonWorkingDatesForMonth = (year, month, business = null, commerce = null, queue = null) => {
  const nonWorkingDates = getNonWorkingDates(business, commerce, queue);

  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  return nonWorkingDates.filter(date => date.startsWith(prefix));
};
