/**
 * Test setup file
 * Configures global test environment
 */

import { vi } from 'vitest';

// Mock Firebase v10 modular SDK
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  signInAnonymously: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, _callback) =>
    // Return unsubscribe function
    () => {}
  ),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => ({ id: 'mock-collection' })),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: 'orderBy', field, direction })),
  onSnapshot: vi.fn(() => () => {}), // Returns unsubscribe function
  Timestamp: {
    fromDate: vi.fn(() => ({ seconds: 1234567890 })),
  },
}));

// Mock environment variables for Firebase config
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test-auth-domain';
process.env.VITE_FIREBASE_DATABASE_URL = 'test-database-url';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project-id';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'test-storage-bucket';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = 'test-sender-id';
process.env.VITE_FIREBASE_APP_ID = 'test-app-id';
process.env.VITE_FIREBASE_MEASUREMENT_ID = 'test-measurement-id';

// Mock getCurrentUser for backward compatibility
vi.mock('../src/application/firebase', async () => {
  const actual = await vi.importActual('../src/application/firebase');
  return {
    ...actual,
    getCurrentUser: vi.fn(() => Promise.resolve('mock-token')),
  };
});

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
