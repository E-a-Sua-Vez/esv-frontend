import { requestBackend } from '../api';

const entity = 'client-portal';

/**
 * Solicita código de acesso ao portal
 */
export const requestPortalAccess = async (commerceId, email, phone, idNumber) => {
  const response = await requestBackend.post(`/${entity}/request-access`, {
    commerceId,
    email,
    phone,
    idNumber,
  });
  return response.data;
};

/**
 * Valida código de acesso
 */
export const validatePortalCode = async (code, commerceId) => {
  const response = await requestBackend.post(`/${entity}/validate-code`, {
    code,
    commerceId,
  });
  return response.data;
};

/**
 * Valida token de sessão
 */
export const validatePortalSession = async token => {
  const response = await requestBackend.get(`/${entity}/session/${token}`);
  return response.data;
};

/**
 * Renova sessão
 */
export const renewPortalSession = async token => {
  const response = await requestBackend.post(`/${entity}/session/${token}/renew`);
  return response.data;
};

/**
 * Obtém consentimentos do cliente (via sessão)
 */
export const getClientConsents = async (commerceId, clientId) => {
  const token = localStorage.getItem('clientPortalSessionToken');
  const response = await requestBackend.get(`/${entity}/consents/${commerceId}/${clientId}`, {
    params: { token },
  });
  return response.data;
};

/**
 * Revoga um consentimento (via sessão)
 */
export const revokeConsent = async (consentId, reason) => {
  const token = localStorage.getItem('clientPortalSessionToken');
  const response = await requestBackend.patch(
    `/${entity}/consents/${consentId}/revoke`,
    { reason, token },
    {
      params: { token },
    }
  );
  return response.data;
};

/**
 * Obtém sessões de telemedicina do cliente (via sessão)
 */
export const getClientTelemedicineSessions = async (commerceId, clientId) => {
  const token = localStorage.getItem('clientPortalSessionToken');
  const response = await requestBackend.get(`/${entity}/telemedicine/${commerceId}/${clientId}`, {
    params: { token },
  });
  return response.data;
};

/**
 * Obtém perfil do cliente (via sessão)
 */
export const getClientProfile = async (commerceId, clientId) => {
  const token = localStorage.getItem('clientPortalSessionToken');
  const response = await requestBackend.get(`/${entity}/profile/${commerceId}/${clientId}`, {
    params: { token },
  });
  return response.data;
};

/**
 * Obtém documentos do cliente (via sessão)
 */
export const getClientDocuments = async (commerceId, clientId) => {
  const token = localStorage.getItem('clientPortalSessionToken');
  const response = await requestBackend.get(`/${entity}/documents/${commerceId}/${clientId}`, {
    params: { token },
  });
  return response.data;
};

/**
 * Obtém histórico de atenciones del cliente (via sessão)
 */
export const getClientAttentions = async (commerceId, clientId) => {
  const token = localStorage.getItem('clientPortalSessionToken');
  const response = await requestBackend.get(`/${entity}/attentions/${commerceId}/${clientId}`, {
    params: { token },
  });
  return response.data;
};
