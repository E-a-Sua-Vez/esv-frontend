import { requestBackend, getHeaders } from '../api';

const entity = 'commerce';

export const getCommerceById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getCommerceByKeyName = async keyName =>
  (await requestBackend.get(`/${entity}/keyName/${keyName}`, await getHeaders())).data;

export const getCommercesByBusinessId = async businessId =>
  (await requestBackend.get(`/${entity}/businessId/${businessId}`, await getHeaders())).data;

export const getActiveCommercesByBusinessId = async businessId =>
  (await requestBackend.get(`/${entity}/businessId/${businessId}/active`, await getHeaders())).data;

export const updateCommerce = async (id, commerce) =>
  (await requestBackend.patch(`/${entity}/${id}`, commerce, await getHeaders())).data;

export const addCommerce = async commerce =>
  (await requestBackend.post(`/${entity}`, commerce, await getHeaders())).data;
