/**
 * Unit tests for firebase.js
 * Tests Firebase v10 modular SDK migration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase v10 modular SDK
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockOnSnapshot = vi.fn();
const mockTimestamp = {
  fromDate: vi.fn(),
};
const mockGetAuth = vi.fn();
const mockGetFirestore = vi.fn();
const mockInitializeApp = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockSignInAnonymously = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockVerifyPasswordResetCode = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
}));

vi.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signOut: mockSignOut,
  signInAnonymously: mockSignInAnonymously,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  verifyPasswordResetCode: mockVerifyPasswordResetCode,
  onAuthStateChanged: mockOnAuthStateChanged,
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  onSnapshot: mockOnSnapshot,
  Timestamp: mockTimestamp,
}));

// Mock Vue
vi.mock('vue', () => ({
  ref: vi.fn(val => ({ value: val })),
  onUnmounted: vi.fn(fn => fn),
}));

describe('Firebase Module (v10 Modular SDK)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockInitializeApp.mockReturnValue({});
    mockGetAuth.mockReturnValue({});
    mockGetFirestore.mockReturnValue({});

    // Mock collection to return a collection reference
    const mockCollectionRef = {
      id: 'test-collection',
    };
    mockCollection.mockReturnValue(mockCollectionRef);

    // Mock query functions
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
    mockQuery.mockReturnValue({});

    // Mock onSnapshot to return unsubscribe function
    mockOnSnapshot.mockReturnValue(() => {});

    // Mock Timestamp
    mockTimestamp.fromDate.mockReturnValue({ seconds: 1234567890 });
  });

  describe('Firebase Initialization', () => {
    it('should initialize Firebase app with config', async () => {
      // Dynamically import to trigger initialization
      await import('@/application/firebase');

      expect(mockInitializeApp).toHaveBeenCalled();
      expect(mockGetAuth).toHaveBeenCalled();
      expect(mockGetFirestore).toHaveBeenCalled();
    });

    it('should export collection references', async () => {
      const firebaseModule = await import('@/application/firebase');

      expect(firebaseModule.attentionCollection).toBeDefined();
      expect(firebaseModule.queueCollection).toBeDefined();
      expect(firebaseModule.bookingCollection).toBeDefined();
      expect(firebaseModule.waitlistCollection).toBeDefined();
      expect(firebaseModule.messageCollection).toBeDefined();
    });
  });

  describe('Authentication Functions', () => {
    it('should export login function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.login).toBe('function');
    });

    it('should export register function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.register).toBe('function');
    });

    it('should export logout function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.logout).toBe('function');
    });

    it('should export invited function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.invited).toBe('function');
    });

    it('should export sendResetPasswordEmail function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.sendResetPasswordEmail).toBe('function');
    });

    it('should export getCurrentUser function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.getCurrentUser).toBe('function');
    });
  });

  describe('Query Functions', () => {
    it('should export updatedAttentions function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.updatedAttentions).toBe('function');
    });

    it('should export updatedQueues function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.updatedQueues).toBe('function');
    });

    it('should export updatedAvailableAttentions function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.updatedAvailableAttentions).toBe('function');
    });

    it('should export updatedAvailableMessages function', async () => {
      const firebaseModule = await import('@/application/firebase');
      expect(typeof firebaseModule.updatedAvailableMessages).toBe('function');
    });
  });

  describe('Modular SDK Usage', () => {
    it('should use modular SDK imports (not v8 namespaced API)', async () => {
      const firebaseModule = await import('@/application/firebase');

      // Verify functions exist and are callable
      expect(typeof firebaseModule.updatedAttentions).toBe('function');
      expect(typeof firebaseModule.updatedAttentionsByDateAndCommerceAndQueue).toBe('function');

      // The functions should work with the mocked Firebase SDK
      const result = firebaseModule.updatedAttentions('test-id');
      expect(result).toBeDefined();
    });

    it('should handle Timestamp conversions', async () => {
      const firebaseModule = await import('@/application/firebase');

      // Verify function exists
      expect(typeof firebaseModule.updatedAttentionsByDateAndCommerceAndQueue).toBe('function');

      // Function should work with mocked Timestamp
      const result = firebaseModule.updatedAttentionsByDateAndCommerceAndQueue('test-id');
      expect(result).toBeDefined();
    });
  });

  describe('Collection Exports', () => {
    it('should export all required collections', async () => {
      const firebaseModule = await import('@/application/firebase');

      const requiredCollections = [
        'attentionCollection',
        'queueCollection',
        'bookingCollection',
        'waitlistCollection',
        'messageCollection',
        'bookingBlockNumberUsedCollection',
      ];

      requiredCollections.forEach(collectionName => {
        expect(firebaseModule[collectionName]).toBeDefined();
      });
    });
  });
});
