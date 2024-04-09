import { requestBackend, getHeaders } from '../api';

const entity = 'product';

export const getProductByCommerce = async id => {
    return (await requestBackend.get(`/${entity}/commerce/${id}`, await getHeaders())).data;
}

export const getProductById = async id => {
    return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getProductsById = async ids => {
    if (ids && ids.length > 0) {
        return (await requestBackend.get(`/${entity}/list/${ids}`, await getHeaders())).data;
    }
}

export const updateProduct = async (id, product) => {
    return (await requestBackend.patch(`/${entity}/${id}`, product, await getHeaders())).data;
}

export const addProduct = async (product) => {
    return (await requestBackend.post(`/${entity}`, product, await getHeaders())).data;
}

export const getActiveProductsByCommerceId = async commerceId => {
    return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;
  }