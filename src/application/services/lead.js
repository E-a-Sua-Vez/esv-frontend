import { requestBackend, requestQuery, requestEvent, getHeaders } from '../api';
import qs from 'qs';

const entity = 'lead';

// Backend API calls (write operations)
export const createLeadFromContactForm = async body => {
  const createdLead = (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
  // Return the lead immediately from Firebase (write model)
  // This ensures the lead appears in the UI right away, before it's processed by the event consumer
  return createdLead;
};

// Get lead from backend (Firebase - write model) for immediate display
export const getLeadByIdFromBackend = async id => {
  const { headers } = await getHeaders();
  return (await requestBackend.get(`/${entity}/${id}`, { headers })).data;
};

// Get leads by stage from backend (Firebase - write model) for immediate display
export const getLeadsByStageFromBackend = async (stage, userId, businessId, commerceId) => {
  const options = {};
  options.params = {
    stage,
    _t: Date.now(),
  };
  if (userId) {
    options.params.userId = userId;
  }
  if (businessId) {
    options.params.businessId = businessId;
  }
  if (commerceId) {
    options.params.commerceId = commerceId;
  }
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestBackend.get(`/${entity}/stage/${stage}`, options)).data;
};

export const updateLeadStage = async (id, stage, status) =>
  (await requestBackend.put(`/${entity}/${id}/stage`, { stage, status }, await getHeaders())).data;

export const updateLead = async (id, updates) =>
  (await requestBackend.put(`/${entity}/${id}`, updates, await getHeaders())).data;

export const addLeadContact = async (id, body) => {
  if (!id) {
    throw new Error('Lead ID is required');
  }
  if (!body || !body.type || !body.result || !body.comment) {
    throw new Error('Contact data is incomplete. Type, result, and comment are required.');
  }

  try {
    console.log('addLeadContact - Request:', {
      url: `/${entity}/${id}/contact`,
      body: body
    });

    const response = await requestBackend.post(`/${entity}/${id}/contact`, body, await getHeaders());

    console.log('addLeadContact - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('addLeadContact - Error:', error);
    console.error('addLeadContact - Error details:', {
      message: error.message,
      response: error.response,
      request: error.request,
      config: error.config
    });
    throw error;
  }
};

// Query Stack API calls (read operations)
export const getLeads = async (filters = {}) => {
  const options = {};
  options.params = {
    ...filters,
    _t: Date.now(), // Prevent cache
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('leads', options)).data;
};

export const getLeadsByStage = async (stage, userId, businessId, commerceId) => {
  const options = {};
  options.params = {
    stage,
    _t: Date.now(),
  };
  // Only add assignedToUserId if userId is provided (not for master users)
  if (userId) {
    options.params.assignedToUserId = userId;
  }
  // Only add businessId and commerceId if provided
  if (businessId) {
    options.params.businessId = businessId;
  }
  if (commerceId) {
    options.params.commerceId = commerceId;
  }
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`leads/stage/${stage}`, options)).data;
};

export const getLeadById = async id => {
  const options = {};
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`leads/${id}`, options)).data;
};

// Get contacts from query stack (PostgreSQL - read model)
export const getLeadContacts = async leadId => {
  const options = {};
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`leads/${leadId}/contacts`, options)).data;
};

// Get contacts from backend (Firebase - write model) for immediate display
export const getLeadContactsFromBackend = async leadId => {
  const { headers } = await getHeaders();
  return (await requestBackend.get(`/lead/${leadId}/contacts`, { headers })).data;
};

