/**
 * Unit tests for business.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as businessModule from '@/application/services/business';
import * as administratorModule from '@/application/services/administrator';
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

// Mock administrator service
vi.mock('@/application/services/administrator', () => ({
  addAdministrator: vi.fn(),
}));

describe('Business Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessById', () => {
    it('should fetch a business by ID', async () => {
      const mockBusiness = { id: 'business-123', name: 'Test Business' };
      requestBackend.get.mockResolvedValue({ data: mockBusiness });

      const result = await businessModule.getBusinessById('business-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/business/business-123', await getHeaders());
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('getBusinesses', () => {
    it('should fetch all businesses', async () => {
      const mockBusinesses = [
        { id: '1', name: 'Business 1' },
        { id: '2', name: 'Business 2' },
      ];
      requestBackend.get.mockResolvedValue({ data: mockBusinesses });

      const result = await businessModule.getBusinesses();

      expect(requestBackend.get).toHaveBeenCalledWith('/business/', await getHeaders());
      expect(result).toEqual(mockBusinesses);
    });
  });

  describe('getBusinessByKeyName', () => {
    it('should fetch a business by key name', async () => {
      const mockBusiness = { id: 'business-123', keyName: 'test-key' };
      requestBackend.get.mockResolvedValue({ data: mockBusiness });

      const result = await businessModule.getBusinessByKeyName('test-key');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/business/keyName/test-key',
        await getHeaders()
      );
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('updateBusiness', () => {
    it('should update a business', async () => {
      const businessData = { name: 'Updated Business' };
      const mockUpdated = { id: 'business-123', ...businessData };
      requestBackend.patch.mockResolvedValue({ data: mockUpdated });

      const result = await businessModule.updateBusiness('business-123', businessData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/business/business-123',
        businessData,
        await getHeaders()
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('addBusiness', () => {
    it('should create a new business and administrator', async () => {
      const businessData = {
        name: 'New Business',
        email: 'test@example.com',
      };
      const mockBusiness = { id: 'business-456', ...businessData };
      const mockAdministrator = { id: 'admin-123', businessId: 'business-456' };

      requestBackend.post.mockResolvedValue({ data: mockBusiness });
      administratorModule.addAdministrator.mockResolvedValue(mockAdministrator);

      const result = await businessModule.addBusiness(businessData);

      expect(requestBackend.post).toHaveBeenCalledWith(
        '/business',
        businessData,
        await getHeaders(),
      );
      expect(administratorModule.addAdministrator).toHaveBeenCalledWith({
        name: mockBusiness.name,
        businessId: mockBusiness.id,
        commercesId: [],
        email: mockBusiness.email,
      });
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('WhatsApp Connection Methods', () => {
    it('should request WhatsApp connection', async () => {
      const mockResponse = { status: 'requested' };
      requestBackend.post.mockResolvedValue({ data: mockResponse });

      const result = await businessModule.requestWhatsappConnectionById(
        'business-123',
        'whatsapp-id',
      );

      expect(requestBackend.post).toHaveBeenCalledWith(
        '/business/business-123/resquest/whatsapp-connection/whatsapp-id',
        {},
        await getHeaders()
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return WhatsApp connection', async () => {
      const mockResponse = { status: 'returned' };
      requestBackend.post.mockResolvedValue({ data: mockResponse });

      const result = await businessModule.returnWhatsappConnectionById(
        'business-123',
        'instance-id',
      );

      expect(requestBackend.post).toHaveBeenCalledWith(
        '/business/business-123/return/whatsapp-connection/instance-id',
        {},
        await getHeaders()
      );
      expect(result).toEqual(mockResponse);
    });

    it('should disconnect WhatsApp connection', async () => {
      const mockResponse = { status: 'disconnected' };
      requestBackend.post.mockResolvedValue({ data: mockResponse });

      const result = await businessModule.disconnectWhatsappConnectionById(
        'business-123',
        'instance-id'
      );

      expect(requestBackend.post).toHaveBeenCalledWith(
        '/business/business-123/disconnect/whatsapp-connection/instance-id',
        {},
        await getHeaders()
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get WhatsApp connection status', async () => {
      const mockResponse = { connected: true, instanceId: 'instance-123' };
      requestBackend.get.mockResolvedValue({ data: mockResponse });

      const result = await businessModule.statusWhatsappConnectionById('business-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/business/business-123/whatsapp-connection/status',
        await getHeaders()
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update WhatsApp connection', async () => {
      const commerceData = { whatsappConnection: { connected: true } };
      const mockResponse = { id: 'business-123', ...commerceData };
      requestBackend.patch.mockResolvedValue({ data: mockResponse });

      const result = await businessModule.updateWhatsappConnection('business-123', commerceData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/business/business-123/whatsapp-connection',
        commerceData,
        await getHeaders()
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
