import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

import { ref, onUnmounted, getCurrentInstance } from 'vue';
import { ATTENTION_STATUS } from '../shared/constants';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
// Initialize Firebase Authentication and get a reference to the service

const firestore = getFirestore(app);
export const db = firestore; // Export for use in other modules
export const attentionCollection = collection(firestore, 'attention');
export const queueCollection = collection(firestore, 'queue');
export const bookingCollection = collection(firestore, 'booking');
export const waitlistCollection = collection(firestore, 'waitlist');
export const messageCollection = collection(firestore, 'message');
export const bookingBlockNumberUsedCollection = collection(firestore, 'booking-block-number-used');

// Helper function to safely register onUnmounted only if in component context
function safeOnUnmounted(callback) {
  const instance = getCurrentInstance();
  if (instance) {
    onUnmounted(callback);
  }
}

export function updatedAttentions(attentionId) {
  const attentions = ref([]);
  const attentionQuery = query(attentionCollection, where('id', '==', attentionId));
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
        processedAt: data.processedAt
          ? data.processedAt.toDate
            ? data.processedAt.toDate()
            : new Date(data.processedAt)
          : undefined,
        endAt: data.endAt
          ? data.endAt.toDate
            ? data.endAt.toDate()
            : new Date(data.endAt)
          : undefined,
      };
    });
  });
  safeOnUnmounted(unsubscribe);
  // Add unsubscribe for manual cleanup
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedQueues(queueId) {
  const queues = ref([]);
  const queueQuery = query(queueCollection, where('id', '==', queueId));
  const unsubscribe = onSnapshot(queueQuery, snapshot => {
    queues.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
  safeOnUnmounted(unsubscribe);
  return queues;
}

export function updatedAvailableAttentions(queueId) {
  const attentions = ref([]);
  // Filter to only get attentions from the last 7 days (starting from 7 days ago)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(sevenDaysAgo);

  // Query for PENDING attentions from last 7 days
  const pendingQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('status', '==', 'PENDING'),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );

  // Query for CONFIRMED attentions from last 7 days
  const confirmedQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('status', '==', 'CONFIRMED'),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );

  let pendingDocs = [];
  let confirmedDocs = [];

  const updateAttentions = () => {
    // Combine results from both queries
    const allDocs = [...pendingDocs, ...confirmedDocs];
    attentions.value = allDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  };

  const unsubscribePending = onSnapshot(pendingQuery, snapshot => {
    pendingDocs = snapshot.docs;
    updateAttentions();
  });

  const unsubscribeConfirmed = onSnapshot(confirmedQuery, snapshot => {
    confirmedDocs = snapshot.docs;
    updateAttentions();
  });

  const unsubscribe = () => {
    unsubscribePending();
    unsubscribeConfirmed();
  };

  safeOnUnmounted(unsubscribe);
  // Add unsubscribe for manual cleanup
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedProcessingAttentions(queueId) {
  const attentions = ref([]);
  // Filter to only get attentions from today (starting from midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(today);

  // Query with single orderBy to avoid composite index requirements
  // We'll sort by number in JavaScript after fetching
  const attentionQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('status', 'in', [ATTENTION_STATUS.PROCESSING]),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(
    attentionQuery,
    snapshot => {
      const mappedDocs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure currentStage is handled safely (may be undefined for old attentions)
          currentStage: data.currentStage || undefined,
          // Ensure stageHistory is handled safely
          stageHistory: data.stageHistory || undefined,
          createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
        };
      });
      // Sort by number in JavaScript (secondary sort)
      mappedDocs.sort((a, b) => {
        const numA = a.number || 0;
        const numB = b.number || 0;
        return numA - numB;
      });
      attentions.value = mappedDocs;
    },
    error => {
      console.error('🔍 [updatedProcessingAttentions] Firebase query error:', error);
      console.error('🔍 [updatedProcessingAttentions] Error code:', error.code);
      console.error('🔍 [updatedProcessingAttentions] Error message:', error.message);
      // Set empty array on error to prevent stale data
      attentions.value = [];
    }
  );
  safeOnUnmounted(unsubscribe);
  // Add unsubscribe for manual cleanup
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedTerminatedAttentions(queueId) {
  const attentions = ref([]);
  // Filter to only get attentions from today (starting from midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(today);

  const attentionQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('status', 'in', [
      ATTENTION_STATUS.TERMINATED,
      ATTENTION_STATUS.RATED,
      'SKIPED', // Note: SKIPED might not be in ATTENTION_STATUS enum
    ]),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'desc'),
    orderBy('number', 'desc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  });
  safeOnUnmounted(unsubscribe);
  // Add unsubscribe for manual cleanup
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedAttentionsByDateAndCommerceAndQueue(queueId) {
  const attentions = ref([]);
  const date = new Date(
    new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10)
  );
  const dateToRequest = Timestamp.fromDate(date);
  const attentionQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('status', 'in', [
      ATTENTION_STATUS.PENDING,
      ATTENTION_STATUS.TERMINATED,
      ATTENTION_STATUS.RATED,
    ]),
    where('createdAt', '>', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  });
  safeOnUnmounted(unsubscribe);
  return attentions;
}

