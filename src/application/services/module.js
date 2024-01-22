import { requestBackend, getHeaders } from '../api';

export const getModuleById = async id => {
  return (await requestBackend.get(`/module/${id}`, await getHeaders())).data;
}

export const getAllModules = async () => {
  return (await requestBackend.get(`/module`, await getHeaders())).data;
}

export const getModulesByCommerceId = async commerceId => {
  return (await requestBackend.get(`/module/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateModule = async (id, module) => {
  return (await requestBackend.patch(`/module/${id}`, module, await getHeaders())).data;
}

export const addModule = async (module) => {
  return (await requestBackend.post(`/module`, module, await getHeaders())).data;
}

export const getActiveModulesByCommerceId = async commerceId => {
  return (await requestBackend.get(`/module/commerceId/${commerceId}/active`, await getHeaders())).data;
}