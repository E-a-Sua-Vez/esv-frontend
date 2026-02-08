import { requestBackend, requestQuery, requestEvent, getHeaders } from '../api';
import qs from 'qs';

const entity = 'business-lead';
const queryEntity = 'business-leads';

// Backend API calls (write operations - Firebase)

export const createBusinessLead = async body => {
  const createdLead = (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
  return createdLead;
};

export const getBusinessLeadByIdFromBackend = async id => {
  const { headers } = await getHeaders();
  return (await requestBackend.get(`/${entity}/${id}`, { headers })).data;
};

export const getBusinessLeadsByStageFromBackend = async (
  stage,
  businessId,
  commerceId,
  collaboratorId,
  userId
) => {
  const options = {};
  options.params = {
    stage,
    _t: Date.now(),
  };

  if (businessId !== undefined && businessId !== null) {
    options.params.businessId = businessId;
  }
  if (commerceId !== undefined && commerceId !== null) {
    options.params.commerceId = commerceId;
  }
  if (collaboratorId !== undefined && collaboratorId !== null) {
    options.params.collaboratorId = collaboratorId;
  }
  if (userId !== undefined && userId !== null) {
    options.params.userId = userId;
  }

  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestBackend.get(`/${entity}/stage/${stage}`, options)).data;
};

export const updateBusinessLeadStage = async (id, stage, status) =>
  (await requestBackend.put(`/${entity}/${id}/stage`, { stage, status }, await getHeaders())).data;

export const updateBusinessLead = async (id, updates) =>
  (await requestBackend.put(`/${entity}/${id}`, updates, await getHeaders())).data;

export const addBusinessLeadContact = async (id, body) => {
  if (!id) {
    throw new Error('Business Lead ID is required');
  }
  if (!body || !body.type || !body.result || !body.comment) {
    throw new Error('Contact data is incomplete. Type, result, and comment are required.');
  }

  try {
    const response = await requestBackend.post(
      `/${entity}/${id}/contact`,
      body,
      await getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('addBusinessLeadContact - Error:', error);
    throw error;
  }
};

export const convertBusinessLeadToClient = async (id, conversionData = {}) => {
  try {
    const response = await requestBackend.post(
      `/${entity}/${id}/convert`,
      conversionData,
      await getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('convertBusinessLeadToClient - Error:', error);
    throw error;
  }
};

export const getBusinessLeadContactsFromBackend = async leadId => {
  const { headers } = await getHeaders();
  return (await requestBackend.get(`/${entity}/${leadId}/contacts`, { headers })).data;
};

// Query Stack API calls (read operations - PostgreSQL)

export const getBusinessLeads = async (filters = {}) => {
  const options = {};
  options.params = {
    ...filters,
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(queryEntity, options)).data;
};

export const getBusinessLeadsByStage = async (
  stage,
  businessId,
  commerceId,
  collaboratorId,
  userId,
) => {
  const options = {};
  options.params = {
    pipelineStage: stage,
    _t: Date.now(),
  };

  if (businessId) {
    options.params.businessId = businessId;
  }
  if (commerceId) {
    options.params.commerceId = commerceId;
  }
  if (collaboratorId) {
    options.params.assignedToCollaboratorId = collaboratorId;
  }
  if (userId) {
    options.params.assignedToUserId = userId;
  }

  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(queryEntity, options)).data;
};

export const getBusinessLeadById = async id => {
  const options = {};
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`${queryEntity}/${id}`, options)).data;
};

export const getBusinessLeadContacts = async leadId => {
  const options = {};
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`${queryEntity}/${leadId}/contacts`, options)).data;
};

export const getBusinessLeadAnalytics = async (filters = {}) => {
  const options = {};
  options.params = {
    ...filters,
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`${queryEntity}/analytics`, options)).data;
};

