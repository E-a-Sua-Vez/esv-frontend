import { requestBackend, getHeaders } from '../api';

const entity = 'prescription';

export const getAllMedications = async () =>
  (await requestBackend.get(`/${entity}/medications`, await getHeaders())).data;

export const getMedicationByCommerce = async commerceId =>
  (await requestBackend.get(`/${entity}/medications/commerce/${commerceId}`, await getHeaders()))
    .data;

export const getMedicationById = async id =>
  (await requestBackend.get(`/${entity}/medications/${id}`, await getHeaders())).data;

export const createMedication = async medication =>
  (await requestBackend.post(`/${entity}/medications`, medication, await getHeaders())).data;

export const updateMedication = async (id, medication) =>
  (await requestBackend.patch(`/${entity}/medications/${id}`, medication, await getHeaders())).data;

export const deleteMedication = async id =>
  (await requestBackend.delete(`/${entity}/medications/${id}`, await getHeaders())).data;
