import { requestBackend, getHeaders } from '../api';

const entity = 'clinical-alerts';

// Cache para evitar llamadas duplicadas
const alertsCache = new Map();
const pendingRequests = new Map();

export const createAlert = async alertData =>
  (await requestBackend.post(`/${entity}/`, alertData, await getHeaders())).data;

export const getAlertsByClient = async (commerceId, clientId, activeOnly = true) => {
  const params = activeOnly ? '?activeOnly=true' : '?activeOnly=false';
  const cacheKey = `${commerceId}-${clientId}-${activeOnly}`;

  // Si hay una petición pendiente para estos mismos parámetros, esperar a que termine
  if (pendingRequests.has(cacheKey)) {
    return await pendingRequests.get(cacheKey);
  }

  // Si hay datos en cache y no han expirado (30 segundos), devolverlos
  if (alertsCache.has(cacheKey)) {
    const cached = alertsCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
  }

  // Crear nueva petición
  const requestPromise = requestBackend.get(
    `/${entity}/client/${commerceId}/${clientId}${params}`,
    await getHeaders()
  ).then(response => {
    const data = response.data;
    // Guardar en cache
    alertsCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    // Eliminar de peticiones pendientes
    pendingRequests.delete(cacheKey);
    return data;
  }).catch(error => {
    // Eliminar de peticiones pendientes en caso de error
    pendingRequests.delete(cacheKey);
    throw error;
  });

  // Guardar petición pendiente
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
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
