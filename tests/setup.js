/**
 * Test setup file
 * Configures global test environment
 */

import { vi } from 'vitest';

// Mock environment variables
vi.mock('../src/application/firebase', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve('mock-token')),
}));

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    })),
  };
});