// Get lead transitions/history from event store
// This is a nice-to-have feature - fails silently if event store is not available
export const getLeadTransitions = async leadId => {
  // Check if event store URL is configured
  const eventURL = import.meta.env.VITE_EVENT_URL;
  if (!eventURL) {
    // Event store not configured, return empty array silently
    return [];
  }

  try {
    const { headers } = await getHeaders();

    // Try to get all events for this lead (not just status-changed)
    // This ensures we get LeadCreated events and any other relevant events
    let allEvents = [];

    try {
      // First, try to get all events for this aggregate
      const allEventsResponse = await requestEvent.get(
        `/events/aggregate/${leadId}`,
        { headers, timeout: 5000 } // Short timeout to fail fast
      );
      allEvents = allEventsResponse.data?.data || [];
    } catch (allEventsError) {
      // Network errors or timeouts - fail silently, don't try fallback
      if (allEventsError.code === 'ERR_NETWORK' || allEventsError.code === 'ECONNABORTED') {
        // Event store not available - return empty array silently
        return [];
      }

      // For other errors, try fallback
      try {
        const statusChangedResponse = await requestEvent.get(
          `/events/aggregate/${leadId}?type=ett.lead.1.event.lead.status-changed`,
          { headers, timeout: 5000 }
        );
        allEvents = statusChangedResponse.data?.data || [];
      } catch (statusError) {
        // Fail silently - event store not available
        return [];
      }
    }

    // Extract and format transitions from events
    const transitions = allEvents
      .map(event => {
        // Handle different event structures - the response has events in data[].attributes
        const eventData = event.attributes || event;
        const eventType = eventData.type || event.type || '';

        // Extract attributes from nested structure: event.attributes.data.attributes or event.attributes.data
        const dataAttrs = eventData.data?.attributes || eventData.data || {};
        const attrs = dataAttrs.attributes || dataAttrs || eventData.attributes || eventData || {};
        const metadata = eventData.metadata || event.metadata || {};

        // For LeadCreated events, extract initial stage
        if (eventType.includes('lead.created') || eventType.includes('LeadCreated')) {
          return {
            id: event.id || eventData.id,
            oldStage: null,
            newStage: attrs.pipelineStage || attrs.stage || 'NEW',
            status: attrs.status || null,
            userId: attrs.userId || attrs.assignedToUserId || metadata.userId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: true,
            eventType: 'created',
          };
        }

        // For LeadStatusChanged events
        if (eventType.includes('status-changed') || eventType.includes('StatusChanged')) {
          return {
            id: event.id || eventData.id,
            oldStage: attrs.oldStage || dataAttrs.oldStage || null,
            newStage: attrs.newStage || dataAttrs.newStage || attrs.stage || null,
            status: attrs.status || dataAttrs.status || null,
            userId: attrs.userId || dataAttrs.userId || metadata.userId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: false,
            eventType: 'status-changed',
          };
        }

        // For LeadContactAdded events - show as a transition note
        if (eventType.includes('lead-contact.added') || eventType.includes('ContactAdded')) {
          // Extract contact info
          const contactType = attrs.type || dataAttrs.type || 'CONTACT';
          const contactResult = attrs.result || dataAttrs.result || null;
          const contactComment = attrs.comment || dataAttrs.comment || '';

          // Try to get the current stage from the lead data if available
          // For contact events, we don't change stage, but we record the contact
          return {
            id: event.id || eventData.id,
            oldStage: null, // Contact doesn't change stage
            newStage: null, // Contact doesn't change stage
            status: contactResult,
            userId: attrs.userId || dataAttrs.userId || metadata.userId || null,
            occurredOn: eventData.occurredOn || eventData.createdAt || new Date(),
            createdAt: eventData.createdAt || new Date(),
            isInitial: false,
            isContact: true,
            contactType: contactType,
            contactComment: contactComment,
            eventType: 'contact-added',
          };
        }

        return null;
      })
      .filter(t => t !== null) // Only include valid transitions
      .sort((a, b) => {
        // Sort by occurredOn ascending (oldest first) for chronological timeline display
        const dateA = new Date(a.occurredOn || a.createdAt);
        const dateB = new Date(b.occurredOn || b.createdAt);
        return dateA - dateB; // Oldest first (ascending chronological order)
      });

    return transitions;
  } catch (error) {
    // Fail silently - transitions are a nice-to-have feature
    // Don't log errors or break the UI if event store is unavailable
    return [];
  }
};

