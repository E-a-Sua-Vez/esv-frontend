import { requestBackend, getHeaders } from '../api';

export const getUserById = async id => {
  return (await requestBackend.get(`/user/${id}`, await getHeaders())).data;
}

export const createUser = async (body) => {
  return(await requestBackend.post(`/user`, body, await getHeaders())).data;
}
