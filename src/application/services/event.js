import { requestEvent } from '../api';
import { handleApiError } from '../errorHandler';

export const createEvent = async event => {
  try {
    const payload = {
      data: {
        type: 'events',
        attributes: {
          aggregateId: event.data.attributes.id,
          aggregateVersion: 1,
          type: event.data.type,
          data: event.data.attributes,
          metadata: event.metadata,
        },
      },
    };
    await requestEvent.post('/events', payload);
  } catch (error) {
    // Handle errors gracefully - don't break UI when event creation fails
    // This is especially important for public routes where event store might not be accessible
    const errorInfo = handleApiError(error, 'Event API');

    // Log error in development for debugging
    if (import.meta.env.DEV) {
      console.warn('[createEvent] Failed to create event:', errorInfo);
    }

    // Silently fail for specific error codes that shouldn't break the UI
    // 405 = Method Not Allowed (endpoint might not support POST from public routes)
    // 401 = Unauthorized (user might not have permission for events)
    // 403 = Forbidden (access denied)
    if ([401, 403, 405].includes(errorInfo.status)) {
      // Silently fail - don't throw error to prevent UI breakage
      return;
    }

    // For other errors, still fail silently but log for monitoring
    // Event creation is non-critical functionality
    return;
  }
};
