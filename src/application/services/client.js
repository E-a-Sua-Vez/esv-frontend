import { requestBackend, getHeaders } from '../api';

const entity = 'client';

export const contactClient = async (id, body) => {
  return (await requestBackend.post(`/${entity}/contact/${id}`, body, await getHeaders())).data;
}