import { requestBackend, getHeaders } from '../api';

const entity = 'form-personalized';

export const getFormPersonalizedById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getFormPersonalizedByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;

export const getFormPersonalizedByCommerceIdAndType = async (commerceId, type) =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/type/${type}`, await getHeaders()))
    .data;

export const createFormPersonalized = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const updateFormPersonalized = async (id, survey) =>
  (await requestBackend.patch(`/${entity}/${id}`, survey, await getHeaders())).data;

export const getFormPersonalizedDetailsById = async body =>
  (await requestBackend.get(`/${entity}/details/`, body, await getHeaders())).data;
