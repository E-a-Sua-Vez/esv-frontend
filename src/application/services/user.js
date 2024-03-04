import { requestBackend, getHeaders } from '../api';

const entity = 'user';

export const getUserById = async id => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const createUser = async (body) => {
  return(await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const contactUser = async (id) => {
  return (await requestBackend.patch(`/${entity}/contact/${id}`, {}, await getHeaders())).data;
}