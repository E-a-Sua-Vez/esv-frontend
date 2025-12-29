import { requestBackend, getHeaders } from '../api';

const entity = 'package';

export const getPackageById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getPackages = async () =>
  (await requestBackend.get(`/${entity}`, await getHeaders())).data;

export const getPackagesByCommerce = async commerceId =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}`, await getHeaders())).data;

export const getActivePackagesByCommerce = async commerceId =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}/active`, await getHeaders())).data;

export const getPackagesByClient = async (commerceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/commerce/${commerceId}/client/${clientId}/all`,
      await getHeaders(),
    )
  ).data;

export const getActivePackagesByClient = async (commerceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/commerce/${commerceId}/client/${clientId}/active`,
      await getHeaders(),
    )
  ).data;

export const getAvailablePackagesForService = async (commerceId, serviceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/commerce/${commerceId}/service/${serviceId}/client/${clientId}/available`,
      await getHeaders(),
    )
  ).data;

export const getPackageAnalytics = async commerceId =>
  (await requestBackend.get(`/${entity}/analytics/${commerceId}`, await getHeaders())).data;

export const getPackageMetricsAnalytics = async commerceId =>
  (await requestBackend.get(`/${entity}/metrics/${commerceId}`, await getHeaders())).data;

export const getRecommendedSessionDates = async (packageId, count = 3) =>
  (
    await requestBackend.get(
      `/${entity}/${packageId}/recommended-dates?count=${count}`,
      await getHeaders(),
    )
  ).data;

export const createPackage = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const updatePackage = async (id, body) =>
  (await requestBackend.patch(`/${entity}/${id}`, body, await getHeaders())).data;

export const cancelPackage = async id =>
  (await requestBackend.patch(`/${entity}/cancel/${id}`, {}, await getHeaders())).data;

export const pausePackage = async id =>
  (await requestBackend.patch(`/${entity}/pause/${id}`, {}, await getHeaders())).data;

export const resumePackage = async id =>
  (await requestBackend.patch(`/${entity}/resume/${id}`, {}, await getHeaders())).data;

export const payPackage = async (id, incomesId) =>
  (await requestBackend.patch(`/${entity}/pay/${id}`, { incomesId }, await getHeaders())).data;
