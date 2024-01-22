import { requestBackend, getHeaders } from '../api';

export const getFeatureToggleByCommerceId = async commerceId => {
  return (await requestBackend.get(`/feature-toggle/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateFeatureToggle = async (id, feature) => {
  return (await requestBackend.patch(`/feature-toggle/${id}`, feature, await getHeaders())).data;
}

export const getFeatureToggleOptions = async () => {
  return (await requestBackend.get(`/feature-toggle/options/all`, await getHeaders())).data;
}

export const addFeatureToggle = async (feature) => {
  return (await requestBackend.post(`/feature-toggle`, feature, await getHeaders())).data;
}

export const getFeatureToggleByNameAndCommerceId = async (commerceId, name) => {
  return (await requestBackend.get(`/feature-toggle/commerceId/${commerceId}/name/${name}`, await getHeaders())).data;
}