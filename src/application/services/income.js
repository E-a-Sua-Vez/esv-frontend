import { requestBackend, getHeaders } from '../api';

const entity = 'income';

export const createIncome = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const getPendingIncomeByPackage = async (commerceId, packageId) => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/packageId/${packageId}`, await getHeaders())).data;
}

export const confirmPendingIncome = async (id) => {
  return (await requestBackend.patch(`/${entity}/confirm/${id}`, {}, await getHeaders())).data;
}