/**
 * Unit tests for attention.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as attentionModule from '@/application/services/attention';
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

describe('Attention Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAttention', () => {
    it('should create a new attention', async () => {
      const body = { queueId: 'queue-123', channel: 'QR' };
      const mockCreated = { id: 'attention-456', ...body };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await attentionModule.createAttention(body);

      expect(requestBackend.post).toHaveBeenCalledWith('/attention', body, await getHeaders());
      expect(result).toEqual(mockCreated);
    });
  });

  describe('getAttentionByDate', () => {
    it('should fetch attentions by queue ID and date', async () => {
      const mockAttentions = [{ id: '1', number: 1 }];
      requestBackend.get.mockResolvedValue({ data: mockAttentions });

      const result = await attentionModule.getAttentionByDate('queue-123', '2024-01-01');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/attention/queue/queue-123/date/2024-01-01',
        await getHeaders()
      );
      expect(result).toEqual(mockAttentions);
    });
  });

  describe('getAttentionDetails', () => {
    it('should fetch attention details by ID', async () => {
      const mockDetails = { id: 'attention-123', number: 1, status: 'PENDING' };
      requestBackend.get.mockResolvedValue({ data: mockDetails });

      const result = await attentionModule.getAttentionDetails('attention-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/attention/details/attention-123',
        await getHeaders()
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('getAttentionById', () => {
    it('should fetch an attention by ID', async () => {
      const mockAttention = { id: 'attention-123', number: 1 };
      requestBackend.get.mockResolvedValue({ data: mockAttention });

      const result = await attentionModule.getAttentionById('attention-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/attention/attention-123',
        await getHeaders()
      );
      expect(result).toEqual(mockAttention);
    });
  });

  describe('finishAttention', () => {
    it('should finish an attention', async () => {
      const body = { rating: 5 };
      const mockFinished = { id: 'attention-123', status: 'TERMINATED' };
      requestBackend.patch.mockResolvedValue({ data: mockFinished });

      const result = await attentionModule.finishAttention('attention-123', body);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/attention/finish/attention-123',
        body,
        await getHeaders()
      );
      expect(result).toEqual(mockFinished);
    });
  });

  describe('cancelAttention', () => {
    it('should cancel an attention', async () => {
      const mockCancelled = { id: 'attention-123', status: 'CANCELLED' };
      requestBackend.patch.mockResolvedValue({ data: mockCancelled });

      const result = await attentionModule.cancelAttention('attention-123');

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/attention/cancel/attention-123',
        {},
        await getHeaders()
      );
      expect(result).toEqual(mockCancelled);
    });
  });

  describe('attend', () => {
    it('should attend to an attention by number', async () => {
      const body = { collaboratorId: 'collab-123' };
      const mockAttended = { id: 'attention-123', status: 'PROCESSING' };
      requestBackend.patch.mockResolvedValue({ data: mockAttended });

      const result = await attentionModule.attend(1, body);

      expect(requestBackend.patch).toHaveBeenCalledWith('/attention/1', body, await getHeaders());
      expect(result).toEqual(mockAttended);
    });
  });

  describe('getPendingCommerceAttentions', () => {
    it('should fetch pending attentions by commerce ID', async () => {
      const mockAttentions = [{ id: '1', status: 'PENDING' }];
      requestBackend.get.mockResolvedValue({ data: mockAttentions });

      const result = await attentionModule.getPendingCommerceAttentions('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/attention/pending/commerce/commerce-123',
        await getHeaders()
      );
      expect(result).toEqual(mockAttentions);
    });
  });
});
