import { requestBackend, getHeaders } from '../api';

const entity = 'accounting-period';

export const getPeriodsByCommerce = async (commerceId, filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.searchText) params.append('searchText', filters.searchText);
  if (filters.status) params.append('status', filters.status);
  if (filters.year) params.append('year', filters.year);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit !== undefined) params.append('limit', filters.limit);
  if (filters.offset !== undefined) params.append('offset', filters.offset);
  
  const queryString = params.toString();
  const url = `/${entity}/commerce/${commerceId}${queryString ? `?${queryString}` : ''}`;
  
  return (await requestBackend.get(url, await getHeaders())).data;
};

export const getCurrentOpenPeriod = async (commerceId) =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}/current`, await getHeaders())).data;

export const getPeriodById = async (id) =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getPeriodSummary = async (id) =>
  (await requestBackend.get(`/${entity}/${id}/summary`, await getHeaders())).data;

export const getPeriodTransactions = async (id) =>
  (await requestBackend.get(`/${entity}/${id}/transactions`, await getHeaders())).data;

export const createPeriod = async (body) =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const closePeriod = async (id, body) =>
  (await requestBackend.post(`/${entity}/${id}/close`, body, await getHeaders())).data;

export const reopenPeriod = async (id, body) =>
  (await requestBackend.post(`/${entity}/${id}/reopen`, body, await getHeaders())).data;

export const lockPeriod = async (id, body) =>
  (await requestBackend.post(`/${entity}/${id}/lock`, body, await getHeaders())).data;
