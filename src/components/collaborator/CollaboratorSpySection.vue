<script>
import {
  ref,
  reactive,
  onBeforeMount,
  computed,
  watch,
  toRefs,
  onUnmounted,
  getCurrentInstance,
} from 'vue';
import { useRouter } from 'vue-router';
import {
  getPendingAttentionsDetails,
  getBookingsDetails,
} from '../../application/services/query-stack';
import { attentionCollection, bookingCollection } from '../../application/firebase';
import { query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { ATTENTION_STATUS } from '../../shared/constants';
import { getCommerceById } from '../../application/services/commerce';
import { getGroupedQueueByCommerceId } from '../../application/services/queue';
import { getActiveFeature } from '../../shared/features';
import { globalStore } from '../../stores';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getUserById } from '../../application/services/user';
import { DateModel } from '../../shared/utils/date.model';
import { updatedAvailableAttentionsByCommerce } from '../../application/firebase';
import Message from '../common/Message.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorSpySection',
  components: { Message, Spinner, Alert, Popper },
  props: {
    show: { type: Boolean, default: true },
    commerce: { type: Object, default: {} },
    collaborator: { type: Object, default: {} },
  },
  async setup(props) {
    const router = useRouter();
    const loading = ref(false);
    const loadingCalendar = ref(false);
    const alertError = ref('');

    const { show, commerce, collaborator } = toRefs(props);
    const store = globalStore();

    const dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });

    const calendarAttributes = ref([
      {
        key: 'Attentions',
        highlight: {
          color: 'blue',
          fillMode: 'light',
        },
        dates: [],
      },
      {
        key: 'Bookings',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: [],
      },
      {
        key: 'Both',
        highlight: {
          color: 'purple',
          fillMode: 'light',
        },
        dates: [],
      },
    ]);

    const state = reactive({
      currentUser: {},
      collaborator: {},
      professional: {}, // Professional data for queue filtering
      business: {},
      commerces: [],
      commerce: {},
      dedicatedQueues: [],
      todayAttentions: [],
      weekBookings: [],
      monthBookings: [],
      showTodayAttentionsDetails: false,
      selectedDate: undefined,
      dateDetails: {
        attentions: [],
        bookings: [],
      },
      calendarDates: {},
      minDate: new Date().setDate(new Date().getDate()),
      maxDate: new Date().setDate(new Date().getDate() + 30),
      locale: 'es',
      queueStatus: {},
    });

    // Store wrapper outside reactive state to prevent Vue from unwrapping the ref
    // Same pattern as CollaboratorQueuesView
    const attentionsWrapper = ref(null);
    let attentions = null;

    // Cache to prevent duplicate API calls
    const lastLoadedCommerceId = ref(null);
    const calendarDataCache = ref(null);
    const lastCalendarCommerceId = ref(null);
    let unsubscribeCalendarAttentions = () => {};
    let unsubscribeCalendarBookings = () => {};

    // Register onUnmounted BEFORE any await statements
    // Only register if we have an active component instance
    const instance = getCurrentInstance();
    if (instance) {
      onUnmounted(() => {
        // Cleanup listener on component unmount (same as CollaboratorQueuesView)
        if (attentions && attentions._unsubscribe) {
          attentions._unsubscribe();
        }
        if (attentionsWrapper.value && attentionsWrapper.value._unsubscribe) {
          attentionsWrapper.value._unsubscribe();
        }
        // Clean up calendar listeners
        if (unsubscribeCalendarAttentions) unsubscribeCalendarAttentions();
        if (unsubscribeCalendarBookings) unsubscribeCalendarBookings();
      });
    }

    onBeforeMount(async () => {
      try {
        if (show.value === true) {
          await initializeSpy();
        }
      } catch (error) {
        alertError.value = error ? (error.response ? error.response.status : 500) : 500;
        loading.value = false;
      }
    });

    const initializeSpy = async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.collaborator = collaborator.value || state.currentUser;

        if (!state.collaborator.id) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }

        // Get available commerces for this collaborator
        await getAvailableCommerces();

        // Set default commerce (first one) - prefer commerce from props or store
        if (commerce.value && commerce.value.id) {
          state.commerce = commerce.value;
        } else if (state.commerces && state.commerces.length > 0) {
          state.commerce = state.commerces[0];
        } else {
          // Try to use commerce from store
          const storeCommerce = store.getCurrentCommerce;
          if (storeCommerce && storeCommerce.id) {
            state.commerce = storeCommerce;
          } else if (state.currentUser.commerceId) {
            state.commerce = await getCommerceById(state.currentUser.commerceId);
          }
        }

        // Load data for selected commerce
        await loadCommerceData();

        loading.value = false;
      } catch (error) {
        alertError.value = error ? (error.response ? error.response.status : 500) : 500;
        loading.value = false;
      }
    };

    const getAvailableCommerces = async () => {
      try {
        if (state.collaborator) {
          let commercesId = [];
          if (state.collaborator.commercesId && state.collaborator.commercesId.length > 0) {
            commercesId = state.collaborator.commercesId;
          } else if (state.collaborator.commerceId) {
            commercesId = [state.collaborator.commerceId];
          }

          if (commercesId && commercesId.length > 0) {
            // First try to use commerce from store if available
            const storeCommerce = store.getCurrentCommerce;
            if (storeCommerce && storeCommerce.id && commercesId.includes(storeCommerce.id)) {
              state.commerces = [storeCommerce];
              // If there are more commerces, get them from store
              if (commercesId.length > 1) {
                state.business = await store.getActualBusiness();
                const allCommerces = await store.getAvailableCommerces(state.business.commerces);
                state.commerces = allCommerces.filter(com => commercesId.includes(com.id));
                // Ensure store commerce is included
                if (!state.commerces.find(c => c.id === storeCommerce.id)) {
                  state.commerces.unshift(storeCommerce);
                }
              }
            } else {
              // Fallback: get from store
              state.business = await store.getActualBusiness();
              state.commerces = await store.getAvailableCommerces(state.business.commerces);
              // Filter to only show commerces the collaborator has access to
              if (state.commerces && state.commerces.length > 0) {
                state.commerces = state.commerces.filter(com => commercesId.includes(com.id));
              }
            }
          } else if (state.collaborator.commerceId) {
            // Try to use commerce from store first
            const storeCommerce = store.getCurrentCommerce;
            if (storeCommerce && storeCommerce.id === state.collaborator.commerceId) {
              state.commerces = [storeCommerce];
            } else {
              const singleCommerce = await getCommerceById(state.collaborator.commerceId);
              state.commerces = [singleCommerce];
            }
          }
        }
      } catch (error) {
        state.commerces = [];
      }
    };

    const loadCommerceData = async () => {
      if (!state.commerce || !state.commerce.id) return;

      // Skip if already loaded for this commerce
      if (state.commerce.id === lastLoadedCommerceId.value) {
        return;
      }

      // Get dedicated queues for this collaborator
      await getDedicatedQueues();

      // Initialize queue status
      initializeQueueStatus();

      // Initialize attentions listener (same as CollaboratorQueuesView)
      if (state.commerce && state.commerce.id) {
        initializeAttentionsListener(state.commerce.id);
      }

      // Load data in parallel where possible
      // Note: We don't call getTodayAttentions() here because Firebase listener handles real-time updates
      // getTodayAttentions() is only called initially to ensure data is loaded before Firebase connects
      await Promise.all([getWeekAndMonthBookings()]);

      // Initialize calendar (this is heavy, so do it separately)
      await initializeCalendar();

      lastLoadedCommerceId.value = state.commerce.id;
    };

    const initializeQueueStatus = () => {
      if (state.dedicatedQueues && state.dedicatedQueues.length > 0) {
        state.dedicatedQueues.forEach(queue => {
          state.queueStatus[queue.id] = 0;
        });
      }
    };

    // Initialize attentions listener (same as CollaboratorQueuesView)
    const initializeAttentionsListener = commerceId => {
      if (!commerceId) {
        state.attentionsWrapper = null;
        initializeQueueStatus();
        return;
      }

      // Clean up previous listener if exists
      if (attentions && attentions._unsubscribe) {
        attentions._unsubscribe();
        attentions = null;
      }
      if (attentionsWrapper.value && attentionsWrapper.value._unsubscribe) {
        attentionsWrapper.value._unsubscribe();
      }

      // Reset queue status before creating new listener
      initializeQueueStatus();

      // Create new listener (same as CollaboratorQueuesView)
      attentions = updatedAvailableAttentionsByCommerce(commerceId);
      attentionsWrapper.value = attentions;

      // Force initial check after a brief moment to allow Firebase to initialize
      setTimeout(async () => {
        if (attentionsWrapper.value && attentionsWrapper.value.value) {
          checkQueueStatus(attentionsWrapper.value);
          // Also update today's attentions list from Firebase
          if (Array.isArray(attentionsWrapper.value.value)) {
            await updateTodayAttentionsFromFirebase(attentionsWrapper.value.value);
          }
        }
      }, 100);
    };

    const checkQueueStatus = async attentionsRef => {
      // Ensure we have queues loaded first (same as CollaboratorQueuesView)
      if (!state.dedicatedQueues || state.dedicatedQueues.length === 0) {
        return;
      }

      // Ensure we have a valid ref with a value
      if (!attentionsRef) {
        initializeQueueStatus();
        return;
      }

      // Get the value from ref, ensuring it's an array
      const attentionsArray =
        attentionsRef.value && Array.isArray(attentionsRef.value) ? attentionsRef.value : [];

      // Always initialize all queues to 0 first
      initializeQueueStatus();

      // If no attentions, all queues are already set to 0
      if (attentionsArray.length === 0) {
        return;
      }

      try {
        const filteredAttentionsByQueue = attentionsArray.reduce((acc, attention) => {
          if (attention && attention.queueId) {
            const queueId = attention.queueId;
            if (!acc[queueId]) {
              acc[queueId] = [];
            }
            acc[queueId].push(attention);
          }
          return acc;
        }, {});

        // Update only queues that have attentions (same as CollaboratorQueuesView)
        state.dedicatedQueues.forEach(queue => {
          if (queue && queue.id) {
            if (filteredAttentionsByQueue[queue.id]) {
              const attentionsCount = filteredAttentionsByQueue[queue.id].length;
              state.queueStatus[queue.id] = attentionsCount;
            } else {
              // Explicitly set to 0 if no attentions for this queue
              state.queueStatus[queue.id] = 0;
            }
          }
        });
      } catch (error) {
        initializeQueueStatus();
      }
    };

    const updateTodayAttentionsFromFirebase = async firebaseAttentions => {
      // Format Firebase attentions to match the same structure as getTodayAttentions
      // Ensure we have dedicated queues before filtering
      if (!state.dedicatedQueues || state.dedicatedQueues.length === 0) {
        state.todayAttentions = [];
        return;
      }

      const queueIds = state.dedicatedQueues.map(q => q.id);

      // Filter by today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const filteredAttentions = firebaseAttentions.filter(att => {
        // Filter by queue
        if (!att.queueId || !queueIds.includes(att.queueId)) {
          return false;
        }

        // Filter by status - only PENDING attentions
        if (att.status !== 'PENDING') {
          return false;
        }

        // Filter by today's date
        if (!att.createdAt) {
          return false;
        }

        try {
          let attentionDate;
          if (att.createdAt instanceof Date) {
            attentionDate = new Date(att.createdAt);
          } else if (typeof att.createdAt === 'string') {
            attentionDate = new Date(att.createdAt);
          } else if (att.createdAt.toDate && typeof att.createdAt.toDate === 'function') {
            attentionDate = att.createdAt.toDate();
          } else if (att.createdAt.seconds) {
            attentionDate = new Date(att.createdAt.seconds * 1000);
          } else {
            return false;
          }

          if (isNaN(attentionDate.getTime())) {
            return false;
          }

          const attentionDateOnly = new Date(attentionDate);
          attentionDateOnly.setHours(0, 0, 0, 0);

          return attentionDateOnly.getTime() === today.getTime();
        } catch (e) {
          return false;
        }
      });

      // Map and fetch user data in parallel
      const formattedAttentions = await Promise.all(
        filteredAttentions.map(async att => {
          let serviceName = att.serviceName || 'N/A';
          if (
            att.servicesDetails &&
            Array.isArray(att.servicesDetails) &&
            att.servicesDetails.length > 0
          ) {
            serviceName = att.servicesDetails.map(s => s.name || s).join(', ');
          }

          // Get user name from attention data
          let userName = '';
          let userLastName = '';
          let userIdNumber = '';

          // Check multiple possible locations for user data
          if (att.user && typeof att.user === 'object') {
            userName = att.user.name || '';
            userLastName = att.user.lastName || '';
            userIdNumber = att.user.idNumber || att.user.id || '';
          } else if (att.userName) {
            userName = att.userName;
            userLastName = att.userLastName || '';
            userIdNumber = att.userIdNumber || att.userId || '';
          } else if (att.userId) {
            // If only userId is available, use it as identifier
            // Note: Backend now includes userName/userLastName in Firebase documents
            // If still missing, show userId as fallback
            userIdNumber = att.userId;
          }

          // Build client name - only use actual name, don't fallback to userId
          let clientName = '';
          if (userName || userLastName) {
            const fullName = (userName || '') + (userLastName ? ' ' + userLastName : '').trim();
            // Only use if it doesn't look like an ID (long alphanumeric string)
            if (fullName && !fullName.match(/^[A-Za-z0-9]{20,}$/)) {
              clientName = fullName;
            }
          }
          // Don't set clientName to userId - we'll use 'N/A' if no name exists
          if (!clientName) {
            clientName = 'N/A';
          }

          // Parse createdAt - it comes as string from Firebase
          let hour = 'N/A';
          let createdAt = null;
          if (att.createdAt) {
            try {
              const date = new Date(att.createdAt);
              if (!isNaN(date.getTime())) {
                hour = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                createdAt = att.createdAt;
              }
            } catch (e) {
              // Error parsing createdAt
            }
          } else if (att.createdDate) {
            createdAt = att.createdDate;
          }

          return {
            id: att.id || att.attentionId,
            clientName,
            clientId: userIdNumber || att.userId || att.clientId || 'N/A',
            hour,
            service: serviceName,
            number: att.number,
            status: att.status,
            queueId: att.queueId,
            createdAt: createdAt || att.createdAt || att.createdDate || null,
          };
        })
      );

      // Sort by number (ascending) to show next attention first
      formattedAttentions.sort((a, b) => {
        const numA = a.number || 0;
        const numB = b.number || 0;
        return numA - numB;
      });

      // Create a new array to ensure Vue reactivity
      state.todayAttentions.splice(0, state.todayAttentions.length, ...formattedAttentions);
    };

    // Function to get queue count - Vue will track state.todayAttentions in template
    // Computed property for total count - ensures reactivity
    const getTotalAttentionsCount = computed(() => {
      // Return the count of today's attentions (already filtered by date, status, and queues)
      const count = state.todayAttentions ? state.todayAttentions.length : 0;
      return count;
    });

    // Function for queue count - will be reactive because it accesses state.todayAttentions
    const getQueueAttentionsCount = queueId => {
      if (!state.todayAttentions || state.todayAttentions.length === 0) return 0;
      const count = state.todayAttentions.filter(att => att.queueId === queueId).length;
      return count;
    };

    const selectCommerce = async selectedCommerce => {
      try {
        loading.value = true;
        // Clear cache when commerce changes
        if (state.commerce && state.commerce.id && state.commerce.id !== selectedCommerce.id) {
          lastLoadedCommerceId.value = null;
          calendarDataCache.value = null;
          lastCalendarCommerceId.value = null;
        }
        state.commerce = selectedCommerce;
        await loadCommerceData();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const selectCommerceById = async commerceId => {
      try {
        loading.value = true;
        const selectedCommerce = state.commerces.find(com => com.id === commerceId);
        if (selectedCommerce) {
          state.commerce = selectedCommerce;
          await loadCommerceData();
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const getDedicatedQueues = async () => {
      try {
        if (!state.commerce || !state.commerce.id) return;

        // Use queues from commerce if available, otherwise fetch
        let queues = [];
        if (state.commerce.queues && state.commerce.queues.length > 0) {
          queues = state.commerce.queues;
        } else {
          const commerceData = await getCommerceById(state.commerce.id);
          queues = commerceData.queues || [];
          // Update commerce with full data
          if (commerceData && commerceData.id) {
            state.commerce = { ...state.commerce, ...commerceData };
          }
        }

        // Check for grouped queues if feature is active
        if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
          const groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
          const collaboratorType = state.collaborator.type;

          // Load professional data if collaborator has professionalId
          if (state.collaborator && state.collaborator.professionalId && !state.professional) {
            try {
              const { getProfessionalById } = await import('../../application/services/professional');
              state.professional = await getProfessionalById(state.collaborator.professionalId);
            } catch (error) {
              console.warn('Could not load professional data, falling back to collaborator', error);
              state.professional = state.collaborator;
            }
          }

          if (Object.keys(groupedQueues).length > 0) {
            // Build all queues from grouped queues
            const allQueues = Object.values(groupedQueues).flat();

            if (collaboratorType === 'STANDARD') {
              // STANDARD: Their own professional queues + non-professional queues
              const professionalQueues = (groupedQueues['PROFESSIONAL'] || []).filter(
                queue => {
                  // Use professionalId if available, otherwise fallback to collaboratorId
                  if (state.professional && state.professional.id) {
                    return queue.professionalId === state.professional.id;
                  }
                  return queue.collaboratorId === state.collaborator.id;
                }
              );
              const otherQueues = allQueues.filter(queue => queue.type !== 'PROFESSIONAL');
              queues = [...professionalQueues, ...otherQueues];
            } else if (collaboratorType === 'ASSISTANT') {
              // ASSISTANT: No professional queues, only general queues
              queues = allQueues.filter(queue => queue.type !== 'PROFESSIONAL');
            } else {
              // All other types: Can see all queues
              queues = allQueues;
            }
          }
        } else {
          // Legacy logic for non-grouped queues
          const collaboratorType = state.collaborator.type;
          if (collaboratorType === 'STANDARD') {
            // Filter queues where type is PROFESSIONAL and collaboratorId matches
            queues = queues.filter(
              queue => queue.type === 'PROFESSIONAL' && queue.collaboratorId === state.collaborator.id
            );
          } else if (collaboratorType === 'ASSISTANT') {
            // ASSISTANT: No professional queues
            queues = queues.filter(queue => queue.type !== 'PROFESSIONAL');
          }
          // All other types can see all queues
        }

        state.dedicatedQueues = queues;
      } catch (error) {
        state.dedicatedQueues = [];
      }
    };

    const getTodayAttentions = async () => {
      try {
        if (state.dedicatedQueues.length === 0) {
          state.todayAttentions = [];
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const queueIds = state.dedicatedQueues.map(q => q.id);

        // Get today's attentions
        let attentions = [];

        if (queueIds.length === 0) {
          // No queues assigned
          state.todayAttentions = [];
          return;
        } else if (queueIds.length === 1) {
          // Single queue - filter efficiently in API
          attentions = await getPendingAttentionsDetails(
            state.commerce.id,
            today,
            today,
            [state.commerce.id],
            1,
            1000,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            queueIds[0], // Pass single queueId to API
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
          );
        } else {
          // Multiple queues - get all and filter afterwards (more efficient than multiple API calls)
          attentions = await getPendingAttentionsDetails(
            state.commerce.id,
            today,
            today,
            [state.commerce.id],
            1,
            1000,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined, // No queueId filter in API
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
          );
        }

        // Filter by queue IDs and status PENDING
        const todayAttentions = (attentions || []).filter(
          att => {
            // Always check status first
            if (att.status !== 'PENDING') return false;

            // If single queue, it's already filtered by API
            if (queueIds.length === 1) return true;

            // If multiple queues, filter by all queueIds
            return att.queueId && queueIds.includes(att.queueId);
          }
        );

        // Format attentions
        state.todayAttentions = todayAttentions.map(att => {
          let serviceName = att.serviceName || 'N/A';
          if (
            att.servicesDetails &&
            Array.isArray(att.servicesDetails) &&
            att.servicesDetails.length > 0
          ) {
            serviceName = att.servicesDetails.map(s => s.name || s).join(', ');
          }

          return {
            id: att.attentionId,
            clientName:
              (att.userName || '') + (att.userLastName ? ' ' + att.userLastName : '') ||
              att.userIdNumber ||
              'N/A',
            clientId: att.userIdNumber || att.userId || 'N/A',
            hour: att.createdDate
              ? new Date(att.createdDate).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A',
            service: serviceName,
            number: att.number,
            status: att.status,
            queueId: att.queueId, // Include queueId for filtering
          };
        });
      } catch (error) {
        state.todayAttentions = [];
      }
    };

    const getWeekAndMonthBookings = async () => {
      try {
        if (state.dedicatedQueues.length === 0) {
          state.weekBookings = [];
          state.monthBookings = [];
          return;
        }

        const queueIds = state.dedicatedQueues.map(q => q.id);
        const today = new Date();

        // Week: from today to 7 days ahead
        const weekStart = new Date(today);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekFrom = weekStart.toISOString().slice(0, 10);
        const weekTo = weekEnd.toISOString().slice(0, 10);

        // Month: from today to 30 days ahead
        const monthStart = new Date(today);
        const monthEnd = new Date(today);
        monthEnd.setDate(monthEnd.getDate() + 30);
        const monthFrom = monthStart.toISOString().slice(0, 10);
        const monthTo = monthEnd.toISOString().slice(0, 10);

        // Get week bookings
        const weekBookings = await getBookingsDetails(
          state.commerce.id,
          weekFrom,
          weekTo,
          [state.commerce.id],
          1,
          10000,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );

        // Get month bookings
        const monthBookings = await getBookingsDetails(
          state.commerce.id,
          monthFrom,
          monthTo,
          [state.commerce.id],
          1,
          10000,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );

        // Filter by queue IDs and status (not cancelled)
        const filteredWeekBookings = (weekBookings || []).filter(
          booking =>
            booking.queueId && queueIds.includes(booking.queueId) && booking.status !== 'CANCELLED'
        );

        const filteredMonthBookings = (monthBookings || []).filter(
          booking =>
            booking.queueId && queueIds.includes(booking.queueId) && booking.status !== 'CANCELLED'
        );

        // Format bookings
        const formatBooking = booking => {
          let serviceName = 'N/A';
          if (
            booking.servicesDetails &&
            Array.isArray(booking.servicesDetails) &&
            booking.servicesDetails.length > 0
          ) {
            serviceName = booking.servicesDetails.map(s => s.name || s).join(', ');
          }

          let hour = 'N/A';
          if (booking.hourFrom) {
            hour = booking.hourFrom;
          } else if (booking.block && typeof booking.block === 'object') {
            hour = booking.block.hourFrom || 'N/A';
          }

          let userName = 'N/A';
          let userIdNumber = 'N/A';
          if (booking.userName) {
            userName =
              (booking.userName || '') + (booking.userLastName ? ' ' + booking.userLastName : '');
          } else if (booking.user && typeof booking.user === 'object') {
            userName =
              (booking.user.name || '') +
              (booking.user.lastName ? ' ' + booking.user.lastName : '');
            userIdNumber = booking.user.idNumber || booking.userId || 'N/A';
          }
          if (!userIdNumber && booking.userIdNumber) {
            userIdNumber = booking.userIdNumber;
          }

          return {
            id: booking.bookingId || booking.id,
            clientName: userName || userIdNumber || 'N/A',
            clientId: userIdNumber || booking.userId || 'N/A',
            hour,
            service: serviceName,
            date: booking.date,
            status: booking.status,
          };
        };

        state.weekBookings = filteredWeekBookings.map(formatBooking);
        state.monthBookings = filteredMonthBookings.map(formatBooking);
      } catch (error) {
        state.weekBookings = [];
        state.monthBookings = [];
      }
    };

    const initializeCalendar = async () => {
      try {
        loadingCalendar.value = true;
        if (state.dedicatedQueues.length === 0) {
          loadingCalendar.value = false;
          return;
        }

        // Unsubscribe from previous listeners
        if (unsubscribeCalendarAttentions) unsubscribeCalendarAttentions();
        if (unsubscribeCalendarBookings) unsubscribeCalendarBookings();

        const queueIds = state.dedicatedQueues.map(q => q.id);

        // Set up Firebase real-time listeners for attentions
        // Simplified query to avoid composite index requirement
        // We'll filter by queueId, status, and date range in the callback
        const attentionsQuery = query(
          attentionCollection,
          where('commerceId', '==', state.commerce.id)
        );

        unsubscribeCalendarAttentions = onSnapshot(attentionsQuery, snapshot => {
          const attentions = snapshot.docs
            .map(doc => {
              const data = doc.data();
              const createdAtDate = data.createdAt?.toDate
                ? data.createdAt.toDate()
                : data.createdAt;
              return {
                id: doc.id,
                ...data,
                createdAt: createdAtDate,
              };
            })
            // Filter by queueIds, status, and date range (to avoid composite index requirement)
            .filter(att => {
              // Check queueId
              if (!att.queueId || !queueIds.includes(att.queueId)) return false;

              // Check status (only PENDING for calendar)
              if (att.status !== 'PENDING') return false;

              // Check date range (today to next 30 days - no past dates)
              if (!att.createdAt) return false;
              const attDate =
                att.createdAt instanceof Date ? att.createdAt : new Date(att.createdAt);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + 30);
              endDate.setHours(23, 59, 59, 999);

              return attDate >= today && attDate <= endDate;
            });

          // Group by date (use local date to avoid timezone issues)
          const attentionsByDate = {};
          attentions.forEach(att => {
            let date = null;
            const dateField = att.createdAt || att.createdDate || att.date;
            if (dateField) {
              try {
                let dateObj;
                if (typeof dateField === 'string') {
                  dateObj = new Date(dateField);
                } else if (dateField instanceof Date) {
                  dateObj = dateField;
                } else if (dateField.toDate && typeof dateField.toDate === 'function') {
                  dateObj = dateField.toDate();
                }

                if (dateObj && !isNaN(dateObj.getTime())) {
                  // Use local date components to avoid timezone issues
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  date = `${year}-${month}-${day}`;
                }
              } catch (e) {
                // Error parsing attention date
              }
            }
            if (date) {
              if (!attentionsByDate[date]) {
                attentionsByDate[date] = [];
              }
              attentionsByDate[date].push(att);
            }
          });

          state.calendarDates = { ...state.calendarDates, attentionsByDate };
          updateCalendarAttributes(
            state.calendarDates.attentionsByDate || {},
            state.calendarDates.bookingsByDate || {}
          );
        });

        // Set up Firebase real-time listeners for bookings
        // Only show today and future dates (no past dates)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().slice(0, 10);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        const endDateStr = endDate.toISOString().slice(0, 10);

        // Set up Firebase real-time listeners for bookings
        // Simplified query to avoid composite index requirement
        // We'll filter by queueId, date range, and status in the callback
        const bookingsQuery = query(
          bookingCollection,
          where('commerceId', '==', state.commerce.id),
          where('status', 'in', ['PENDING', 'CONFIRMED'])
        );

        unsubscribeCalendarBookings = onSnapshot(bookingsQuery, snapshot => {
          const bookings = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
            // Filter by queueIds, date range, and status (to avoid composite index requirement)
            .filter(booking => {
              // Check queueId
              if (!booking.queueId || !queueIds.includes(booking.queueId)) return false;

              // Check date range (today to next 30 days - no past dates)
              if (!booking.date) return false;
              const bookingDate = booking.date.slice(0, 10); // YYYY-MM-DD format
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayStr = today.toISOString().slice(0, 10);
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + 30);
              const endDateStr = endDate.toISOString().slice(0, 10);

              return bookingDate >= todayStr && bookingDate <= endDateStr;
            });

          // Group by date
          const bookingsByDate = {};
          bookings.forEach(booking => {
            const date = booking.date ? booking.date.slice(0, 10) : null;
            if (date) {
              if (!bookingsByDate[date]) {
                bookingsByDate[date] = [];
              }
              bookingsByDate[date].push(booking);
            }
          });

          state.calendarDates = { ...state.calendarDates, bookingsByDate };
          updateCalendarAttributes(
            state.calendarDates.attentionsByDate || {},
            state.calendarDates.bookingsByDate || {}
          );
        });

        loadingCalendar.value = false;
      } catch (error) {
        loadingCalendar.value = false;
      }
    };

    const updateCalendarAttributes = (attentionsByDate, bookingsByDate) => {
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[1].dates = [];
      calendarAttributes.value[2].dates = [];

      const attentionDates = Object.keys(attentionsByDate || {});
      const bookingDates = Object.keys(bookingsByDate || {});
      const bothDates = attentionDates.filter(date => bookingDates.includes(date));
      const onlyAttentionDates = attentionDates.filter(date => !bookingDates.includes(date));
      const onlyBookingDates = bookingDates.filter(date => !attentionDates.includes(date));

      // Dates with only attentions
      onlyAttentionDates.forEach(date => {
        const [year, month, day] = date.split('-');
        calendarAttributes.value[0].dates.push(new Date(+year, +month - 1, +day));
      });

      // Dates with only bookings
      onlyBookingDates.forEach(date => {
        const [year, month, day] = date.split('-');
        calendarAttributes.value[1].dates.push(new Date(+year, +month - 1, +day));
      });

      // Dates with both
      bothDates.forEach(date => {
        const [year, month, day] = date.split('-');
        calendarAttributes.value[2].dates.push(new Date(+year, +month - 1, +day));
      });
    };

    const selectDate = async date => {
      try {
        if (!date) {
          state.selectedDate = undefined;
          state.dateDetails = { attentions: [], bookings: [] };
          return;
        }

        // VDatePicker dayclick passes an object with date property: { date: Date, ... }
        let dateObj;
        if (date && typeof date === 'object' && date.date) {
          dateObj = date.date instanceof Date ? date.date : new Date(date.date);
        } else if (date instanceof Date) {
          dateObj = date;
        } else if (typeof date === 'string') {
          dateObj = new Date(date);
        } else {
          return;
        }

        // Format to YYYY-MM-DD without timezone issues
        // Use local date components instead of toISOString() which converts to UTC
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        state.selectedDate = dateStr;

        // Ensure calendarDates is initialized
        if (!state.calendarDates || !state.calendarDates.attentionsByDate) {
          await initializeCalendar();
          // Wait a bit for Firebase listeners to populate data
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Double-check after initialization
        if (!state.calendarDates) {
          state.calendarDates = { attentionsByDate: {}, bookingsByDate: {} };
        }
        if (!state.calendarDates.attentionsByDate) {
          state.calendarDates.attentionsByDate = {};
        }
        if (!state.calendarDates.bookingsByDate) {
          state.calendarDates.bookingsByDate = {};
        }

        const attentions = state.calendarDates.attentionsByDate[dateStr] || [];
        const bookings = state.calendarDates.bookingsByDate[dateStr] || [];

        // Check if dateStr exists in the keys
        const attentionDates = Object.keys(state.calendarDates.attentionsByDate || {});
        const bookingDates = Object.keys(state.calendarDates.bookingsByDate || {});
        const foundInAttentions = attentionDates.includes(dateStr);
        const foundInBookings = bookingDates.includes(dateStr);

        if (
          !foundInAttentions &&
          !foundInBookings &&
          (attentionDates.length > 0 || bookingDates.length > 0)
        ) {
          // Try to find the date with a different format (timezone issue)
          const dateObj = new Date(dateStr + 'T00:00:00');
          const altDateStr1 = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(dateObj.getDate()).padStart(2, '0')}`;
          const altDateStr2 = dateObj.toISOString().slice(0, 10);

          // Try alternative formats
          const altAttentions =
            state.calendarDates.attentionsByDate[altDateStr1] ||
            state.calendarDates.attentionsByDate[altDateStr2] ||
            [];
          const altBookings =
            state.calendarDates.bookingsByDate[altDateStr1] ||
            state.calendarDates.bookingsByDate[altDateStr2] ||
            [];

          if (altAttentions.length > 0 || altBookings.length > 0) {
            attentions.push(...altAttentions);
            bookings.push(...altBookings);
          }
        }

        state.dateDetails = {
          attentions: attentions.map(att => {
            let serviceName = att.serviceName || 'N/A';
            if (
              att.servicesDetails &&
              Array.isArray(att.servicesDetails) &&
              att.servicesDetails.length > 0
            ) {
              serviceName = att.servicesDetails.map(s => s.name || s).join(', ');
            }

            return {
              id: att.attentionId || att.id,
              clientName:
                (att.userName || '') + (att.userLastName ? ' ' + att.userLastName : '') ||
                att.userIdNumber ||
                'N/A',
              clientId: att.userIdNumber || att.userId || 'N/A',
              hour:
                att.createdDate || att.createdAt || att.date
                  ? new Date(att.createdDate || att.createdAt || att.date).toLocaleTimeString(
                      'es-ES',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )
                  : 'N/A',
              service: serviceName,
              number: att.number,
              status: att.status,
            };
          }),
          bookings: bookings.map(booking => {
            let serviceName = 'N/A';
            if (
              booking.servicesDetails &&
              Array.isArray(booking.servicesDetails) &&
              booking.servicesDetails.length > 0
            ) {
              serviceName = booking.servicesDetails.map(s => s.name || s).join(', ');
            }

            let hour = 'N/A';
            if (booking.hourFrom) {
              hour = booking.hourFrom;
            } else if (booking.block && typeof booking.block === 'object') {
              hour = booking.block.hourFrom || 'N/A';
            }

            let userName = 'N/A';
            let userIdNumber = 'N/A';
            if (booking.userName) {
              userName =
                (booking.userName || '') + (booking.userLastName ? ' ' + booking.userLastName : '');
            } else if (booking.user && typeof booking.user === 'object') {
              userName =
                (booking.user.name || '') +
                (booking.user.lastName ? ' ' + booking.user.lastName : '');
              userIdNumber = booking.user.idNumber || booking.userId || 'N/A';
            }
            if (!userIdNumber && booking.userIdNumber) {
              userIdNumber = booking.userIdNumber;
            }

            return {
              id: booking.bookingId || booking.id,
              clientName: userName || userIdNumber || 'N/A',
              clientId: userIdNumber || booking.userId || 'N/A',
              hour,
              service: serviceName,
              date: booking.date,
              status: booking.status,
            };
          }),
        };
      } catch (error) {
        // Error selecting date
      }
    };

    const goToAttention = attentionId => {
      router.push({ path: `/interno/colaborador/atencion/${attentionId}/validar` });
    };

    const formattedDate = date => {
      if (!date) return '';
      // If date is already in YYYY-MM-DD format, parse it correctly
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
      }
      if (typeof date === 'string') {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('es-ES');
        }
        return date;
      }
      if (date instanceof Date) {
        return date.toLocaleDateString('es-ES');
      }
      return String(date);
    };

    const formattedTime = time => {
      if (!time || time === 'N/A') return time;
      if (typeof time === 'string' && time.includes(':')) {
        return time;
      }
      return time;
    };

    // Calculate elapsed time and status for attention
    const getAttentionElapsedTime = attention => {
      if (!attention) return null;
      const createdDate = attention.createdDate || attention.createdAt;
      if (!createdDate) return null;

      let created;
      if (createdDate instanceof Date) {
        created = createdDate;
      } else if (createdDate.toDate && typeof createdDate.toDate === 'function') {
        created = createdDate.toDate();
      } else if (createdDate.seconds) {
        created = new Date(createdDate.seconds * 1000);
      } else {
        created = new Date(createdDate);
      }

      const now = new Date();
      const diffMs = now - created;
      const minutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);

      let elapsedDisplay = '';
      if (minutes < 60) {
        elapsedDisplay = `${minutes} min`;
      } else if (hours < 24) {
        elapsedDisplay = `${hours}h ${minutes % 60}min`;
      } else {
        const days = Math.floor(hours / 24);
        elapsedDisplay = `${days}d ${hours % 24}h`;
      }

      let timeStatus = 'neutral';
      let timeColor = '#a9a9a9';
      if (minutes < 10) {
        timeStatus = 'excellent';
        timeColor = '#00c2cb';
      } else if (minutes < 60) {
        timeStatus = 'good';
        timeColor = '#f9c322';
      } else if (minutes < 180) {
        timeStatus = 'warning';
        timeColor = '#ff9800';
      } else {
        timeStatus = 'poor';
        timeColor = '#a52a2a';
      }

      return {
        minutes,
        elapsedDisplay,
        timeStatus,
        timeColor,
      };
    };

    const getAttentionStatusMessage = timeStatus => {
      const messages = {
        excellent: 'Excelente: Menos de 10 minutos de espera',
        good: 'Bom: Menos de 1 hora de espera',
        warning: 'Atenção: Menos de 3 horas de espera',
        poor: 'Urgente: Mais de 3 horas de espera',
        neutral: 'Status não disponível',
      };
      return messages[timeStatus] || messages.neutral;
    };

    const pendingBookingsCount = bookings =>
      bookings.filter(b => b.status === 'PENDING' && !b.attentionId).length;

    // Watch attentions wrapper itself - fires when it's initialized
    async function handleAttentionsWrapperInit(newWrapper, oldWrapper) {
      // When wrapper is first initialized, process it immediately
      if (newWrapper && newWrapper !== oldWrapper) {
        // Handle both ref and direct array cases
        let attentionsArray = null;
        if (Array.isArray(newWrapper)) {
          attentionsArray = newWrapper;
        } else if (newWrapper.value && Array.isArray(newWrapper.value)) {
          attentionsArray = newWrapper.value;
        }
        if (attentionsArray) {
          checkQueueStatus(newWrapper);
          await updateTodayAttentionsFromFirebase(attentionsArray);
        }
      }
    }

    watch(attentionsWrapper, handleAttentionsWrapperInit);

    // Watch attentions wrapper value for changes (same as CollaboratorQueuesView)
    function attentionsWrapperValueGetter() {
      // Watch the value inside the wrapper
      const wrapper = attentionsWrapper.value;
      if (!wrapper) {
        return null; // Not initialized yet
      }

      try {
        // Handle both ref and direct array cases
        let array = null;
        if (Array.isArray(wrapper)) {
          array = wrapper;
        } else if (wrapper.value !== undefined && wrapper.value !== null) {
          array = Array.isArray(wrapper.value) ? wrapper.value : [];
        }

        if (array) {
          // Return a string representation for deep comparison
          // Include length and all IDs to better detect changes
          return JSON.stringify({
            length: array.length,
            ids: array.map(a => a.id).sort(),
          });
        }
      } catch (error) {
        // Error accessing attentions.value
      }
      return JSON.stringify({ length: 0, ids: [] });
    }

    async function handleAttentionsWrapperValueChange(newValue, oldValue) {
      // Skip if wrapper is not initialized yet
      if (newValue === null) {
        initializeQueueStatus();
        return;
      }
      // Get the actual array from the ref
      const currentAttentionsRef = attentionsWrapper.value;
      if (!currentAttentionsRef) {
        initializeQueueStatus();
        return;
      }
      // Get the actual array - handle both ref and direct array cases
      let attentionsArray = null;
      if (Array.isArray(currentAttentionsRef)) {
        // Already an array (unwrapped by Vue reactivity)
        attentionsArray = currentAttentionsRef;
      } else if (currentAttentionsRef && currentAttentionsRef.value !== undefined) {
        // It's a ref, get the value
        attentionsArray = currentAttentionsRef.value;
      }

      // Always call checkQueueStatus - it will handle empty arrays correctly
      await checkQueueStatus(currentAttentionsRef);

      // Always update today's attentions list from Firebase in real-time
      // We always update because even if the summary looks the same, the data might have changed
      // (e.g., user details, timestamps, etc.) and we need to refresh the formatted list
      if (attentionsArray && Array.isArray(attentionsArray)) {
        await updateTodayAttentionsFromFirebase(attentionsArray);
      } else {
        // If no attentions, clear the list
        state.todayAttentions = [];
      }
    }

    watch(attentionsWrapperValueGetter, handleAttentionsWrapperValueChange);

    watch(show, async () => {
      if (show.value === true) {
        await initializeSpy();
      }
    });

    watch(commerce, async () => {
      if (show.value === true && commerce.value && commerce.value.id) {
        // Clear cache when commerce changes
        if (state.commerce && state.commerce.id && state.commerce.id !== commerce.value.id) {
          lastLoadedCommerceId.value = null;
          calendarDataCache.value = null;
          lastCalendarCommerceId.value = null;
        }
        state.commerce = commerce.value;
        await loadCommerceData();
      }
    });

    watch(collaborator, async () => {
      if (show.value === true && collaborator.value) {
        state.collaborator = collaborator.value;
        await getAvailableCommerces();
        if (state.commerces && state.commerces.length > 0) {
          state.commerce = state.commerces[0];
        }
        await loadCommerceData();
      }
    });

    return {
      state,
      loading,
      loadingCalendar,
      alertError,
      dateMask,
      calendarAttributes,
      selectDate,
      formattedDate,
      formattedTime,
      goToAttention,
      pendingBookingsCount,
      selectCommerce,
      selectCommerceById,
      getQueueAttentionsCount,
      getAttentionElapsedTime,
      getAttentionStatusMessage,
      getTotalAttentionsCount,
    };
  },
};
</script>

<template>
  <div>
    <div v-if="show">
      <div v-if="loading === true">
        <Spinner :show="loading"></Spinner>
      </div>
      <div v-if="loading === false">
        <div v-if="state.dedicatedQueues.length === 0" class="text-center mt-3">
          <Message
            :title="$t('collaboratorSpySection.message.noQueue.title')"
            :content="$t('collaboratorSpySection.message.noQueue.content')"
            :icon="'bi bi-info-circle'"
          >
          </Message>
        </div>
        <div v-else>
          <!-- Commerce Selector -->
          <div
            v-if="state.commerces && state.commerces.length > 1"
            class="spy-commerce-selector mb-3"
          >
            <div class="spy-selector-label">
              <i class="bi bi-shop"></i>
              <span>{{ $t('collaboratorSpySection.selectCommerce') }}</span>
            </div>
            <select
              class="form-select spy-commerce-select"
              :value="state.commerce.id"
              @change="selectCommerceById($event.target.value)"
            >
              <option v-for="com in state.commerces" :key="com.id" :value="com.id">
                {{ com.name || com.tag || com.id }}
              </option>
            </select>
          </div>

          <!-- Today's Attentions Card -->
          <div class="spy-today-attentions-card mb-3">
            <div class="spy-card-header">
              <div
                class="spy-card-header-content"
                @click="state.showTodayAttentionsDetails = !state.showTodayAttentionsDetails"
              >
                <div class="spy-card-icon">
                  <i class="bi bi-qr-code"></i>
                </div>
                <div class="spy-card-title-content">
                  <div class="spy-card-title">
                    {{ $t('collaboratorSpySection.todayAttentions') }}
                  </div>
                  <div
                    v-if="state.dedicatedQueues && state.dedicatedQueues.length > 0"
                    class="spy-card-value-wrapper"
                  >
                    <div class="spy-card-value">
                      <span v-if="state.dedicatedQueues.length === 1">
                        {{ getQueueAttentionsCount(state.dedicatedQueues[0].id) }}
                      </span>
                      <span v-else>
                        {{ getTotalAttentionsCount }}
                      </span>
                    </div>
                    <span class="spy-live-indicator" title="Actualización en tiempo real">
                      <span class="spy-live-dot"></span>
                    </span>
                  </div>
                </div>
              </div>
              <div class="spy-card-header-actions">
                <!-- Queue Link Button -->
                <div
                  v-if="state.dedicatedQueues && state.dedicatedQueues.length > 0"
                  class="spy-queue-link-inline"
                >
                  <div v-if="state.dedicatedQueues.length === 1">
                    <a
                      :href="`/interno/colaborador/fila/${state.dedicatedQueues[0].id}/atenciones`"
                      class="btn btn-sm btn-outline-primary spy-queue-button-inline"
                      @click.stop
                    >
                      {{ $t('collaboratorSpySection.goToQueue') }}
                    </a>
                  </div>
                  <div v-else>
                    <a
                      :href="`/interno/commerce/${state.commerce.id}/colaborador/filas`"
                      class="btn btn-sm btn-outline-primary spy-queue-button-inline"
                      @click.stop
                    >
                      {{ $t('collaboratorSpySection.goToQueue') }}
                    </a>
                  </div>
                </div>
                <div
                  class="spy-card-toggle"
                  @click="state.showTodayAttentionsDetails = !state.showTodayAttentionsDetails"
                >
                  <i
                    :class="
                      state.showTodayAttentionsDetails ? 'bi bi-chevron-up' : 'bi bi-chevron-down'
                    "
                  ></i>
                </div>
              </div>
            </div>
            <Transition name="slide-down">
              <div v-if="state.showTodayAttentionsDetails" class="spy-card-details">
                <div v-if="state.todayAttentions.length === 0" class="spy-no-data">
                  <Message
                    :title="$t('collaboratorSpySection.message.noData.title')"
                    :content="$t('collaboratorSpySection.message.noData.content')"
                    :icon="'bi bi-info-circle'"
                  >
                  </Message>
                </div>
                <div v-else class="spy-attentions-list">
                  <div
                    v-for="(attention, index) in state.todayAttentions"
                    :key="`today-att-${index}`"
                    :class="[
                      'spy-attention-item',
                      { clickable: index === 0, 'reference-only': index > 0 },
                    ]"
                    @click="index === 0 ? goToAttention(attention.id) : null"
                  >
                    <div class="spy-attention-status-indicator">
                      <Popper
                        v-if="getAttentionElapsedTime(attention)"
                        :class="'dark'"
                        arrow
                        hover
                        disable-click-away
                        placement="left"
                        :z-index="10001"
                      >
                        <template #content>
                          <div class="popper-content">
                            <div class="popper-title">Status de Espera</div>
                            <div class="popper-item">
                              <span
                                class="popper-color"
                                :style="{
                                  background: getAttentionElapsedTime(attention).timeColor,
                                }"
                              ></span>
                              <span>{{
                                getAttentionStatusMessage(
                                  getAttentionElapsedTime(attention).timeStatus
                                )
                              }}</span>
                            </div>
                            <div class="popper-item">
                              <span
                                ><strong>Tempo:</strong>
                                {{ getAttentionElapsedTime(attention).elapsedDisplay }}</span
                              >
                            </div>
                          </div>
                        </template>
                        <div
                          class="spy-status-dot"
                          :class="`spy-status-${getAttentionElapsedTime(attention).timeStatus}`"
                          :style="{ backgroundColor: getAttentionElapsedTime(attention).timeColor }"
                        ></div>
                      </Popper>
                      <div
                        v-else
                        class="spy-status-dot spy-status-neutral"
                        title="Fecha de creación no disponible"
                      ></div>
                    </div>
                    <div class="spy-attention-info">
                      <div class="spy-attention-header">
                        <div v-if="attention.number" class="spy-attention-number-large">
                          {{ $t('collaboratorSpySection.number') }}:
                          <strong>{{ attention.number }}</strong>
                        </div>
                        <div
                          v-if="attention.clientName && attention.clientName !== 'N/A'"
                          class="spy-attention-name-secondary"
                        >
                          {{ attention.clientName }}
                        </div>
                      </div>
                      <div class="spy-attention-meta">
                        <span v-if="attention.clientId && attention.clientId !== 'N/A'"
                          ><i class="bi bi-person-badge"></i> {{ attention.clientId }}</span
                        >
                        <span><i class="bi bi-clock"></i> {{ formattedTime(attention.hour) }}</span>
                        <span v-if="attention.service && attention.service !== 'N/A'"
                          ><i class="bi bi-briefcase"></i> {{ attention.service }}</span
                        >
                      </div>
                    </div>
                    <div v-if="index === 0" class="spy-attention-action">
                      <i class="bi bi-arrow-right-circle"></i>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Week and Month Bookings Cards -->
          <div class="spy-bookings-cards mb-3">
            <div class="spy-booking-card">
              <div class="spy-card-header">
                <div class="spy-card-header-content">
                  <div class="spy-card-icon spy-card-icon-week">
                    <i class="bi bi-calendar-week"></i>
                  </div>
                  <div class="spy-card-title-content">
                    <div class="spy-card-title">
                      {{ $t('collaboratorSpySection.weekBookings') }}
                    </div>
                    <div class="spy-card-value">{{ state.weekBookings.length }}</div>
                  </div>
                </div>
              </div>
              <div class="spy-card-subtitle">
                <span class="spy-card-subtitle-text">
                  {{ $t('collaboratorSpySection.pendingToAttend') }}:
                  <strong>{{ pendingBookingsCount(state.weekBookings) }}</strong>
                </span>
              </div>
            </div>
            <div class="spy-booking-card">
              <div class="spy-card-header">
                <div class="spy-card-header-content">
                  <div class="spy-card-icon spy-card-icon-month">
                    <i class="bi bi-calendar-month"></i>
                  </div>
                  <div class="spy-card-title-content">
                    <div class="spy-card-title">
                      {{ $t('collaboratorSpySection.monthBookings') }}
                    </div>
                    <div class="spy-card-value">{{ state.monthBookings.length }}</div>
                  </div>
                </div>
              </div>
              <div class="spy-card-subtitle">
                <span class="spy-card-subtitle-text">
                  {{ $t('collaboratorSpySection.pendingToAttend') }}:
                  <strong>{{ pendingBookingsCount(state.monthBookings) }}</strong>
                </span>
              </div>
            </div>
          </div>

          <!-- Calendar -->
          <div class="spy-calendar-section">
            <div class="spy-calendar-title mb-3">
              <i class="bi bi-calendar3-range"></i>
              <span>{{ $t('collaboratorSpySection.calendarTitle') }}</span>
            </div>
            <Spinner :show="loadingCalendar"></Spinner>
            <div v-if="!loadingCalendar" class="spy-calendar-container">
              <div class="spy-calendar-wrapper">
                <VDatePicker
                  :locale="state.locale"
                  v-model="state.selectedDate"
                  :mask="dateMask"
                  :min-date="state.minDate"
                  :max-date="state.maxDate"
                  :attributes="calendarAttributes"
                  @dayclick="selectDate"
                  class="spy-date-picker"
                />
              </div>
              <div class="spy-calendar-legend">
                <div class="legend-item">
                  <span class="legend-color legend-blue"></span>
                  <span class="legend-text">{{ $t('collaboratorSpySection.attentions') }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color legend-green"></span>
                  <span class="legend-text">{{ $t('collaboratorSpySection.bookings') }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color legend-purple"></span>
                  <span class="legend-text">{{ $t('collaboratorSpySection.both') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Date Details -->
          <div v-if="state.selectedDate" class="spy-date-details mt-3">
            <div class="spy-title mb-2">
              <i class="bi bi-list-ul"></i>
              <span>{{ formattedDate(state.selectedDate) }}</span>
            </div>

            <!-- Attentions List -->
            <div v-if="state.dateDetails.attentions.length > 0" class="spy-details-section mb-3">
              <div class="spy-details-header">
                <i class="bi bi-qr-code"></i>
                <span
                  >{{ $t('collaboratorSpySection.attentions') }} ({{
                    state.dateDetails.attentions.length
                  }})</span
                >
              </div>
              <div class="spy-details-list spy-attentions-list">
                <div
                  v-for="(attention, index) in state.dateDetails.attentions"
                  :key="`att-${index}`"
                  :class="['spy-attention-item', { 'reference-only': index > 0 }]"
                >
                  <div
                    class="spy-attention-status-indicator"
                    v-if="getAttentionElapsedTime(attention)"
                  >
                    <Popper
                      :class="'dark'"
                      arrow
                      hover
                      disable-click-away
                      placement="left"
                      :z-index="10001"
                    >
                      <template #content>
                        <div class="popper-content">
                          <div class="popper-title">Status de Espera</div>
                          <div class="popper-item">
                            <span
                              class="popper-color"
                              :style="{ background: getAttentionElapsedTime(attention).timeColor }"
                            ></span>
                            <span>{{
                              getAttentionStatusMessage(
                                getAttentionElapsedTime(attention).timeStatus
                              )
                            }}</span>
                          </div>
                          <div class="popper-item">
                            <span
                              ><strong>Tempo:</strong>
                              {{ getAttentionElapsedTime(attention).elapsedDisplay }}</span
                            >
                          </div>
                        </div>
                      </template>
                      <div
                        class="spy-status-dot"
                        :class="`spy-status-${getAttentionElapsedTime(attention).timeStatus}`"
                        :style="{ backgroundColor: getAttentionElapsedTime(attention).timeColor }"
                      ></div>
                    </Popper>
                  </div>
                  <div class="spy-attention-info">
                    <div class="spy-attention-header">
                      <div v-if="attention.number" class="spy-attention-number-large">
                        {{ $t('collaboratorSpySection.number') }}:
                        <strong>{{ attention.number }}</strong>
                      </div>
                      <div
                        v-if="attention.clientName && attention.clientName !== 'N/A'"
                        class="spy-attention-name-secondary"
                      >
                        {{ attention.clientName }}
                      </div>
                    </div>
                    <div class="spy-attention-meta">
                      <span v-if="attention.clientId && attention.clientId !== 'N/A'"
                        ><i class="bi bi-person-badge"></i> {{ attention.clientId }}</span
                      >
                      <span><i class="bi bi-clock"></i> {{ formattedTime(attention.hour) }}</span>
                      <span v-if="attention.service && attention.service !== 'N/A'"
                        ><i class="bi bi-briefcase"></i> {{ attention.service }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bookings List -->
            <div v-if="state.dateDetails.bookings.length > 0" class="spy-details-section mb-3">
              <div class="spy-details-header">
                <i class="bi bi-calendar-check-fill"></i>
                <span
                  >{{ $t('collaboratorSpySection.bookings') }} ({{
                    state.dateDetails.bookings.length
                  }})</span
                >
              </div>
              <div class="spy-details-list spy-attentions-list">
                <div
                  v-for="(booking, index) in state.dateDetails.bookings"
                  :key="`book-${index}`"
                  :class="[
                    'spy-attention-item',
                    { clickable: index === 0, 'reference-only': index > 0 },
                  ]"
                >
                  <div class="spy-attention-info">
                    <div class="spy-attention-header">
                      <div class="spy-attention-number-large">
                        <i class="bi bi-calendar-check-fill"></i>
                        {{ $t('collaboratorSpySection.bookings') }}
                      </div>
                      <div
                        v-if="booking.clientName && booking.clientName !== 'N/A'"
                        class="spy-attention-name-secondary"
                      >
                        {{ booking.clientName }}
                      </div>
                    </div>
                    <div class="spy-attention-meta">
                      <span v-if="booking.clientId && booking.clientId !== 'N/A'"
                        ><i class="bi bi-person-badge"></i> {{ booking.clientId }}</span
                      >
                      <span><i class="bi bi-clock"></i> {{ formattedTime(booking.hour) }}</span>
                      <span v-if="booking.service && booking.service !== 'N/A'"
                        ><i class="bi bi-briefcase"></i> {{ booking.service }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- No data message -->
            <div
              v-if="
                state.dateDetails.attentions.length === 0 && state.dateDetails.bookings.length === 0
              "
              class="text-center mt-3"
            >
              <Message
                :title="$t('collaboratorSpySection.message.noData.title')"
                :content="$t('collaboratorSpySection.message.noData.content')"
                :icon="'bi bi-calendar-x'"
              >
              </Message>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spy-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Commerce Selector */
.spy-commerce-selector {
  background: #ffffff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.spy-selector-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spy-selector-label i {
  font-size: 1rem;
  color: #004aad;
}

.spy-commerce-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  font-size: 0.95rem;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.spy-commerce-select:hover {
  border-color: #004aad;
}

.spy-commerce-select:focus {
  border-color: #004aad;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

/* Queue Link Inline */
.spy-queue-link-inline {
  margin-right: 0.5rem;
}

.spy-queue-button-inline {
  padding: 0.35rem 0.75rem;
  font-weight: 500;
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 74, 173, 0.3);
  background: rgba(0, 74, 173, 0.05);
  white-space: nowrap;
  font-size: 0.85rem;
  color: rgba(0, 74, 173, 0.9);
}

.spy-queue-button-inline:hover {
  background: rgba(0, 74, 173, 0.1);
  border-color: rgba(0, 74, 173, 0.5);
  transform: translateY(-1px);
  color: rgba(0, 74, 173, 1);
}

.spy-card-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Today Attentions Card */
.spy-today-attentions-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-left: 4px solid #004aad;
}

.spy-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  gap: 0.75rem;
}

.spy-card-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  cursor: pointer;
}

.spy-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #004aad 0%, #446ffc 100%);
}

.spy-card-icon i {
  font-size: 1.5rem;
  color: #fff;
}

.spy-card-title-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.spy-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.25rem;
}

.spy-card-value-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
}

.spy-card-value {
  font-size: 2rem;
  font-weight: 700;
  color: #000;
  line-height: 1;
  text-align: center;
}

.spy-live-indicator {
  display: flex;
  align-items: center;
  position: relative;
}

.spy-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #28a745;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(40, 167, 69, 0);
    opacity: 0.8;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
    opacity: 1;
  }
}

.spy-card-value {
  font-size: 2rem;
  font-weight: 700;
  color: #000;
  line-height: 1;
}

.spy-card-toggle {
  font-size: 1.25rem;
  color: rgba(0, 0, 0, 0.5);
}

.spy-card-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.spy-attentions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spy-attention-item {
  padding: 0.6rem 0.75rem;
  padding-left: 2rem;
  background: rgba(0, 74, 173, 0.05);
  border-radius: 8px;
  border-left: 3px solid #004aad;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
  position: relative;
}

.spy-attention-item.clickable {
  cursor: pointer;
}

.spy-attention-item.clickable:hover {
  background: rgba(0, 74, 173, 0.1);
  transform: translateX(4px);
}

.spy-attention-item.reference-only {
  opacity: 0.65;
  background: rgba(0, 0, 0, 0.02);
  cursor: default;
  border-left-color: rgba(0, 74, 173, 0.3);
}

.spy-attention-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.spy-attention-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.15rem;
}

.spy-attention-number-large {
  font-size: 0.95rem;
  font-weight: 600;
  color: #004aad;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  line-height: 1.2;
}

.spy-attention-number-large strong {
  font-size: 1.1rem;
  font-weight: 700;
  color: #004aad;
}

.spy-attention-name-secondary {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.65);
  font-style: italic;
  line-height: 1.2;
}

.spy-attention-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.spy-attention-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.spy-attention-meta i {
  font-size: 0.875rem;
}

.spy-attention-action {
  font-size: 1.25rem;
  color: #004aad;
}

/* Time Status Indicator */
.spy-attention-status-indicator {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: pointer;
}

.spy-status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: help;
  transition: transform 0.2s ease;
  display: block;
}

.spy-status-dot:hover {
  transform: scale(1.2);
}

.spy-attention-status-indicator:hover .spy-status-dot {
  transform: scale(1.2);
}

.spy-status-excellent {
  background-color: #00c2cb;
}

.spy-status-good {
  background-color: #f9c322;
}

.spy-status-warning {
  background-color: #ff9800;
}

.spy-status-poor {
  background-color: #a52a2a;
}

.spy-status-neutral {
  background-color: #a9a9a9;
}

.spy-no-data {
  padding: 1rem;
}

/* Bookings Cards */
.spy-bookings-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.spy-booking-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.spy-booking-card:first-child {
  border-left: 4px solid #00c2cb;
}

.spy-booking-card:last-child {
  border-left: 4px solid #f9c322;
}

.spy-card-icon-week {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.spy-card-icon-month {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.spy-card-subtitle {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.spy-card-subtitle-text {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
}

.spy-card-subtitle-text strong {
  color: #000;
  font-weight: 600;
}

/* Calendar Section */
.spy-calendar-section {
  margin: 1.5rem 0;
}

.spy-calendar-title {
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(0, 0, 0, 0.8);
}

.spy-calendar-container {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.spy-calendar-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.spy-date-picker {
  max-width: 100%;
}

.spy-calendar-legend {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: inline-block;
}

.legend-blue {
  background-color: rgba(0, 74, 173, 0.3);
}

.legend-green {
  background-color: rgba(0, 194, 203, 0.3);
}

.legend-purple {
  background-color: rgba(128, 0, 128, 0.3);
}

.legend-text {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

/* Date Details */
.spy-date-details {
  margin-top: 1.5rem;
}

.spy-details-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.spy-details-header {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(0, 0, 0, 0.8);
}

.spy-details-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Reuse styles from spy-attention-item for calendar details */
.spy-details-list.spy-attentions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Legacy styles - can be removed if not used elsewhere */
.spy-detail-item {
  padding: 0.6rem 0.75rem;
  background: rgba(0, 74, 173, 0.05);
  border-radius: 8px;
  border-left: 3px solid #004aad;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.spy-detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.spy-detail-name {
  font-size: 0.95rem;
  color: #000;
}

.spy-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.spy-detail-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.spy-detail-meta i {
  font-size: 0.875rem;
}

/* Transitions */
.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.3s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}

@media (max-width: 768px) {
  .spy-bookings-cards {
    grid-template-columns: 1fr;
  }

  .spy-card-value {
    font-size: 1.75rem;
  }

  .spy-calendar-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .spy-attention-meta,
  .spy-detail-meta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .spy-calendar-container {
    padding: 1rem;
  }
}
</style>
