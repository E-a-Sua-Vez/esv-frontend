import { requestBackend, getHeaders } from '../api';

const entity = 'outcome-type';

export const getOutcomeTypeById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getAllOutcomeTypes = async () =>
  (await requestBackend.get(`/${entity}`, await getHeaders())).data;

export const getOutcomeTypesByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;

export const updateOutcomeType = async (id, module) =>
  (await requestBackend.patch(`/${entity}/${id}`, module, await getHeaders())).data;

export const addOutcomeType = async module =>
  (await requestBackend.post(`/${entity}`, module, await getHeaders())).data;

export const getActiveOutcomeTypesByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;
