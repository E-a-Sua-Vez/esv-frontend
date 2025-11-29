/**
 * Unit tests for user.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userModule from '@/application/services/user';
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

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should fetch a user by ID', async () => {
      const mockUser = { id: 'user-123', name: 'Test User' };
      requestBackend.get.mockResolvedValue({ data: mockUser });

      const result = await userModule.getUserById('user-123');

      expect(requestBackend.get).toHaveBeenCalledWith('/user/user-123', await getHeaders());
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = { name: 'New User', email: 'new@example.com' };
      const mockCreated = { id: 'user-456', ...userData };
      requestBackend.post.mockResolvedValue({ data: mockCreated });

      const result = await userModule.createUser(userData);

      expect(requestBackend.post).toHaveBeenCalledWith('/user', userData, await getHeaders());
      expect(result).toEqual(mockCreated);
    });
  });
});
