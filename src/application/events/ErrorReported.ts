import DomainEvent from '../../shared/events/domain-event';
import { DomainEventDataAttributes } from '../../shared/events/domain-event-data-attributes';
import { DefaultEventMetadata } from '../../shared/events/default-event-metadata';
import { v4 as uuidv4 } from 'uuid';

export default class ErrorReported extends DomainEvent {
  constructor(occuredOn: Date, attributes: object, metadata?: object) {
    super('ett.error.1.event.error.reported', occuredOn);
    this.data.attributes = attributes as DomainEventDataAttributes;
    this.data.attributes.id = uuidv4().toString();
    if (metadata) {
      this.metadata = metadata;
    } else {
      this.metadata = new DefaultEventMetadata();
    }
  }
}
