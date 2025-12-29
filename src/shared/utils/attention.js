/**
 * Shared utility functions for attention operations
 */

/**
 * Filter attentions by today's date
 * Handles different date formats (Date, Firebase Timestamp, string)
 * @param {Array} attentions - Array of attention objects
 * @returns {Array} Filtered array of attentions from today
 */
export function filterAttentionsByToday(attentions) {
  if (!attentions || !Array.isArray(attentions)) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  return attentions.filter(attention => {
    if (!attention.createdAt && !attention.createdDate) return false;

    const createdDate = attention.createdAt || attention.createdDate;
    let attentionDate;

    try {
      if (createdDate instanceof Date) {
        attentionDate = new Date(createdDate);
      } else if (typeof createdDate === 'string') {
        attentionDate = new Date(createdDate);
      } else if (createdDate.toDate && typeof createdDate.toDate === 'function') {
        // Firebase Timestamp
        attentionDate = createdDate.toDate();
      } else if (createdDate.seconds) {
        // Firebase Timestamp as object with seconds
        attentionDate = new Date(createdDate.seconds * 1000);
      } else {
        return false;
      }

      // Check if date is valid
      if (isNaN(attentionDate.getTime())) {
        return false;
      }

      // Compare dates (only date, not time)
      const attentionDateOnly = new Date(attentionDate);
      attentionDateOnly.setHours(0, 0, 0, 0);

      return attentionDateOnly.getTime() === today.getTime();
    } catch (error) {
      return false;
    }
  });
}
