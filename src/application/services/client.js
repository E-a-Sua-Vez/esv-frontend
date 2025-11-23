import { requestBackend, getHeaders } from '../api';

const entity = 'client';

export const getClientById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const contactClient = async (id, body) =>
  (await requestBackend.post(`/${entity}/contact/${id}`, body, await getHeaders())).data;

export const searchClientByIdNumber = async (commerceId, idNumber) =>
  (
    await requestBackend.get(
      `/${entity}/search/commerceId/${commerceId}/idNumber/${idNumber}`,
      await getHeaders()
    )
  ).data;

export const updateClient = async (id, body) =>
  (await requestBackend.patch(`/${entity}/${id}`, body, await getHeaders())).data;
