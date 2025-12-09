/**
 * Composable for Firebase Firestore listeners
 * Provides consistent pattern for real-time data with automatic cleanup
 *
 * @param {Function} queryFn - Function that returns Firestore query with onSnapshot
 * @returns {Object} { data, isLoading, error, start, unsubscribe }
 *
 * @example
 * const { data: messages, isLoading, start } = useFirebaseListener((onSnapshot, onError) => {
 *   return messageCollection
 *     .where('collaboratorId', '==', collaboratorId)
 *     .onSnapshot(onSnapshot, onError);
 * });
 *
 * onMounted(() => start());
 */
import { ref, onUnmounted, getCurrentInstance } from 'vue';

export function useFirebaseListener(queryFn) {
  const data = ref([]);
  const isLoading = ref(true);
  const error = ref(null);
  let unsubscribe = null;

  const start = () => {
    try {
      // Stop existing listener if any (for restart support)
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      isLoading.value = true;
      error.value = null;

      const unsubscribeFn = queryFn(
        snapshot => {
          // Success callback
          data.value = snapshot.docs.map(doc => {
            const docData = doc.data();
            // Handle createdAt if it exists (same as before)
            return {
              id: doc.id,
              ...docData,
              createdAt: docData.createdAt?.toDate?.()?.toString() || docData.createdAt,
            };
          });
          isLoading.value = false;
        },
        err => {
          // Error callback
          error.value = err;
          isLoading.value = false;
          console.error('Firebase listener error:', err);
        }
      );

      // Store unsubscribe function (could be a function or undefined)
      unsubscribe = typeof unsubscribeFn === 'function' ? unsubscribeFn : null;

      // If no unsubscribe function returned, consider it started
      if (!unsubscribe) {
        isLoading.value = false;
      }
    } catch (err) {
      error.value = err;
      isLoading.value = false;
      console.error('Error setting up Firebase listener:', err);
    }
  };

  const stop = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    isLoading.value = false;
  };

  // Automatic cleanup on unmount - only register if we have an active component instance
  const instance = getCurrentInstance();
  if (instance) {
    onUnmounted(() => {
      stop();
    });
  }

  return {
    data,
    isLoading,
    error,
    start,
    stop,
    unsubscribe: stop, // Alias for stop
  };
}