// Get business lead transitions/history from event store
export const getBusinessLeadTransitions = async leadId => {
  const eventURL = import.meta.env.VITE_EVENT_URL;
  if (!eventURL) {
    return [];
  }

  try {
    const { headers } = await getHeaders();
    let allEvents = [];

    try {
      const allEventsResponse = await requestEvent.get(`/events/aggregate/${leadId}`, {
        headers,
        timeout: 5000,
      });
      allEvents = allEventsResponse.data?.data || [];
    } catch (allEventsError) {
      const is404 = allEventsError.response?.status === 404 || allEventsError.status === 404;
      if (
        allEventsError.code === 'ERR_NETWORK' ||
        allEventsError.code === 'ECONNABORTED' ||
        is404
      ) {
        return [];
      }

      try {
        const statusChangedResponse = await requestEvent.get(
          `/events/aggregate/${leadId}?type=ett.business-lead.1.event.status-changed`,
          { headers, timeout: 5000 }
        );
        allEvents = statusChangedResponse.data?.data || [];
      } catch (statusError) {
        const isFallback404 = statusError.response?.status === 404 || statusError.status === 404;
        if (
          isFallback404 ||
          statusError.code === 'ERR_NETWORK' ||
          statusError.code === 'ECONNABORTED'
        ) {
          return [];
        }
        return [];
      }
    }

    const transitions = allEvents
      .map(event => {
        const eventData = event.attributes || event;
        const eventType = eventData.type || event.type || '';

        const dataAttrs = eventData.data?.attributes || eventData.data || {};
        const attrs = dataAttrs.attributes || dataAttrs || eventData.attributes || eventData || {};
        const metadata = eventData.metadata || event.metadata || {};

        if (
          eventType.includes('business-lead.created') ||
          eventType.includes('BusinessLeadCreated')
        ) {
          return {
            id: event.id || eventData.id,
            oldStage: null,
            newStage: attrs.pipelineStage || attrs.stage || 'NEW',
            status: attrs.status || null,
            userId: attrs.userId || attrs.assignedToUserId || metadata.userId || null,
            collaboratorId: attrs.assignedToCollaboratorId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: true,
            eventType: 'created',
          };
        }

        if (eventType.includes('status-changed') || eventType.includes('StatusChanged')) {
          return {
            id: event.id || eventData.id,
            oldStage: attrs.oldStage || dataAttrs.oldStage || null,
            newStage: attrs.newStage || dataAttrs.newStage || attrs.stage || null,
            status: attrs.status || dataAttrs.status || null,
            userId: attrs.userId || dataAttrs.userId || metadata.userId || null,
            collaboratorId: attrs.collaboratorId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: false,
            eventType: 'status-changed',
          };
        }

        if (eventType.includes('contact.added') || eventType.includes('ContactAdded')) {
          const contactType = attrs.type || dataAttrs.type || 'CONTACT';
          const contactResult = attrs.result || dataAttrs.result || null;
          const contactComment = attrs.comment || dataAttrs.comment || '';

          return {
            id: event.id || eventData.id,
            oldStage: null,
            newStage: null,
            status: contactResult,
            userId: attrs.userId || dataAttrs.userId || metadata.userId || null,
            collaboratorId: attrs.collaboratorId || dataAttrs.collaboratorId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: false,
            isContact: true,
            contactType,
            contactComment,
            eventType: 'contact-added',
          };
        }

        if (eventType.includes('converted') || eventType.includes('Converted')) {
          return {
            id: event.id || eventData.id,
            oldStage: null,
            newStage: null,
            status: 'SUCCESS',
            userId: attrs.convertedByUserId || attrs.userId || metadata.userId || null,
            collaboratorId: attrs.collaboratorId || null,
            clientId: attrs.convertedToClientId || attrs.clientId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: false,
            isConverted: true,
            eventType: 'converted',
          };
        }

        return null;
      })
      .filter(t => t !== null)
      .sort((a, b) => {
        const dateA = new Date(a.occurredOn || a.createdAt);
        const dateB = new Date(b.occurredOn || b.createdAt);
        return dateA - dateB;
      });

    return transitions;
  } catch (error) {
    const is404 = error.response?.status === 404 || error.status === 404;
    const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';

    if (is404 || isNetworkError) {
      return [];
    }

    if (import.meta.env.DEV) {
      console.debug(
        'getBusinessLeadTransitions: Error fetching transitions (non-critical):',
        error.message,
      );
    }

    return [];
  }
};
