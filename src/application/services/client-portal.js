import { requestBackend } from '../api';

const entity = 'client-portal';

/**
 * Obtiene información del comercio por slug
 */
export const getCommerceBySlug = async slug => {
  const response = await requestBackend.get(`/${entity}/commerce/${slug}`);
  return response.data;
};

/**
 * Solicita código de acesso ao portal (usando slug)
 */
export const requestPortalAccess = async (commerceSlug, email, phone, idNumber) => {
  const response = await requestBackend.post(`/${entity}/${commerceSlug}/request-access`, {
    email,
    phone,
    idNumber,
  });
  return response.data;
};

/**
 * Valida código de acesso (usando slug)
 */
export const validatePortalCode = async (code, commerceSlug) => {
  const response = await requestBackend.post(`/${entity}/${commerceSlug}/validate-code`, {
    code,
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

/** * Obtiene los permisos del cliente por token de sesión
 */
export const getClientPermissions = async token => {
  const response = await requestBackend.get(`/${entity}/permissions/${token}`);
  return response.data;
};

/** * Renova sessão
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
 * Obtém sessões de teleconsulta do cliente (via sessão)
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
