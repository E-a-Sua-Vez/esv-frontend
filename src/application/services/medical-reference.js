import { requestBackend, getHeaders } from '../api';

const entity = 'medical-reference';

export const createReference = async referenceData =>
  (await requestBackend.post(`/${entity}/`, referenceData, await getHeaders())).data;

export const getReferenceById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getReferencesByClient = async (commerceId, clientId) =>
  (await requestBackend.get(`/${entity}/client/${commerceId}/${clientId}`, await getHeaders()))
    .data;

export const acceptReference = async (id, response) =>
  (await requestBackend.patch(`/${entity}/${id}/accept`, { response }, await getHeaders())).data;

export const markReferenceAsAttended = async (id, returnReport) =>
  (await requestBackend.patch(`/${entity}/${id}/attend`, { returnReport }, await getHeaders()))
    .data;

export const rejectReference = async (id, reason) =>
  (await requestBackend.patch(`/${entity}/${id}/reject`, { reason }, await getHeaders())).data;

/**
 * Descargar PDF de referencia médica
 */
export const downloadReferencePdf = async id => {
  const response = await requestBackend.get(`/${entity}/${id}/pdf`, {
    ...(await getHeaders()),
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Obtener URL del PDF de referencia médica
 */
export const getReferencePdfUrl = async (id, expiresIn = 3600) => {
  const params = expiresIn ? `?expiresIn=${expiresIn}` : '';
  return (await requestBackend.get(`/${entity}/${id}/pdf-url${params}`, await getHeaders())).data;
};
