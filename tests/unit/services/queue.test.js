/**
 * Unit tests for queue.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as queueModule from '@/application/services/queue';
import { requestBackend, getHeaders } from '@/application/api';

// Mock the API module
vi.mock('@/application/api', () => ({
  requestBackend: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  getHeaders: vi.fn(() => Promise.resolve({ headers: {} })),
}));

describe('Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQueueByCommerce', () => {
    it('should fetch queues by commerce ID', async () => {
      const mockQueues = [{ id: '1', name: 'Queue 1' }];
      requestBackend.get.mockResolvedValue({ data: mockQueues });

      const result = await queueModule.getQueueByCommerce('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/commerce/commerce-123', await getHeaders());
      expect(result).toEqual(mockQueues);
    });
  });

  describe('getQueueById', () => {
    it('should fetch a queue by ID', async () => {
      const mockQueue = { id: 'queue-123', name: 'Test Queue' };
      requestBackend.get.mockResolvedValue({ data: mockQueue });

      const result = await queueModule.getQueueById('queue-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/queue/queue-123', await getHeaders());
      expect(result).toEqual(mockQueue);
    });
  });

  describe('getQueuesByCommerceId', () => {
    it('should fetch queues by commerce ID', async () => {
      const mockQueues = [
        { id: '1', name: 'Queue 1' },
        { id: '2', name: 'Queue 2' },
      ];
      requestBackend.get.mockResolvedValue({ data: mockQueues });

      const result = await queueModule.getQueuesByCommerceId('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/queue/commerce/commerce-123',
        await getHeaders()
      );
      expect(result).toEqual(mockQueues);
    });
  });

  describe('getGroupedQueueByCommerceId', () => {
    it('should fetch grouped queues by commerce ID', async () => {
      const mockGrouped = { group1: [{ id: '1' }], group2: [{ id: '2' }] };
      requestBackend.get.mockResolvedValue({ data: mockGrouped });

      const result = await queueModule.getGroupedQueueByCommerceId('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/queue/grouped/commerce/commerce-123',
        await getHeaders()
      );
      expect(result).toEqual(mockGrouped);
    });
  });

  describe('updateQueue', () => {
    it('should update a queue', async () => {
      const queueData = { name: 'Updated Queue' };
      const mockUpdated = { id: 'queue-123', ...queueData };
      requestBackend.patch.mockResolvedValue({ data: mockUpdated });

      const result = await queueModule.updateQueue('queue-123', queueData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/queue/queue-123',
        queueData,
        await getHeaders()
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('addQueue', () => {
    it('should create a new queue', async () => {
      const queueData = { name: 'New Queue', commerceId: 'commerce-123' };
      const mockCreated = { id: 'queue-456', ...queueData };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await queueModule.addQueue(queueData);

      expect(requestBackend.post).toHaveBeenCalledWith('/queue', queueData, await getHeaders());
      expect(result).toEqual(mockCreated);
    });
  });
});
