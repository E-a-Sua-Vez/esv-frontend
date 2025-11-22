import { requestBackend, getHeaders } from '../api';

const entity = 'queue';

export const getQueueByCommerce = async id =>
  (await requestBackend.get(`/commerce/${id}`, await getHeaders())).data;

export const getQueueById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getQueuesByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}`, await getHeaders())).data;

export const getGroupedQueueByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/grouped/commerce/${commerceId}`, await getHeaders())).data;

export const updateQueue = async (id, queue) =>
  (await requestBackend.patch(`/${entity}/${id}`, queue, await getHeaders())).data;

export const addQueue = async queue =>
  (await requestBackend.post(`/${entity}`, queue, await getHeaders())).data;
