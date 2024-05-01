import { requestBackend, getHeaders } from '../api';

const entity = 'patient-history';

export const savePatientHistory = async (body) => {
  return (await requestBackend.post(`/${entity}/save`, body, await getHeaders())).data;
}