export function updatedAvailableAttentionsByCommerce(commerceId) {
  const attentions = ref([]);
  // Filter to only get attentions from the last 7 days (starting from 7 days ago)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(sevenDaysAgo);

  // Query for PENDING attentions from last 7 days
  const pendingQuery = query(
    attentionCollection,
    where('commerceId', '==', commerceId),
    where('status', '==', 'PENDING'),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );

  // Query for CONFIRMED attentions from last 7 days
  const confirmedQuery = query(
    attentionCollection,
    where('commerceId', '==', commerceId),
    where('status', '==', 'CONFIRMED'),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );

  let pendingDocs = [];
  let confirmedDocs = [];

  const updateAttentions = () => {
    // Combine results from both queries
    const allDocs = [...pendingDocs, ...confirmedDocs];
    attentions.value = allDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  };

  const unsubscribePending = onSnapshot(pendingQuery, snapshot => {
    pendingDocs = snapshot.docs;
    updateAttentions();
  });

  const unsubscribeConfirmed = onSnapshot(confirmedQuery, snapshot => {
    confirmedDocs = snapshot.docs;
    updateAttentions();
  });

  const unsubscribe = () => {
    unsubscribePending();
    unsubscribeConfirmed();
  };

  // Register cleanup on unmount, but also return unsubscribe for manual cleanup
  safeOnUnmounted(unsubscribe);
  // Return both the ref and the unsubscribe function
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedProcessingAttentionsByCommerce(commerceId) {
  const attentions = ref([]);
  // Filter to only get attentions from today (starting from midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(today);

  const attentionQuery = query(
    attentionCollection,
    where('commerceId', '==', commerceId),
    where('status', 'in', ['PROCESSING']),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  });
  // Register cleanup on unmount, but also return unsubscribe for manual cleanup
  safeOnUnmounted(unsubscribe);
  // Return both the ref and the unsubscribe function
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedTerminatedAttentionsByCommerce(commerceId) {
  const attentions = ref([]);
  // Filter to only get attentions from today (starting from midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(today);

  const attentionQuery = query(
    attentionCollection,
    where('commerceId', '==', commerceId),
    where('status', 'in', ['TERMINATED', 'RATED', 'SKIPED']),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  });
  // Register cleanup on unmount, but also return unsubscribe for manual cleanup
  safeOnUnmounted(unsubscribe);
  // Return both the ref and the unsubscribe function
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedAvailableAttentionsByCommerceAndQueue(queueId) {
  const attentions = ref([]);
  const date = new Date(
    new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10)
  );
  const dateToRequest = Timestamp.fromDate(date);
  const attentionQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('createdAt', '>', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure currentStage is handled safely (may be undefined for old attentions)
        currentStage: data.currentStage || undefined,
        // Ensure stageHistory is handled safely
        stageHistory: data.stageHistory || undefined,
        createdAt: data.createdAt ? data.createdAt.toDate().toString() : undefined,
      };
    });
  });
  safeOnUnmounted(unsubscribe);
  return attentions;
}

