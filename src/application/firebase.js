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

import { ref, onUnmounted } from 'vue';
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
export const attentionCollection = collection(firestore, 'attention');
export const queueCollection = collection(firestore, 'queue');
export const bookingCollection = collection(firestore, 'booking');
export const waitlistCollection = collection(firestore, 'waitlist');
export const messageCollection = collection(firestore, 'message');
export const bookingBlockNumberUsedCollection = collection(firestore, 'booking-block-number-used');

export function updatedAttentions(attentionId) {
  const attentions = ref([]);
  const attentionQuery = query(attentionCollection, where('id', '==', attentionId));
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toString(),
    }));
  });
  onUnmounted(unsubscribe);
  return attentions;
}

export function updatedQueues(queueId) {
  const queues = ref([]);
  const queueQuery = query(queueCollection, where('id', '==', queueId));
  const unsubscribe = onSnapshot(queueQuery, snapshot => {
    queues.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
  onUnmounted(unsubscribe);
  return queues;
}

export function updatedAvailableAttentions(queueId) {
  const attentions = ref([]);
  const attentionQuery = query(
    attentionCollection,
    where('queueId', '==', queueId),
    where('status', 'in', [ATTENTION_STATUS.PENDING]),
    orderBy('number', 'asc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toString(),
    }));
  });
  onUnmounted(unsubscribe);
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
    attentions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toString(),
    }));
  });
  onUnmounted(unsubscribe);
  return attentions;
}

export function updatedAvailableAttentionsByCommerce(commerceId) {
  const attentions = ref([]);
  // Filter to only get attentions from today (starting from midnight today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateToRequest = Timestamp.fromDate(today);

  const attentionQuery = query(
    attentionCollection,
    where('commerceId', '==', commerceId),
    where('status', 'in', ['PENDING']),
    where('createdAt', '>=', dateToRequest),
    orderBy('createdAt', 'asc'),
    orderBy('number', 'asc')
  );
  const unsubscribe = onSnapshot(attentionQuery, snapshot => {
    attentions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toString(),
    }));
  });
  // Register cleanup on unmount, but also return unsubscribe for manual cleanup
  onUnmounted(unsubscribe);
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
    attentions.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toString(),
    }));
  });
  onUnmounted(unsubscribe);
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
  onUnmounted(unsubscribe);
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
    onUnmounted(unsubscribe);
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
    onUnmounted(unsubscribe);
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
