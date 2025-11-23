/**
 * Unit tests for service.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as serviceModule from '@/application/services/service';
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

describe('Service Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getServiceByCommerce', () => {
    it('should fetch services by commerce ID', async () => {
      const mockServices = [{ id: '1', name: 'Service 1' }];
      requestBackend.get.mockResolvedValue({ data: mockServices });

      const result = await serviceModule.getServiceByCommerce('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/service/commerce/commerce-123',
        await getHeaders()
      );
      expect(result).toEqual(mockServices);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Network error');
      requestBackend.get.mockRejectedValue(error);

      await expect(serviceModule.getServiceByCommerce('commerce-123')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getServiceById', () => {
    it('should fetch a service by ID', async () => {
      const mockService = { id: 'service-123', name: 'Test Service' };
      requestBackend.get.mockResolvedValue({ data: mockService });

      const result = await serviceModule.getServiceById('service-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/service/service-123', await getHeaders());
      expect(result).toEqual(mockService);
    });
  });

  describe('getServicesById', () => {
    it('should fetch multiple services by IDs', async () => {
      const mockServices = [
        { id: '1', name: 'Service 1' },
        { id: '2', name: 'Service 2' },
      ];
      requestBackend.get.mockResolvedValue({ data: mockServices });

      const result = await serviceModule.getServicesById(['1', '2']);

      // Note: The actual endpoint format may vary - adjust based on backend implementation
      expect(requestBackend.get).toHaveBeenCalledWith(
        expect.stringContaining('/service/list/'),
        await getHeaders()
      );
      expect(result).toEqual(mockServices);
    });

    it('should return undefined if no IDs provided', async () => {
      const result = await serviceModule.getServicesById([]);
      expect(result).toBeUndefined();
      expect(requestBackend.get).not.toHaveBeenCalled();
    });

    it('should return undefined if IDs is null', async () => {
      const result = await serviceModule.getServicesById(null);
      expect(result).toBeUndefined();
      expect(requestBackend.get).not.toHaveBeenCalled();
    });
  });

  describe('updateService', () => {
    it('should update a service', async () => {
      const serviceData = { name: 'Updated Service' };
      const mockUpdated = { id: 'service-123', ...serviceData };
      requestBackend.patch.mockResolvedValue({ data: mockUpdated });

      const result = await serviceModule.updateService('service-123', serviceData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/service/service-123',
        serviceData,
        await getHeaders()
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('addService', () => {
    it('should create a new service', async () => {
      const serviceData = { name: 'New Service' };
      const mockCreated = { id: 'service-456', ...serviceData };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await serviceModule.addService(serviceData);

      expect(requestBackend.post).toHaveBeenCalledWith('/service', serviceData, await getHeaders());
      expect(result).toEqual(mockCreated);
    });
  });

  describe('getActiveServicesByCommerceId', () => {
    it('should fetch active services by commerce ID', async () => {
      const mockServices = [{ id: '1', name: 'Active Service', active: true }];
      requestBackend.get.mockResolvedValue({ data: mockServices });

      const result = await serviceModule.getActiveServicesByCommerceId('commerce-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/service/commerceId/commerce-123/active',
        await getHeaders()
      );
      expect(result).toEqual(mockServices);
    });
  });
});
