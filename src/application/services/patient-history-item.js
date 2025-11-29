import { requestBackend, getHeaders } from '../api';

const entity = 'patient-history-item';

export const getPatientHistoryItemByCommerce = async id =>
  (await requestBackend.get(`/${entity}/commerceId/${id}`, await getHeaders())).data;

export const getPatientHistoryItemById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getPatientHistoryItemsById = async ids => {
  if (ids && ids.length > 0) {
    return (await requestBackend.get(`/${entity}/list/${ids}`, await getHeaders())).data;
  }
};

export const updatePatientHistoryItem = async (id, service) =>
  (await requestBackend.patch(`/${entity}/${id}`, service, await getHeaders())).data;

export const addPatientHistoryItem = async service =>
  (await requestBackend.post(`/${entity}`, service, await getHeaders())).data;

export const getActivePatientHistoryItemsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;

export const getActivePatientHistoryItemsByCommerceIdAnyType = async (commerceId, type) =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/type/${type}`, await getHeaders()))
    .data;
