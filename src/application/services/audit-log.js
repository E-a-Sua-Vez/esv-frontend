import { requestBackend, getHeaders } from '../api';

const entity = 'audit-log';

/**
 * Obter logs de auditoria por entidade
 */
export const getLogsByEntity = async (entityType, entityId, limit = 100) => {
  const params = limit ? `?limit=${limit}` : '';
  return (
    await requestBackend.get(
      `/${entity}/entity/${entityType}/${entityId}${params}`,
      await getHeaders(),
    )
  ).data;
};

/**
 * Obter logs de auditoria por usuário
 */
export const getLogsByUser = async (userId, limit = 100) => {
  const params = limit ? `?limit=${limit}` : '';
  return (await requestBackend.get(`/${entity}/user/${userId}${params}`, await getHeaders())).data;
};

/**
 * Obter logs de auditoria por ação
 */
export const getLogsByAction = async (action, limit = 100) => {
  const params = limit ? `?limit=${limit}` : '';
  return (await requestBackend.get(`/${entity}/action/${action}${params}`, await getHeaders()))
    .data;
};

/**
 * Gerar relatório de auditoria
 */
export const generateAuditReport = async filters => {
  const params = new URLSearchParams();
  if (filters.businessId) params.append('businessId', filters.businessId);
  if (filters.commerceId) params.append('commerceId', filters.commerceId);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.entityType) params.append('entityType', filters.entityType);
  if (filters.entityId) params.append('entityId', filters.entityId);
  if (filters.action) params.append('action', filters.action);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  return (await requestBackend.get(`/${entity}/report?${params}`, await getHeaders())).data;
};


