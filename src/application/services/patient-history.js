import { requestBackend, getHeaders } from '../api';

const entity = 'patient-history';

export const savePatientHistory = async body =>
  (await requestBackend.post(`/${entity}/save`, body, await getHeaders())).data;

export const updatePatientHistory = async (id, body) =>
  (await requestBackend.patch(`/${entity}/${id}`, body, await getHeaders())).data;

export const updatePatientHistoryControl = async (id, body) =>
  (await requestBackend.patch(`/${entity}/control/${id}`, body, await getHeaders())).data;
