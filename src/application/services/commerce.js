import { requestBackend, getHeaders } from '../api';

export const getCommerceById = async id => {
  return (await requestBackend.get(`/commerce/${id}`, await getHeaders())).data;
}

export const getCommerceByKeyName = async keyName => {
  return (await requestBackend.get(`/commerce/keyName/${keyName}`, await getHeaders())).data;
}

export const getCommercesByBusinessId = async businessId => {
  return (await requestBackend.get(`/commerce/businessId/${businessId}`, await getHeaders())).data;
}

export const getActiveCommercesByBusinessId = async businessId => {
  return (await requestBackend.get(`/commerce/businessId/${businessId}/active`, await getHeaders())).data;
}

export const updateCommerce = async (id, commerce) => {
  return (await requestBackend.patch(`/commerce/${id}`, commerce, await getHeaders())).data;
}

export const addCommerce = async (commerce) => {
  return (await requestBackend.post(`/commerce`, commerce, await getHeaders())).data;
}