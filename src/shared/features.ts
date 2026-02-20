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

/**
 * Check if telemedicine is enabled for a specific service
 * Validates at three levels:
 * 1. Commerce has 'telemedicine-active' feature toggle enabled
 * 2. Queue has telemedicineEnabled set to true
 * 3. Service has telemedicineEnabled set to true
 *
 * @param {Object} commerce - Commerce object
 * @param {Object} queue - Queue object
 * @param {Object} service - Service object
 * @returns {boolean} true if all three levels permit telemedicine
 */
export const isServiceTelemedicineEnabled = (commerce, queue, service) => {
  // Early return if any required object is missing
  if (!commerce || !queue || !service) {
    return false;
  }

  // Check commerce feature toggle
  const commerceTelemedicineActive = getActiveFeature(commerce, 'telemedicine-active', 'PRODUCT');
  if (!commerceTelemedicineActive) {
    return false;
  }

  // Check queue telemedicineEnabled field
  const queueTelemedicineEnabled = queue.telemedicineEnabled === true;
  if (!queueTelemedicineEnabled) {
    return false;
  }

  // Check service telemedicineEnabled field
  const serviceTelemedicineEnabled = service.telemedicineEnabled === true;

  return serviceTelemedicineEnabled;
};

/**
 * Check if presential attention is enabled for a specific service
 * Validates at two levels:
 * 1. Queue has presentialEnabled set to true (or undefined for backward compatibility)
 * 2. Service has presentialEnabled set to true (or undefined for backward compatibility)
 *
 * @param {Object} queue - Queue object
 * @param {Object} service - Service object
 * @returns {boolean} true if both levels permit presential attention
 */
export const isServicePresentialEnabled = (queue, service) => {
  // Early return if any required object is missing
  if (!queue || !service) {
    return true; // Default to true for backward compatibility
  }

  // Check queue presentialEnabled (default to true if undefined)
  const queuePresentialEnabled = queue.presentialEnabled !== false;
  if (!queuePresentialEnabled) {
    return false;
  }

  // Check service presentialEnabled (default to true if undefined)
  const servicePresentialEnabled = service.presentialEnabled !== false;

  return servicePresentialEnabled;
};

