/**
 * Unit tests for collaborator.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as collaboratorModule from '@/application/services/collaborator';
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

// Mock the store
vi.mock('@/stores/index', () => ({
  globalStore: vi.fn(() => ({
    setCurrentPermissions: vi.fn(() => Promise.resolve()),
  })),
}));

describe('Collaborator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCollaboratorByEmail', () => {
    it('should fetch a collaborator by email', async () => {
      const mockCollaborator = { id: 'collab-123', email: 'test@example.com' };
      requestBackend.get.mockResolvedValue({ data: mockCollaborator });

      const result = await collaboratorModule.getCollaboratorByEmail('test@example.com');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/collaborator/email/test@example.com',
        await getHeaders()
      );
      expect(result).toEqual(mockCollaborator);
    });
  });

  describe('getCollaboratorById', () => {
    it('should fetch a collaborator by ID', async () => {
      const mockCollaborator = { id: 'collab-123', name: 'Test Collaborator' };
      requestBackend.get.mockResolvedValue({ data: mockCollaborator });

      const result = await collaboratorModule.getCollaboratorById('collab-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/collaborator/collab-123',
        await getHeaders()
      );
      expect(result).toEqual(mockCollaborator);
    });
  });

  describe('getCollaboratorDetailsById', () => {
    it('should fetch collaborator details by ID', async () => {
      const mockDetails = { id: 'collab-123', permissions: [] };
      requestBackend.get.mockResolvedValue({ data: mockDetails });

      const result = await collaboratorModule.getCollaboratorDetailsById('collab-123');

      expect(requestBackend.get).toHaveBeenCalledWith(
        '/collaborator/details/collab-123',
        await getHeaders()
      );
      expect(result).toEqual(mockDetails);
    });
  });

  describe('updateCollaborator', () => {
    it('should update a collaborator', async () => {
      const collaboratorData = { name: 'Updated Collaborator' };
      const mockUpdated = { id: 'collab-123', ...collaboratorData };
      requestBackend.patch.mockResolvedValue({ data: mockUpdated });

      const result = await collaboratorModule.updateCollaborator('collab-123', collaboratorData);

      expect(requestBackend.patch).toHaveBeenCalledWith(
        '/collaborator/collab-123',
        collaboratorData,
        await getHeaders()
      );
      expect(result).toEqual(mockUpdated);
    });
  });
});
