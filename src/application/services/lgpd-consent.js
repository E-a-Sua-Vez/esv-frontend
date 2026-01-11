import { requestBackend, getHeaders } from '../api';

const entity = 'lgpd-consent';

/**
 * Criar ou atualizar consentimento LGPD
 */
export const createOrUpdateConsent = async consentData =>
  (await requestBackend.post(`/${entity}/`, consentData, await getHeaders())).data;

/**
 * Revogar consentimento
 */
export const revokeConsent = async (id, reason) =>
  (await requestBackend.patch(`/${entity}/${id}/revoke`, { reason }, await getHeaders())).data;

/**
 * Obter consentimentos de um cliente
 */
export const getConsentsByClient = async (commerceId, clientId, activeOnly = true) => {
  const params = activeOnly ? '?activeOnly=true' : '';
  return (
    await requestBackend.get(
      `/${entity}/client/${commerceId}/${clientId}${params}`,
      await getHeaders(),
    )
  ).data;
};

/**
 * Verificar se cliente tem consentimento ativo
 */
export const checkActiveConsent = async (commerceId, clientId, consentType) =>
  (
    await requestBackend.get(
      `/${entity}/check/${commerceId}/${clientId}/${consentType}`,
      await getHeaders()
    )
  ).data;

/**
 * Obter consentimento por ID
 */
export const getConsentById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

/**
 * Obter todos os consentimentos (com filtros)
 */
export const getAllConsents = async filters => {
  const params = new URLSearchParams();
  if (filters.commerceId) params.append('commerceId', filters.commerceId);
  if (filters.clientId) params.append('clientId', filters.clientId);
  if (filters.consentType) params.append('consentType', filters.consentType);
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit) params.append('limit', filters.limit);
  return (await requestBackend.get(`/${entity}/?${params}`, await getHeaders())).data;
};



