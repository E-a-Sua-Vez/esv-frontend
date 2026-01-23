import { requestBackend, getHeaders } from '../api';

const entity = 'income';

export const createIncome = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const getPendingIncomeByPackage = async (commerceId, packageId) =>
  (
    await requestBackend.get(
      `/${entity}/commerceId/${commerceId}/packageId/${packageId}`,
      await getHeaders()
    )
  ).data;

export const getAllIncomesByPackage = async (commerceId, packageId) =>
  (
    await requestBackend.get(
      `/${entity}/commerceId/${commerceId}/packageId/${packageId}/all`,
      await getHeaders()
    )
  ).data;

export const confirmPendingIncome = async id =>
  (await requestBackend.patch(`/${entity}/confirm/${id}`, {}, await getHeaders())).data;
