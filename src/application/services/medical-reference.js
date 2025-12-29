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

/**
 * Enviar referencia por email
 */
export const sendReferenceByEmail = async (id, emailData) =>
  (await requestBackend.post(`/${entity}/${id}/send-email`, emailData, await getHeaders())).data;

/**
 * Assinar referência médica com certificado digital ICP-Brasil
 */
export const signReference = async (id, signatureData) =>
  (await requestBackend.post(`/${entity}/${id}/sign`, signatureData, await getHeaders())).data;

/**
 * Verificar assinatura digital da referência médica
 */
export const verifyReferenceSignature = async id =>
  (await requestBackend.post(`/${entity}/${id}/verify-signature`, {}, await getHeaders())).data;
