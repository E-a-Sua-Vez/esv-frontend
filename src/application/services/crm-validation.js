import { requestBackend, getHeaders } from '../api';

const entity = 'crm-validation';

/**
 * Validar CRM
 */
export const validateCrm = async (crm, state, doctorName) =>
  (await requestBackend.post(`/${entity}/validate`, { crm, state, doctorName }, await getHeaders()))
    .data;

/**
 * Obter informações do conselho regional
 */
export const getRegionalCouncilInfo = async state =>
  (await requestBackend.get(`/${entity}/state/${state}`, await getHeaders())).data;
