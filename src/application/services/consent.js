import { requestBackend, getHeaders } from '../api';

const entity = 'consent-orchestration';

/**
 * Validar token de consentimiento (público, sin autenticación)
 */
export const validateConsentToken = async token => {
  try {
    const response = await requestBackend.get(`/${entity}/requests/validate-token/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error validating consent token:', error);
    throw error;
  }
};

/**
 * Procesar respuestas de consentimiento (público, sin autenticación)
 */
export const submitConsentResponses = async (token, responses) => {
  try {
    const response = await requestBackend.post(
      `/${entity}/requests/process-response/${token}`,
      { responses },
      { headers: { 'Content-Type': 'application/json' } } // Sin autenticación
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting consent responses:', error);
    throw error;
  }
};

/**
 * Obtener estado consolidado de consentimientos
 */
export const getConsentStatus = async (commerceId, clientId) => {
  try {
    return (
      await requestBackend.get(`/${entity}/status/${commerceId}/${clientId}`, await getHeaders())
    ).data;
  } catch (error) {
    console.error('Error getting consent status:', error);
    throw error;
  }
};

/**
 * Obtener métricas agregadas de compliance LGPD
 */
export const getConsentComplianceMetrics = async (commerceId, startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `/${entity}/compliance-metrics/${commerceId}${
      queryString ? `?${queryString}` : ''
    }`;

    return (await requestBackend.get(url, await getHeaders())).data;
  } catch (error) {
    console.error('Error getting compliance metrics:', error);
    throw error;
  }
};

/**
 * Solicitar todos los consentimientos pendientes
 */
export const requestAllPendingConsents = async (commerceId, clientId, timing) => {
  try {
    return (
      await requestBackend.post(
        `/${entity}/requests/request-all`,
        { commerceId, clientId, timing },
        await getHeaders()
      )
    ).data;
  } catch (error) {
    console.error('Error requesting pending consents:', error);
    throw error;
  }
};

/**
 * Obtener consentimientos faltantes
 */
export const getMissingConsents = async (commerceId, clientId) => {
  try {
    return (
      await requestBackend.get(`/${entity}/missing/${commerceId}/${clientId}`, await getHeaders())
    ).data;
  } catch (error) {
    console.error('Error getting missing consents:', error);
    throw error;
  }
};

/**
 * Obtener requisitos de consentimiento de un comercio
 */
export const getConsentRequirements = async commerceId => {
  try {
    return (await requestBackend.get(`/${entity}/requirements/${commerceId}`, await getHeaders()))
      .data;
  } catch (error) {
    console.error('Error getting consent requirements:', error);
    throw error;
  }
};

/**
 * Crear un nuevo requisito de consentimiento
 */
export const createConsentRequirement = async (commerceId, requirement) => {
  try {
    return (
      await requestBackend.post(
        `/${entity}/requirements`,
        { commerceId, requirement },
        await getHeaders()
      )
    ).data;
  } catch (error) {
    console.error('Error creating consent requirement:', error);
    throw error;
  }
};

/**
 * Actualizar un requisito de consentimiento
 */
export const updateConsentRequirement = async (requirementId, body) => {
  try {
    return (
      await requestBackend.patch(
        `/${entity}/requirements/${requirementId}`,
        body,
        await getHeaders()
      )
    ).data;
  } catch (error) {
    console.error('Error updating consent requirement:', error);
    throw error;
  }
};

/**
 * Eliminar un requisito de consentimiento
 */
export const deleteConsentRequirement = async requirementId => {
  try {
    return (
      await requestBackend.delete(`/${entity}/requirements/${requirementId}`, await getHeaders())
    ).data;
  } catch (error) {
    console.error('Error deleting consent requirement:', error);
    throw error;
  }
};

/**
 * Obtener métricas de notificaciones de consentimiento LGPD
 */
export const getConsentNotificationMetrics = async (commerceId, startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `/${entity}/notification-metrics/${commerceId}${
      queryString ? `?${queryString}` : ''
    }`;

    return (await requestBackend.get(url, await getHeaders())).data;
  } catch (error) {
    console.error('Error getting notification metrics:', error);
    throw error;
  }
};

/**
 * Obtener histórico de versões de un requisito
 */
export const getRequirementVersions = async requirementId => {
  try {
    return (
      await requestBackend.get(
        `/${entity}/requirements/${requirementId}/versions`,
        await getHeaders()
      )
    ).data;
  } catch (error) {
    console.error('Error getting requirement versions:', error);
    throw error;
  }
};

/**
 * Obtener una versión específica de un requisito
 */
export const getRequirementVersion = async (requirementId, version) => {
  try {
    return (
      await requestBackend.get(
        `/${entity}/requirements/${requirementId}/versions/${version}`,
        await getHeaders()
      )
    ).data;
  } catch (error) {
    console.error('Error getting requirement version:', error);
    throw error;
  }
};
