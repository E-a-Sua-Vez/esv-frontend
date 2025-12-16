import { requestBackend, getHeaders } from '../api';

const entity = 'clinical-alerts';

export const createAlert = async alertData =>
  (await requestBackend.post(`/${entity}/`, alertData, await getHeaders())).data;

export const getAlertsByClient = async (commerceId, clientId, activeOnly = true) => {
  const params = activeOnly ? '?activeOnly=true' : '?activeOnly=false';
  return (
    await requestBackend.get(
      `/${entity}/client/${commerceId}/${clientId}${params}`,
      await getHeaders()
    )
  ).data;
};

export const getAlertsByAttention = async (commerceId, attentionId) =>
  (
    await requestBackend.get(
      `/${entity}/attention/${commerceId}/${attentionId}`,
      await getHeaders()
    )
  ).data;

export const acknowledgeAlert = async id =>
  (await requestBackend.patch(`/${entity}/${id}/acknowledge`, {}, await getHeaders())).data;

export const resolveAlert = async id =>
  (await requestBackend.patch(`/${entity}/${id}/resolve`, {}, await getHeaders())).data;

export const checkAllergies = async (clientId, medicationIds) =>
  (
    await requestBackend.post(
      `/${entity}/validate/allergies`,
      { clientId, medicationIds },
      await getHeaders()
    )
  ).data;

export const checkInteractions = async (clientId, medicationIds) =>
  (
    await requestBackend.post(
      `/${entity}/validate/interactions`,
      { clientId, medicationIds },
      await getHeaders()
    )
  ).data;