export function updatedTodayAttentionsByCommerce(commerceId) {
  const attentions = ref([]);

  // Query only by commerceId to avoid requiring a composite index
  // We'll filter by date on the client side
  // Note: This is less efficient for large datasets but avoids index requirements
  // For better performance, create a composite index: commerceId (asc) + createdAt (asc)
  const attentionQuery = query(attentionCollection, where('commerceId', '==', commerceId));
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    // Calculate today's date range for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayTimestamp = Timestamp.fromDate(today);
    const tomorrowTimestamp = Timestamp.fromDate(tomorrow);

    // Filter to only include attentions from today (client-side)
    attentions.value = snapshot.docs
      .filter(doc => {
        const data = doc.data();
        const createdAt = data.createdAt;
        if (!createdAt) return false;

        // createdAt is already a Firestore Timestamp
        if (createdAt instanceof Timestamp) {
          return createdAt >= todayTimestamp && createdAt < tomorrowTimestamp;
        }

        return false;
      })
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toString() : null,
        };
      });
  });
  // Register cleanup on unmount, but also return unsubscribe for manual cleanup
  safeOnUnmounted(unsubscribe);
  // Return both the ref and the unsubscribe function
  attentions.value._unsubscribe = unsubscribe;
  return attentions;
}

export function updatedQueuesByCommerce(commerceId) {
  const queues = ref([]);
  const queueQuery = query(
    queueCollection,
    where('commerceId', '==', commerceId),
    orderBy('order')
  );
  const unsubscribe = onSnapshot(queueQuery, snapshot => {
    queues.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
  safeOnUnmounted(unsubscribe);
  return queues;
}

export function updatedAvailableMessages(collaboratorId, administratorId) {
  if (collaboratorId) {
    const messages = ref([]);
    const messageQuery = query(
      messageCollection,
      where('collaboratorId', '==', collaboratorId),
      where('active', '==', true),
      where('read', '==', false),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(messageQuery, snapshot => {
      messages.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate().toString(),
      }));
    });
    safeOnUnmounted(unsubscribe);
    return messages;
  } else if (administratorId) {
    const messages = ref([]);
    const messageQuery = query(
      messageCollection,
      where('administratorId', '==', administratorId),
      where('active', '==', true),
      where('read', '==', false),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(messageQuery, snapshot => {
      messages.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate().toString(),
      }));
    });
    safeOnUnmounted(unsubscribe);
    return messages;
  }
}

export async function login(email, password) {
  let accessToken;
  return signInWithEmailAndPassword(auth, email, password)
    .then(async userCredential => {
      await userCredential.user.getIdToken().then(token => {
        accessToken = token;
      });
      return accessToken;
    })
    .catch(error => `Usuario no registrado o password inválida: ${error.message}`);
}

export async function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => 'Created')
    .catch(error => {
      const errorMessage = error.message;
      return errorMessage;
    });
}

export async function logout() {
  return signOut(auth);
}

export async function invited() {
  let accessToken;
  return signInAnonymously(auth)
    .then(async userCredential => {
      await userCredential.user.getIdToken().then(token => {
        accessToken = token;
      });
      return accessToken;
    })
    .catch(error => `Usuario invitado no pudo ser logeado: ${error.message}`);
}

export async function sendResetPasswordEmail(email) {
  return sendPasswordResetEmail(auth, email)
    .then(() => 'Email Sent')
    .catch(error => {
      const errorMessage = error.message;
      return errorMessage;
    });
}

export async function confirmResetPassword(code) {
  return verifyPasswordResetCode(auth, code)
    .then(() => 'Email Sent')
    .catch(error => {
      const errorMessage = error.message;
      return errorMessage;
    });
}

export async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        unsubscribe();
        if (user) {
          resolve(user.getIdToken());
        } else {
          resolve(undefined);
        }
      },
      reject
    );
  });
}
