import { requestBackend, getHeaders } from '../api';

const entity = 'patient-history';

export const savePatientHistory = async (body) => {
  return (await requestBackend.post(`/${entity}/save`, body, await getHeaders())).data;
}

export const updatePatientHistory = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/${id}`, body, await getHeaders())).data;
}

export const updatePatientHistoryControl = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/control/${id}`, body, await getHeaders())).data;
}