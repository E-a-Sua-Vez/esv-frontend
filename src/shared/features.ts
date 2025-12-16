export const getFeature = (commerce, name) => {
  if (!commerce || !commerce.features) {
    return {};
  }
  const features = commerce.features;
  const feature = features.find(feat => {
    return feat.name === name;
  });
  return feature || {};
};

export const getActiveFeature = (commerce, name, type) => {
  let active = false;
  let features = [];
  if (commerce && commerce.features && commerce.features.length > 0) {
    features = commerce.features.filter(feature => feature.type === type && feature.name === name);
    if (features.length > 0) {
      return features[0]['active'];
    }
  }
  return active;
};

/**
 * Check if telemedicine is enabled for a queue
 * Requires both:
 * 1. Commerce has 'telemedicine-active' feature toggle enabled (PRODUCT type)
 * 2. Queue has telemedicineEnabled set to true (defaults to false for backward compatibility)
 *
 * @param {Object} commerce - Commerce object with features array
 * @param {Object} queue - Queue object with telemedicineEnabled field
 * @returns {boolean} true if both commerce feature and queue field are enabled
 */
export const isTelemedicineEnabled = (commerce, queue) => {
  // Early return if commerce or queue is missing
  if (!commerce || !queue) {
    return false;
  }

  // Check commerce feature toggle - must be active
  const commerceTelemedicineActive = getActiveFeature(commerce, 'telemedicine-active', 'PRODUCT');
  if (!commerceTelemedicineActive) {
    return false;
  }

  // Check queue telemedicineEnabled field
  // Explicitly check for true (undefined/null/false all return false for backward compatibility)
  const queueTelemedicineEnabled = queue.telemedicineEnabled === true;

  return queueTelemedicineEnabled;
};
