/**
 * Unit tests for commerce.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as commerceModule from '@/application/services/commerce';
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

describe('Commerce Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommerceById', () => {
    it('should fetch a commerce by ID', async () => {
      const mockCommerce = { id: 'commerce-123', name: 'Test Commerce' };
      requestBackend.get.mockResolvedValue({ data: mockCommerce });

      const result = await commerceModule.getCommerceById('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/commerce/commerce-123', await getHeaders());
      expect(result).toEqual(mockCommerce);
    });
  });

  describe('getCommerceByKeyName', () => {
    it('should fetch a commerce by key name', async () => {
      const mockCommerce = { id: 'commerce-123', keyName: 'test-key' };
      requestBackend.get.mockResolvedValue({ data: mockCommerce });

      const result = await commerceModule.getCommerceByKeyName('test-key');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/commerce/keyName/test-key',
        await getHeaders()
      );
      expect(result).toEqual(mockCommerce);
    });
  });

  describe('getCommercesByBusinessId', () => {
    it('should fetch commerces by business ID', async () => {
      const mockCommerces = [
        { id: '1', name: 'Commerce 1' },
        { id: '2', name: 'Commerce 2' },
      ];
      requestBackend.get.mockResolvedValue({ data: mockCommerces });

      const result = await commerceModule.getCommercesByBusinessId('business-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/commerce/businessId/business-123',
        await getHeaders()
      );
      expect(result).toEqual(mockCommerces);
    });
  });

  describe('getActiveCommercesByBusinessId', () => {
    it('should fetch active commerces by business ID', async () => {
      const mockCommerces = [{ id: '1', name: 'Active Commerce', active: true }];
      requestBackend.get.mockResolvedValue({ data: mockCommerces });

      const result = await commerceModule.getActiveCommercesByBusinessId('business-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/commerce/businessId/business-123/active',
        await getHeaders()
      );
      expect(result).toEqual(mockCommerces);
    });
  });

  describe('updateCommerce', () => {
    it('should update a commerce', async () => {
      const commerceData = { name: 'Updated Commerce' };
      const mockUpdated = { id: 'commerce-123', ...commerceData };
      requestBackend.patch.mockResolvedValue({ data: mockUpdated });

      const result = await commerceModule.updateCommerce('commerce-123', commerceData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/commerce/commerce-123',
        commerceData,
        await getHeaders()
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('addCommerce', () => {
    it('should create a new commerce', async () => {
      const commerceData = { name: 'New Commerce', businessId: 'business-123' };
      const mockCreated = { id: 'commerce-456', ...commerceData };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await commerceModule.addCommerce(commerceData);

      expect(requestBackend.post).toHaveBeenCalledWith(
        '/commerce',
        commerceData,
        await getHeaders(),
      );
      expect(result).toEqual(mockCreated);
    });
  });
});
