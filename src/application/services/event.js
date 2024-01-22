import { requestEvent } from '../api';

export const createEvent = async (event) => {
    const payload = {
        data: {
            type: 'events',
            attributes: {
            aggregateId: event.data.attributes.id,
            aggregateVersion: 1,
            type: event.data.type,
            data: event.data.attributes,
            metadata: event.metadata
            }
        }
    };
    await requestEvent.post('/events', payload);
}
