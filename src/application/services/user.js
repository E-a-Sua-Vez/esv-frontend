import { requestBackend, getHeaders } from '../api';

const entity = 'user';

export const getUserById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const createUser = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
