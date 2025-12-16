import { requestBackend, getHeaders } from '../api';

const entity = 'product';

export const getProductByCommerce = async id =>
  (await requestBackend.get(`/${entity}/commerce/${id}`, await getHeaders())).data;

export const getProductById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getProductsById = async ids => {
  if (ids && ids.length > 0) {
    return (await requestBackend.get(`/${entity}/list/${ids}`, await getHeaders())).data;
  }
};

export const updateProduct = async (id, product) =>
  (await requestBackend.patch(`/${entity}/${id}`, product, await getHeaders())).data;

export const addProduct = async product =>
  (await requestBackend.post(`/${entity}`, product, await getHeaders())).data;

export const getActiveProductsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;

export const addProductReplacement = async product =>
  (await requestBackend.post(`/${entity}/replacement`, product, await getHeaders())).data;

export const addProductConsumption = async product =>
  (await requestBackend.post(`/${entity}/consumption`, product, await getHeaders())).data;

export const getActiveReplacementsByProductId = async productId =>
  (await requestBackend.get(`/${entity}/replacement/available/${productId}`, await getHeaders()))
    .data;

export const getProductAlerts = async commerceId =>
  (await requestBackend.get(`/${entity}/alerts/${commerceId}`, await getHeaders())).data;
