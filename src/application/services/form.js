import { requestBackend, getHeaders } from '../api';

const entity = 'form';

export const createForm = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const getFormsByClient = async (commerceId, clientId) => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/clientId/${clientId}`, await getHeaders())).data;
}

export const getFormsByClientAndType = async (commerceId, clientId, type) => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/clientId/${clientId}/type/${type}`, await getHeaders())).data;
}