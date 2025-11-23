import { requestBackend, getHeaders } from '../api';

const entity = 'feature-toggle';

export const getFeatureToggleByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;

export const updateFeatureToggle = async (id, feature) =>
  (await requestBackend.patch(`/${entity}/${id}`, feature, await getHeaders())).data;

export const getFeatureToggleOptions = async () =>
  (await requestBackend.get(`/${entity}/options/all`, await getHeaders())).data;

export const addFeatureToggle = async feature =>
  (await requestBackend.post(`/${entity}`, feature, await getHeaders())).data;

export const getFeatureToggleByNameAndCommerceId = async (commerceId, name) =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/name/${name}`, await getHeaders()))
    .data;
