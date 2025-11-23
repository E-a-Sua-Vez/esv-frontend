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
  if (commerce !== undefined && commerce.features && commerce.features.length > 0) {
    features = commerce.features.filter(feature => feature.type === type && feature.name === name);
    if (features.length > 0) {
      return features[0]['active'];
    }
  }
  return active;
};
