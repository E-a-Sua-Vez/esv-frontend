import { requestBackend, getHeaders } from '../api';

const entity = 'cie10';

export const searchCIE10Codes = async (searchTerm, limit) => {
  const params = new URLSearchParams();
  if (searchTerm) params.append('q', searchTerm);
  if (limit) params.append('limit', limit);
  return (await requestBackend.get(`/${entity}/search?${params}`, await getHeaders())).data;
};

export const getCIE10CodeByCode = async code =>
  (await requestBackend.get(`/${entity}/code/${code}`, await getHeaders())).data;

export const validateCIE10Code = async code =>
  (await requestBackend.get(`/${entity}/validate/${code}`, await getHeaders())).data;

export const getAllCIE10Codes = async (page, limit) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  return (await requestBackend.get(`/${entity}?${params}`, await getHeaders())).data;
};

export const getCIE10CodesByChapter = async chapter =>
  (await requestBackend.get(`/${entity}/chapter/${chapter}`, await getHeaders())).data;
