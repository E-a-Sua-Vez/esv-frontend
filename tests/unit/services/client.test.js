/**
 * Unit tests for client.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clientModule from '@/application/services/client';
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

describe('Client Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientById', () => {
    it('should fetch a client by ID', async () => {
      const mockClient = { id: 'client-123', name: 'Test Client' };
      requestBackend.get.mockResolvedValue({ data: mockClient });

      const result = await clientModule.getClientById('client-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/client/client-123', await getHeaders());
      expect(result).toEqual(mockClient);
    });
  });

  describe('searchClientByIdNumber', () => {
    it('should search for a client by ID number', async () => {
      const mockClient = { id: 'client-123', idNumber: '12345678' };
      requestBackend.get.mockResolvedValue({ data: mockClient });

      const result = await clientModule.searchClientByIdNumber('commerce-123', '12345678');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/client/search/commerceId/commerce-123/idNumber/12345678',
        await getHeaders()
      );
      expect(result).toEqual(mockClient);
    });
  });

  describe('updateClient', () => {
    it('should update a client', async () => {
      const clientData = { name: 'Updated Client', email: 'updated@example.com' };
      const mockUpdated = { id: 'client-123', ...clientData };
      requestBackend.patch.mockResolvedValue({ data: mockUpdated });

      const result = await clientModule.updateClient('client-123', clientData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/client/client-123',
        clientData,
        await getHeaders()
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('contactClient', () => {
    it('should contact a client', async () => {
      const body = { message: 'Test message', channel: 'EMAIL' };
      const mockResponse = { success: true, messageId: 'msg-123' };
      requestBackend.post.mockResolvedValue({ data: mockResponse });

      const result = await clientModule.contactClient('client-123', body);

      expect(requestBackend.post).toHaveBeenCalledWith(
        '/client/contact/client-123',
        body,
        await getHeaders()
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
