import { requestBackend, getHeaders } from '../api';

const entity = 'module';

export const getModuleById = async id => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getAllModules = async () => {
  return (await requestBackend.get(`/${entity}`, await getHeaders())).data;
}

export const getModulesByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateModule = async (id, module) => {
  return (await requestBackend.patch(`/${entity}/${id}`, module, await getHeaders())).data;
}

export const addModule = async (module) => {
  return (await requestBackend.post(`/${entity}`, module, await getHeaders())).data;
}

export const getActiveModulesByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;
}