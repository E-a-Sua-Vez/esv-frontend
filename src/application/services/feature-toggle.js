import { requestBackend, getHeaders } from '../api';

const entity = 'feature-toggle';

export const getFeatureToggleByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateFeatureToggle = async (id, feature) => {
  return (await requestBackend.patch(`/${entity}/${id}`, feature, await getHeaders())).data;
}

export const getFeatureToggleOptions = async () => {
  return (await requestBackend.get(`/${entity}/options/all`, await getHeaders())).data;
}

export const addFeatureToggle = async (feature) => {
  return (await requestBackend.post(`/${entity}`, feature, await getHeaders())).data;
}

export const getFeatureToggleByNameAndCommerceId = async (commerceId, name) => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/name/${name}`, await getHeaders())).data;
}