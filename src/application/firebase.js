import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

import { ref, onUnmounted } from 'vue'

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

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
// Initialize Firebase Authentication and get a reference to the service

const firestore = firebase.firestore();
export const attentionCollection = firestore.collection('attention');
export const queueCollection = firestore.collection('queue');
export const bookingCollection = firestore.collection('booking');
export const waitlistCollection = firestore.collection('waitlist');
export const messageCollection = firestore.collection('message');
export const bookingBlockNumberUsedCollection = firestore.collection('booking-block-number-used');

export function updatedAttentions(attentionId) {
  const attentions = ref([]);
  const attentionQuery = attentionCollection.where('id', "==", attentionId);
  const unsubscribe = attentionQuery.onSnapshot(snapshot => {
    attentions.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
      })
  })
  onUnmounted(unsubscribe)
  return attentions;
}

export function updatedQueues(queueId) {
  const queues = ref([]);
  const queueQuery = queueCollection.where('id', "==", queueId);
  const unsubscribe = queueQuery.onSnapshot(snapshot => {
    queues.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data() }
      })
  })
  onUnmounted(unsubscribe)
  return queues;
}

export function updatedAvailableAttentions(queueId) {
  const attentions = ref([]);
  const attentionQuery = attentionCollection
    .where('queueId', "==", queueId)
    .where('status', 'in', ['PENDING'])
    .orderBy('number', 'asc');
  const unsubscribe = attentionQuery.onSnapshot(snapshot => {
    attentions.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
      })
  })
  onUnmounted(unsubscribe)
  return attentions;
}

export function updatedAttentionsByDateAndCommerceAndQueue(queueId) {
  const attentions = ref([]);
  const date = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0,10));
  const dateToRequest = firebase.firestore.Timestamp.fromDate(date);
  const attentionQuery = attentionCollection
    .where('queueId', "==", queueId)
    .where('status', "in", ['PENDING', 'TERMINATED', 'RATED'])
    .where('createdAt', '>', dateToRequest)
    .orderBy('createdAt', 'asc')
    .orderBy('number', 'asc');
  const unsubscribe = attentionQuery.onSnapshot(snapshot => {
    attentions.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
      })
  })
  onUnmounted(unsubscribe)
  return attentions;
}

export function updatedAvailableAttentionsByCommerce(commerceId) {
  const attentions = ref([]);
  const attentionQuery = attentionCollection
    .where('commerceId', "==", commerceId)
    .where('status', 'in', ['PENDING'])
    .orderBy('number', 'asc');
  const unsubscribe = attentionQuery.onSnapshot(snapshot => {
    attentions.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
      })
  })
  onUnmounted(unsubscribe)
  return attentions;
}

export function updatedAvailableAttentionsByCommerceAndQueue(queueId) {
  const attentions = ref([]);
  const date = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0,10));
  const dateToRequest = firebase.firestore.Timestamp.fromDate(date);
  const attentionQuery = attentionCollection
    .where('queueId', "==", queueId)
    .where('createdAt', '>', dateToRequest)
    .orderBy('createdAt', 'asc')
    .orderBy('number', 'asc');
  const unsubscribe = attentionQuery.onSnapshot(snapshot => {
    attentions.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
      })
  })
  onUnmounted(unsubscribe)
  return attentions;
}

export function updatedQueuesByCommerce(commerceId) {
  const queues = ref([]);
  const queueQuery = queueCollection.where('commerceId', "==", commerceId).orderBy('order');
  const unsubscribe = queueQuery.onSnapshot(snapshot => {
    queues.value = snapshot.docs
      .map(doc => {
        return { id: doc.id, ...doc.data() }
      })
  })
  onUnmounted(unsubscribe)
  return queues;
}

export function updatedAvailableMessages(collaboratorId, administratorId) {
  if (collaboratorId) {
    const messages = ref([]);
    const messageQuery = messageCollection
      .where('collaboratorId', "==", collaboratorId)
      .where('active', "==", true)
      .where('read', "==", false)
      .orderBy('createdAt', 'asc');
    const unsubscribe = messageQuery.onSnapshot(snapshot => {
      messages.value = snapshot.docs
        .map(doc => {
          return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
        })
    })
    onUnmounted(unsubscribe)
    return messages;
  } else if (administratorId) {
    const messages = ref([]);
    const messageQuery = messageCollection
      .where('administratorId', "==", administratorId)
      .where('active', "==", true)
      .where('read', "==", false)
      .orderBy('createdAt', 'asc');
    const unsubscribe = messageQuery.onSnapshot(snapshot => {
      messages.value = snapshot.docs
        .map(doc => {
          return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
        })
    })
    onUnmounted(unsubscribe)
    return messages;
  }
}

export async function login(email, password) {
  let accessToken;
  return auth.signInWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      await userCredential.user.getIdToken().then((token) => {
        accessToken = token;
      })
      return accessToken;
    })
    .catch((error) => {
      return `Usuario no registrado o password inválida: ${error.message}`;
  });
}

export async function register(email, password) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return 'Created';
    })
    .catch((error) => {
      const errorMessage = error.message;
      return errorMessage;
    });
}

export async function logout() {
  return auth.signOut();
}

export async function invited() {
  let accessToken;
  return auth.signInAnonymously()
    .then(async (userCredential) => {
      await userCredential.user.getIdToken().then((token) => {
        accessToken = token;
      })
      return accessToken;
    })
    .catch((error) => {
      return `Usuario invitado no pudo ser logeado: ${error.message}`;
  });
}

export async function sendResetPasswordEmail(email) {
  return auth.sendPasswordResetEmail(email)
    .then(() => {
      return 'Email Sent';
    })
    .catch((error) => {
      const errorMessage = error.message;
      return errorMessage;
    });
}

export async function confirmResetPassword(code) {
  return auth.verifyPasswordResetCode(code)
    .then(() => {
      return 'Email Sent';
    })
    .catch((error) => {
      const errorMessage = error.message;
      return errorMessage;
    });
}

export async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
       unsubscribe();
       if (user) {
        resolve(user.getIdToken());
       }
    }, reject);
  });
}