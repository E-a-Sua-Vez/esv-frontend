import { requestBackend, getHeaders } from '../api';

const entity = 'commerce';

export const getCommerceById = async id => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getCommerceByKeyName = async keyName => {
  return (await requestBackend.get(`/${entity}/keyName/${keyName}`, await getHeaders())).data;
}

export const getCommercesByBusinessId = async businessId => {
  return (await requestBackend.get(`/${entity}/businessId/${businessId}`, await getHeaders())).data;
}

export const getActiveCommercesByBusinessId = async businessId => {
  return (await requestBackend.get(`/${entity}/businessId/${businessId}/active`, await getHeaders())).data;
}

export const updateCommerce = async (id, commerce) => {
  return (await requestBackend.patch(`/${entity}/${id}`, commerce, await getHeaders())).data;
}

export const addCommerce = async (commerce) => {
  return (await requestBackend.post(`/${entity}`, commerce, await getHeaders())).data;
}