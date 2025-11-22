/**
 * Unit tests for waitlist.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as waitlistModule from '@/application/services/waitlist';
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

describe('Waitlist Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWaitlist', () => {
    it('should create a new waitlist entry', async () => {
      const body = { queueId: 'queue-123', clientId: 'client-123' };
      const mockCreated = { id: 'waitlist-456', ...body };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await waitlistModule.createWaitlist(body);

      expect(requestBackend.post).toHaveBeenCalledWith('/waitlist', body, await getHeaders());
      expect(result).toEqual(mockCreated);
    });
  });

  describe('getWaitlistById', () => {
    it('should fetch a waitlist entry by ID', async () => {
      const mockWaitlist = { id: 'waitlist-123', queueId: 'queue-123' };
      requestBackend.get.mockResolvedValue({ data: mockWaitlist });

      const result = await waitlistModule.getWaitlistById('waitlist-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/waitlist/waitlist-123', await getHeaders());
      expect(result).toEqual(mockWaitlist);
    });
  });

  describe('getWaitlistDetails', () => {
    it('should fetch waitlist details by ID', async () => {
      const mockDetails = { id: 'waitlist-123', queue: {}, commerce: {} };
      requestBackend.get.mockResolvedValue({ data: mockDetails });

      const result = await waitlistModule.getWaitlistDetails('waitlist-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/waitlist/details/waitlist-123',
        await getHeaders()
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('cancelWaitlist', () => {
    it('should cancel a waitlist entry', async () => {
      const mockCancelled = { id: 'waitlist-123', status: 'CANCELLED' };
      requestBackend.patch.mockResolvedValue({ data: mockCancelled });

      const result = await waitlistModule.cancelWaitlist('waitlist-123');

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/waitlist/cancel/waitlist-123',
        {},
        await getHeaders()
      );
      expect(result).toEqual(mockCancelled);
    });
  });
});
