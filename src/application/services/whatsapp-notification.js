import { requestBackend, getHeaders } from '../api';

const entity = 'notification';

/**
 * Send WhatsApp notification for preprontuario completion
 * @param {string} clientId - Client ID
 * @param {string} commerceId - Commerce ID
 * @param {string} email - Client email for the attention
 * @param {string} phone - Client phone number
 * @param {string} attentionLink - Optional: Link to the attention form
 * @param {string} attentionId - Optional: Attention ID
 * @param {string} queueId - Optional: Queue ID
 * @returns {Promise} API response
 */
export const sendPreprontuarioWhatsapp = async (
  clientId,
  commerceId,
  email,
  phone,
  attentionLink = null,
  attentionId = null,
  queueId = null,
) => {
  const payload = {
    type: 'PREPRONTUARIO_REMINDER',
    clientId,
    commerceId,
    email,
    phone,
    message: 'preprontuario_completion_reminder',
    attentionLink: attentionLink || undefined,
    attentionId: attentionId || undefined,
    queueId: queueId || undefined,
  };
  return (
    await requestBackend.post(`/${entity}/whatsapp/preprontuario`, payload, await getHeaders())
  ).data;
};

/**
 * Send WhatsApp notification for agreement completion
 * @param {string} clientId - Client ID
 * @param {string} commerceId - Commerce ID
 * @param {string} email - Client email for the agreement
 * @param {string} phone - Client phone number
 * @returns {Promise} API response
 */
export const sendAgreementWhatsapp = async (clientId, commerceId, email, phone) => {
  const payload = {
    type: 'AGREEMENT_REMINDER',
    clientId,
    commerceId,
    email,
    phone,
    message: 'agreement_completion_reminder',
  };
  return (await requestBackend.post(`/${entity}/whatsapp/agreement`, payload, await getHeaders()))
    .data;
};

/**
 * Check preprontuario completion status
 * @param {string} clientId - Client ID
 * @param {string} commerceId - Commerce ID
 * @returns {Promise} Completion status
 */
export const checkPreprontuarioStatus = async (clientId, commerceId) =>
  (
    await requestBackend.get(
      `/form/preprontuario/status/${commerceId}/${clientId}`,
      await getHeaders()
    )
  ).data;

/**
 * Check agreement completion status
 * @param {string} clientId - Client ID
 * @param {string} commerceId - Commerce ID
 * @returns {Promise} Completion status
 */
export const checkAgreementStatus = async (clientId, commerceId) =>
  (
    await requestBackend.get(
      `/client/agreement/status/${commerceId}/${clientId}`,
      await getHeaders()
    )
  ).data;
