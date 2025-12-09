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
import { getCommerceById } from '../../application/services/commerce';
import { getGroupedQueueByCommerceId } from '../../application/services/queue';
import { getActiveFeature } from '../../shared/features';
import { globalStore } from '../../stores';
import { getCollaboratorById } from '../../application/services/collaborator';
import { DateModel } from '../../shared/utils/date.model';
import { updatedAvailableAttentionsByCommerce } from '../../application/firebase';
import Message from '../common/Message.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';

export default {
  name: 'CollaboratorSpySection',
  components: { Message, Spinner, Alert },
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
      minDate: new Date().setDate(new Date().getDate() - 30),
      maxDate: new Date().setDate(new Date().getDate() + 30),
      locale: 'es',
      queueStatus: {},
      attentionsWrapper: null,
    });

    // Cache to prevent duplicate API calls
    const lastLoadedCommerceId = ref(null);
    const calendarDataCache = ref(null);
    const lastCalendarCommerceId = ref(null);

    let attentionsUnsubscribe = null;

    // Register onUnmounted BEFORE any await statements
    // Only register if we have an active component instance
    const instance = getCurrentInstance();
    if (instance) {
      onUnmounted(() => {
        if (attentionsUnsubscribe) {
          attentionsUnsubscribe();
        }
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
        console.error('Error getting available commerces:', error);
        state.commerces = [];
      }
    };

    const loadCommerceData = async () => {
      if (!state.commerce || !state.commerce.id) return;

      // Skip if already loaded for this commerce
      if (state.commerce.id === lastLoadedCommerceId.value) {
        return;
      }

      // Cleanup previous subscription
      if (attentionsUnsubscribe) {
        attentionsUnsubscribe();
        attentionsUnsubscribe = null;
      }

      // Get dedicated queues for this collaborator
      await getDedicatedQueues();

      // Initialize queue status
      initializeQueueStatus();

      // Subscribe to real-time attentions
      subscribeToAttentions();

      // Load data in parallel where possible
      await Promise.all([getTodayAttentions(), getWeekAndMonthBookings()]);

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

    const subscribeToAttentions = () => {
      if (!state.commerce || !state.commerce.id) return;

      const attentions = updatedAvailableAttentionsByCommerce(state.commerce.id);
      state.attentionsWrapper = attentions;
    };

    // Watch attentions wrapper for changes
    watch(
      () => {
        try {
          const currentAttentionsRef = state.attentionsWrapper;
          if (
            currentAttentionsRef &&
            currentAttentionsRef.value !== undefined &&
            currentAttentionsRef.value !== null
          ) {
            return Array.isArray(currentAttentionsRef.value) ? currentAttentionsRef.value : [];
          }
        } catch (error) {
          console.error('Error accessing attentions.value:', error);
        }
        return [];
      },
      newValue => {
        if (newValue && Array.isArray(newValue)) {
          if (newValue.length > 0) {
            checkQueueStatus(newValue);
          } else {
            initializeQueueStatus();
          }
        } else {
          initializeQueueStatus();
        }
      },
      { immediate: true, deep: true }
    );

    const checkQueueStatus = attentionsArray => {
      if (!attentionsArray || attentionsArray.length === 0) {
        initializeQueueStatus();
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

        if (state.dedicatedQueues && state.dedicatedQueues.length > 0) {
          state.dedicatedQueues.forEach(queue => {
            if (queue && queue.id && filteredAttentionsByQueue[queue.id]) {
              const attentionsCount = filteredAttentionsByQueue[queue.id].length;
              state.queueStatus[queue.id] = attentionsCount;
            } else if (queue && queue.id) {
              state.queueStatus[queue.id] = 0;
            }
          });
        }
      } catch (error) {
        console.error('Error in checkQueueStatus:', error);
        initializeQueueStatus();
      }
    };

    const getQueueAttentionsCount = queueId => state.queueStatus[queueId] || 0;

    const getTotalAttentionsCount = () => {
      if (!state.dedicatedQueues || state.dedicatedQueues.length === 0) return 0;
      return state.dedicatedQueues.reduce(
        (total, queue) => total + (state.queueStatus[queue.id] || 0),
        0
      );
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
        console.error('Error selecting commerce:', error);
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
        console.error('Error selecting commerce by id:', error);
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
          if (Object.keys(groupedQueues).length > 0 && state.collaborator.type === 'STANDARD') {
            const collaboratorQueues = groupedQueues['COLLABORATOR'] || [];
            queues = collaboratorQueues.filter(
              queue => queue.collaboratorId === state.collaborator.id
            );
          }
        } else {
          // Filter queues where type is COLLABORATOR and collaboratorId matches
          queues = queues.filter(
            queue => queue.type === 'COLLABORATOR' && queue.collaboratorId === state.collaborator.id
          );
        }

        state.dedicatedQueues = queues;
      } catch (error) {
        console.error('Error getting dedicated queues:', error);
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
        const attentions = await getPendingAttentionsDetails(
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
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );

        const todayAttentions = (attentions || []).filter(
          att => att.queueId && queueIds.includes(att.queueId)
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
          };
        });
      } catch (error) {
        console.error('Error getting today attentions:', error);
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
        console.error('Error getting week and month bookings:', error);
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

        // Check cache
        if (calendarDataCache.value && lastCalendarCommerceId.value === state.commerce.id) {
          state.calendarDates = calendarDataCache.value.calendarDates;
          updateCalendarAttributes(
            calendarDataCache.value.attentionsByDate,
            calendarDataCache.value.bookingsByDate
          );
          loadingCalendar.value = false;
          return;
        }

        const queueIds = state.dedicatedQueues.map(q => q.id);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const from = startDate.toISOString().slice(0, 10);
        const to = endDate.toISOString().slice(0, 10);

        // Get attentions and bookings in parallel
        const [attentions, bookings] = await Promise.all([
          getPendingAttentionsDetails(
            state.commerce.id,
            from,
            to,
            [state.commerce.id],
            1,
            10000,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
          ),
          getBookingsDetails(
            state.commerce.id,
            from,
            to,
            [state.commerce.id],
            1,
            10000,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
          ),
        ]);

        // Filter by queue IDs
        const filteredAttentions = (attentions || []).filter(
          att => att.queueId && queueIds.includes(att.queueId)
        );
        const filteredBookings = (bookings || []).filter(
          booking =>
            booking.queueId && queueIds.includes(booking.queueId) && booking.status !== 'CANCELLED'
        );

        // Group by date
        const attentionsByDate = {};
        const bookingsByDate = {};

        filteredAttentions.forEach(att => {
          let date = null;
          if (att.createdDate) {
            if (typeof att.createdDate === 'string') {
              date = att.createdDate.slice(0, 10);
            } else if (att.createdDate instanceof Date) {
              date = att.createdDate.toISOString().slice(0, 10);
            } else if (att.createdDate.getTime) {
              date = new Date(att.createdDate).toISOString().slice(0, 10);
            }
          }
          if (date) {
            if (!attentionsByDate[date]) {
              attentionsByDate[date] = [];
            }
            attentionsByDate[date].push(att);
          }
        });

        filteredBookings.forEach(booking => {
          const date = booking.date ? booking.date.slice(0, 10) : null;
          if (date) {
            if (!bookingsByDate[date]) {
              bookingsByDate[date] = [];
            }
            bookingsByDate[date].push(booking);
          }
        });

        state.calendarDates = { attentionsByDate, bookingsByDate };

        // Update calendar attributes
        updateCalendarAttributes(attentionsByDate, bookingsByDate);

        // Cache the results
        calendarDataCache.value = {
          calendarDates: { attentionsByDate, bookingsByDate },
          attentionsByDate,
          bookingsByDate,
        };
        lastCalendarCommerceId.value = state.commerce.id;

        loadingCalendar.value = false;
      } catch (error) {
        console.error('Error initializing calendar:', error);
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

        // Handle both Date objects and string dates
        let dateStr;
        if (date instanceof Date) {
          dateStr = date.toISOString().slice(0, 10);
        } else if (typeof date === 'string') {
          dateStr = date.slice(0, 10);
        } else {
          return;
        }

        state.selectedDate = dateStr;

        const attentions = state.calendarDates.attentionsByDate[dateStr] || [];
        const bookings = state.calendarDates.bookingsByDate[dateStr] || [];

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
        console.error('Error selecting date:', error);
      }
    };

    const goToAttention = attentionId => {
      router.push({ path: `/interno/colaborador/atencion/${attentionId}/validar` });
    };

    const formattedDate = date => {
      if (!date) return '';
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('es-ES');
      }
      return date.toLocaleDateString('es-ES');
    };

    const formattedTime = time => {
      if (!time || time === 'N/A') return time;
      if (typeof time === 'string' && time.includes(':')) {
        return time;
      }
      return time;
    };

    const pendingBookingsCount = bookings =>
      bookings.filter(b => b.status === 'PENDING' && !b.attentionId).length;

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
                        {{ getTotalAttentionsCount() }}
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
                    class="spy-attention-item clickable"
                    @click="goToAttention(attention.id)"
                  >
                    <div class="spy-attention-info">
                      <div class="spy-attention-name">
                        <strong>{{ attention.clientName }}</strong>
                      </div>
                      <div class="spy-attention-meta">
                        <span><i class="bi bi-person-badge"></i> {{ attention.clientId }}</span>
                        <span><i class="bi bi-clock"></i> {{ formattedTime(attention.hour) }}</span>
                        <span><i class="bi bi-briefcase"></i> {{ attention.service }}</span>
                        <span v-if="attention.number" class="badge bg-primary"
                          >{{ $t('collaboratorSpySection.number') }}: {{ attention.number }}</span
                        >
                      </div>
                    </div>
                    <div class="spy-attention-action">
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
                  v-model.string="state.selectedDate"
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
              <div class="spy-details-list">
                <div
                  v-for="(attention, index) in state.dateDetails.attentions"
                  :key="`att-${index}`"
                  class="spy-detail-item"
                >
                  <div class="spy-detail-info">
                    <div class="spy-detail-name">
                      <strong>{{ attention.clientName }}</strong>
                    </div>
                    <div class="spy-detail-meta">
                      <span><i class="bi bi-person-badge"></i> {{ attention.clientId }}</span>
                      <span><i class="bi bi-clock"></i> {{ formattedTime(attention.hour) }}</span>
                      <span><i class="bi bi-briefcase"></i> {{ attention.service }}</span>
                      <span v-if="attention.number" class="badge bg-primary"
                        >{{ $t('collaboratorSpySection.number') }}: {{ attention.number }}</span
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
              <div class="spy-details-list">
                <div
                  v-for="(booking, index) in state.dateDetails.bookings"
                  :key="`book-${index}`"
                  class="spy-detail-item"
                >
                  <div class="spy-detail-info">
                    <div class="spy-detail-name">
                      <strong>{{ booking.clientName }}</strong>
                    </div>
                    <div class="spy-detail-meta">
                      <span><i class="bi bi-person-badge"></i> {{ booking.clientId }}</span>
                      <span><i class="bi bi-clock"></i> {{ formattedTime(booking.hour) }}</span>
                      <span><i class="bi bi-briefcase"></i> {{ booking.service }}</span>
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
  gap: 0.75rem;
}

.spy-attention-item {
  padding: 0.75rem;
  background: rgba(0, 74, 173, 0.05);
  border-radius: 8px;
  border-left: 3px solid #004aad;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
}

.spy-attention-item.clickable {
  cursor: pointer;
}

.spy-attention-item.clickable:hover {
  background: rgba(0, 74, 173, 0.1);
  transform: translateX(4px);
}

.spy-attention-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spy-attention-name {
  font-size: 0.95rem;
  color: #000;
}

.spy-attention-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
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

.spy-detail-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border-left: 3px solid #004aad;
}

.spy-detail-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spy-detail-name {
  font-size: 0.95rem;
  color: #000;
}

.spy-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
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
