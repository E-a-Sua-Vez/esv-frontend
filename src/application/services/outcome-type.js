import { requestBackend, getHeaders } from '../api';

const entity = 'outcome-type';

export const getOutcomeTypeById = async id => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getAllOutcomeTypes = async () => {
  return (await requestBackend.get(`/${entity}`, await getHeaders())).data;
}

export const getOutcomeTypesByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateOutcomeType = async (id, module) => {
  return (await requestBackend.patch(`/${entity}/${id}`, module, await getHeaders())).data;
}

export const addOutcomeType = async (module) => {
  return (await requestBackend.post(`/${entity}`, module, await getHeaders())).data;
}

export const getActiveOutcomeTypesByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;
}