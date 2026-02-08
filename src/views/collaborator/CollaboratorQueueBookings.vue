<script>
import { ref, reactive, onBeforeMount, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getQueuesByCommerceId } from '../../application/services/queue';
import { getQueueByCommerce, getGroupedQueueByCommerceId } from '../../application/services/queue';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import {
  getBookingsDetails,
  getPendingAttentionsDetails,
  getAttentionsDetails,
} from '../../application/services/query-stack';
import { DateModel } from '../../shared/utils/date.model';
import { updatedTodayAttentionsByCommerce } from '../../application/firebase';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import BookingCalendar from '../../components/bookings/domain/BookingCalendar.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import BookingDetailsCard from '../../components/clients/common/BookingDetailsCard.vue';
import AttentionDetailsCard from '../../components/clients/common/AttentionDetailsCard.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorQueueBookings',
  components: {
    Message,
    VueRecaptcha,
    Spinner,
    Alert,
    BookingCalendar,
    ComponentMenu,
    CommerceLogo,
    DesktopPageHeader,
    BookingDetailsCard,
    AttentionDetailsCard,
    Popper,
  },
  async setup() {
    const router = useRouter();

    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    // Use global commerce and module from store
    const commerce = computed(() => store.getCurrentCommerce);
    const business = computed(() => store.getCurrentBusiness);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      queue: {},
      queues: [],
      groupedQueues: [],
      collaborator: {}, // Keep for backward compatibility, but use professional for filtering
      professional: {}, // Professional data for queue filtering
      activeCommerce: false,
      captcha: false,
      locale: 'es',
      date: new Date().setDate(new Date().getDate() + 1),
      bookings: ref([]),
      waitlists: ref([]),
      availableBlocks: [],
      blocksByDay: [],
      blocks: [],
      availableAttentionBlocks: [],
      minDate: new Date().setDate(new Date().getDate() + 1),
      maxDate: new Date().setDate(new Date().getDate() + 90),
      showBooking: true,
      showWaitlist: false,
      toggles: {},
      // Dashboard stats
      stats: {
        todayCount: 0,
        pendingCount: 0,
        upcomingWeekCount: 0,
        totalActiveCount: 0,
      },
      recentBookings: [],
      recentAttentions: [],
      showAttentions: false,
      loadingStats: false,
      professionalQueues: [], // Queues specific to this professional (was collaboratorQueues)
      todayAttentionsSubscription: null, // Firebase subscription for today's attentions
      todayAttentionsWatcher: null, // Watcher stop function for today's attentions
    });

    const loadCommerceData = async () => {
      if (!commerce.value || !commerce.value.id) {
        state.queues = [];
        return;
      }
      try {
        const queues = await getQueuesByCommerceId(commerce.value.id);
        state.queues = queues || [];
        await initQueues();
        if (commerce.value.localeInfo && commerce.value.localeInfo.language) {
          state.locale = commerce.value.localeInfo.language;
        }
      } catch (error) {
        // Error loading commerce data
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.collaborator = state.currentUser;

        // Load professional data if exists (collaborator with isProfessional = true)
        if (!state.collaborator || !state.collaborator.id) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }

        // If collaborator has a professional association, load professional data
        if (state.collaborator && state.collaborator.professionalId) {
          try {
            const { getProfessionalById } = await import('../../application/services/professional');
            state.professional = await getProfessionalById(state.collaborator.professionalId);
          } catch (error) {
            console.warn('Could not load professional data, falling back to collaborator', error);
            // Fallback: use collaborator for filtering if professional load fails
            state.professional = state.collaborator;
          }
        } else {
          // Fallback: use collaborator for filtering
          state.professional = state.collaborator;
        }

        // Set initial commerce if not set - check both commerceId and commercesId
        if (!commerce.value || !commerce.value.id) {
          // First try commerceId (single commerce)
          if (state.collaborator.commerceId) {
            const { getCommerceById } = await import('../../application/services/commerce');
            const initialCommerce = await getCommerceById(state.collaborator.commerceId);
            if (initialCommerce && initialCommerce.id) {
              await store.setCurrentCommerce(initialCommerce);
            }
          }
          // If still no commerce, try commercesId (multiple commerces)
          if (
            (!commerce.value || !commerce.value.id) &&
            state.collaborator.commercesId &&
            state.collaborator.commercesId.length > 0
          ) {
            const { getCommerceById } = await import('../../application/services/commerce');
            const firstCommerceId = state.collaborator.commercesId[0];
            if (firstCommerceId) {
              const initialCommerce = await getCommerceById(firstCommerceId);
              if (initialCommerce && initialCommerce.id) {
                await store.setCurrentCommerce(initialCommerce);
              }
            }
          }
        }
        await loadCommerceData();
        store.setCurrentQueue(undefined);
        state.toggles = await getPermissions('collaborator');
        // Set up Firebase subscription for today's attentions
        setupTodayAttentionsSubscription();
        // Load dashboard stats after queues are loaded (filtered by commerce only)
        if (commerce.value && commerce.value.id) {
          await loadDashboardStats();
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    // Watch for commerce changes
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (!newCommerce || !newCommerce.id) return;
        if (oldCommerce && oldCommerce.id === newCommerce.id) return;
        try {
          loading.value = true;
          // Clear data
          state.queues = [];
          state.queue = {};
          state.bookings = [];
          state.waitlists = [];
          state.availableBlocks = [];
          state.blocksByDay = [];
          state.blocks = [];
          state.availableAttentionBlocks = [];
          state.recentBookings = [];
          state.recentAttentions = [];
          state.showAttentions = false;
          state.stats = {
            todayCount: 0,
            pendingCount: 0,
            upcomingWeekCount: 0,
            totalActiveCount: 0,
          };
          await loadCommerceData();
          // Set up Firebase subscription for today's attentions
          setupTodayAttentionsSubscription();
          // Reload dashboard stats after queues are loaded (filtered by commerce only)
          if (newCommerce && newCommerce.id) {
            await loadDashboardStats();
          }
          alertError.value = '';
          loading.value = false;
        } catch (error) {
          alertError.value = error.response?.status || 500;
          loading.value = false;
        }
      },
      { deep: true }
    );

    // Watch for module changes
    watch(
      module,
      async (newModule, oldModule) => {
        if (oldModule && oldModule.id === newModule?.id) return;
        // Module change might affect queue filtering, reload if needed
        if (newModule && newModule.id && commerce.value && commerce.value.id) {
          try {
            loading.value = true;
            await initQueues();
            // Set up Firebase subscription for today's attentions (queues might have changed)
            setupTodayAttentionsSubscription();
            // Reload dashboard stats after queues are reloaded (filtered by commerce only)
            if (commerce.value && commerce.value.id) {
              await loadDashboardStats();
            }
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { deep: true }
    );

    // Clean up Firebase subscription and watcher when component unmounts
    onUnmounted(() => {
      // Clean up watcher
      if (state.todayAttentionsWatcher) {
        state.todayAttentionsWatcher();
        state.todayAttentionsWatcher = null;
      }
      // Clean up Firebase subscription
      if (state.todayAttentionsSubscription && state.todayAttentionsSubscription._unsubscribe) {
        state.todayAttentionsSubscription._unsubscribe();
        state.todayAttentionsSubscription = null;
      }
    });

    const initQueues = async () => {
      const currentQueues = state.queues || [];

      if (
        commerce.value &&
        getActiveFeature(commerce.value, 'attention-queue-typegrouped', 'PRODUCT')
      ) {
        state.groupedQueues = await getGroupedQueueByCommerceId(commerce.value.id);

        // Check for PROFESSIONAL type group (queues assigned to collaborators/professionals)
        const hasGroupedProfessionalQueues =
          state.groupedQueues &&
          Array.isArray(state.groupedQueues['PROFESSIONAL']) &&
          state.groupedQueues['PROFESSIONAL'].length > 0;

        if (hasGroupedProfessionalQueues && state.collaborator.type === 'STANDARD') {
          const professionalGroup = state.groupedQueues['PROFESSIONAL'] || [];
          // Filter queues assigned to this professional by professionalId
          const professionalQueues = professionalGroup.filter(
            queue => queue.professionalId === state.professional.id
          );

          state.professionalQueues = professionalQueues;

          const otherQueues = currentQueues.filter(queue => queue.type !== 'PROFESSIONAL');
          const queues = [...professionalQueues, ...otherQueues];
          state.queues = queues;
          return;
        }

        if (
          Object.keys(state.groupedQueues).length > 0 &&
          state.collaborator.type === 'ASSISTANT'
        ) {
          const otherQueues = currentQueues.filter(queue => queue.type !== 'PROFESSIONAL');
          const queues = [...otherQueues];
          state.queues = queues;
          state.professionalQueues = [];
          return;
        }

        // Fallback: even with grouped queues enabled, if there is no
        // explicit PROFESSIONAL group, derive professional queues from all queues
        state.professionalQueues = currentQueues.filter(
          queue => queue.type === 'PROFESSIONAL' && queue.professionalId === state.professional.id
        );
      } else {
        // If not using grouped queues, filter professional queues from all queues
        state.professionalQueues = currentQueues.filter(
          queue => queue.type === 'PROFESSIONAL' && queue.professionalId === state.professional.id
        );
      }
    };

    // Get professional queue IDs for filtering bookings
    const getProfessionalQueueIds = () => {
      if (state.professionalQueues && state.professionalQueues.length > 0) {
        return state.professionalQueues.map(queue => queue.id);
      }
      return [];
    };

    const isActiveCommerce = () => commerce.value && commerce.value.active === true;

    const goBack = () => {
      router.push({ path: '/interno/colaborador/menu' });
    };

    // Set up Firebase real-time subscription for today's attentions
    const setupTodayAttentionsSubscription = () => {
      // Clean up existing watcher if any
      if (state.todayAttentionsWatcher) {
        state.todayAttentionsWatcher();
        state.todayAttentionsWatcher = null;
      }

      // Clean up existing subscription if any
      if (state.todayAttentionsSubscription && state.todayAttentionsSubscription._unsubscribe) {
        state.todayAttentionsSubscription._unsubscribe();
        state.todayAttentionsSubscription = null;
      }

      if (!commerce.value || !commerce.value.id) {
        state.stats.todayCount = 0;
        return;
      }

      // Subscribe to all today's attentions for this commerce (filtered by commerce only)
      const todayAttentionsRef = updatedTodayAttentionsByCommerce(commerce.value.id);
      state.todayAttentionsSubscription = todayAttentionsRef;

      // Watch for changes and update the count
      state.todayAttentionsWatcher = watch(
        todayAttentionsRef,
        attentions => {
          if (!attentions || !Array.isArray(attentions)) {
            state.stats.todayCount = 0;
            return;
          }

          // Filter by today's date only (commerce filter is already applied by Firebase subscription)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = new DateModel().toString(); // Format: YYYY-MM-DD

          const filteredAttentions = attentions.filter(attention => {
            // Filter by today's date
            const dateValue = attention.date || attention.createdAt || attention.createdDate;
            if (!dateValue) return false;

            // Handle different date formats
            try {
              let attentionDate;
              if (dateValue instanceof Date) {
                attentionDate = dateValue;
              } else if (typeof dateValue === 'string') {
                // If it's already in YYYY-MM-DD format, compare directly
                if (dateValue.length === 10 && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  return dateValue === todayStr;
                }
                attentionDate = new Date(dateValue);
              } else if (dateValue && dateValue.toDate && typeof dateValue.toDate === 'function') {
                // Firebase Timestamp
                attentionDate = dateValue.toDate();
              } else if (dateValue && dateValue.seconds) {
                // Firebase Timestamp as object with seconds
                attentionDate = new Date(dateValue.seconds * 1000);
              } else {
                return false;
              }

              // Check if date is valid
              if (isNaN(attentionDate.getTime())) {
                return false;
              }

              // Compare dates (only date, not time)
              const attentionDateOnly = new Date(attentionDate);
              attentionDateOnly.setHours(0, 0, 0, 0);

              return attentionDateOnly.getTime() === today.getTime();
            } catch (error) {
              // If date parsing fails, include it if createdAt is today (from Firebase query)
              // This handles edge cases where date parsing might fail
              return true;
            }
          });

          state.stats.todayCount = filteredAttentions.length;
        },
        { immediate: true }
      );
    };

    // Load dashboard stats filtered by commerce only
    const loadDashboardStats = async () => {
      // Build commerceIds list from collaborator relations (all commerces where
      // this professional attends), defaulting to current commerce when needed.
      let commerceIds = [];
      if (state.collaborator.commercesId && state.collaborator.commercesId.length > 0) {
        commerceIds = [...state.collaborator.commercesId];
      } else if (state.collaborator.commerceId) {
        commerceIds = [state.collaborator.commerceId];
      } else if (commerce.value && commerce.value.id) {
        commerceIds = [commerce.value.id];
      }

      if (!commerce.value || !commerce.value.id) {
        // Even if commerce in store is not set, without at least one commerceId
        // we cannot query stats.
        if (!commerceIds || commerceIds.length === 0) {
          return;
        }
      }

      try {
        state.loadingStats = true;
        const today = new DateModel().toString();
        const endOfWeek = new DateModel().addDays(7).toString();
        const endOfMonth = new DateModel().endOfMonth().toString();

        // Note: todayCount is now updated by Firebase subscription, so we don't need to fetch it here
        // But we still fetch other stats

        // Get pending bookings filtered by commerce only (no queueId filter)
        const pendingBookings = await getBookingsDetails(
          commerce.value?.id || commerceIds[0],
          today,
          endOfMonth,
          commerceIds,
          1,
          100,
          undefined,
          undefined, // No queueId filter - filter by commerce only
          true,
          undefined,
          'PENDING'
        );
        state.stats.pendingCount = pendingBookings?.length || 0;

        // Get upcoming week bookings filtered by commerce only (no queueId filter)
        const upcomingBookings = await getBookingsDetails(
          commerce.value?.id || commerceIds[0],
          today,
          endOfWeek,
          commerceIds,
          1,
          100,
          undefined,
          undefined, // No queueId filter - filter by commerce only
          true
        );
        state.stats.upcomingWeekCount = upcomingBookings?.length || 0;

        // Get confirmed bookings filtered by commerce only (no queueId filter)
        const confirmedBookings = await getBookingsDetails(
          commerce.value?.id || commerceIds[0],
          today,
          endOfMonth,
          commerceIds,
          1,
          100,
          undefined,
          undefined, // No queueId filter - filter by commerce only
          true,
          undefined,
          'CONFIRMED'
        );
        state.stats.totalActiveCount =
          (pendingBookings?.length || 0) + (confirmedBookings?.length || 0);

        // Get recent bookings (last 5) filtered by commerce only (no queueId filter)
        const recentBookings = await getBookingsDetails(
          commerce.value?.id || commerceIds[0],
          new DateModel().substractDays(7).toString(),
          endOfMonth,
          commerceIds,
          1,
          5,
          undefined,
          undefined, // No queueId filter - filter by commerce only
          false
        );
        // Sort by date, then take first 5
        const sortedRecentBookings = (recentBookings || []).filter(Boolean);
        sortedRecentBookings.sort((a, b) => {
          const dateA = new Date(a.date || a.createdDate);
          const dateB = new Date(b.date || b.createdDate);
          return dateB - dateA;
        });
        state.recentBookings = sortedRecentBookings.slice(0, 5);

        state.loadingStats = false;
      } catch (error) {
        state.loadingStats = false;
      }
    };

    const viewTodayBookings = async () => {
      if (!commerce.value || !commerce.value.id) return;

      try {
        loading.value = true;
        const today = new DateModel().toString();

        // Get today's attentions filtered by commerce only (no queueId filter)
        // Use getAttentionsDetails to get all attentions (not just pending) for today
        try {
          const attentions = await getAttentionsDetails(
            commerce.value.id,
            today,
            today,
            [commerce.value.id],
            1,
            1000, // Increased limit to get more results
            undefined, // daysSinceType
            undefined, // daysSinceContacted
            undefined, // contactable
            undefined, // contacted
            undefined, // searchText
            undefined, // No queueId filter - filter by commerce only
            undefined, // survey
            true // asc
          );
          // API returns an array directly
          const allAttentions = Array.isArray(attentions) ? attentions : [];

          // The API already filters by date range (today to today), so we trust it
          // Only do minimal validation - ensure we have attentions with valid IDs
          const validAttentions = allAttentions.filter(attention => attention && attention.id);

          // Sort by number (ascending) to show in order, then by creation date
          validAttentions.sort((a, b) => {
            const numA = a.number || 0;
            const numB = b.number || 0;
            if (numA !== numB) {
              return numA - numB;
            }
            // If same number, sort by date
            const dateA = a.date
              ? new Date(a.date)
              : a.createdDate
              ? new Date(a.createdDate)
              : new Date(0);
            const dateB = b.date
              ? new Date(b.date)
              : b.createdDate
              ? new Date(b.createdDate)
              : new Date(0);
            return dateA - dateB;
          });

          state.recentAttentions = validAttentions.slice(0, 5); // Show only first 5 attentions
        } catch (error) {
          console.error('Error fetching attentions:', error);
          // Fallback to Firebase subscription data if API returns empty
          if (
            state.todayAttentionsSubscription &&
            Array.isArray(state.todayAttentionsSubscription.value)
          ) {
            const firebaseAttentions = state.todayAttentionsSubscription.value;
            const today = new DateModel().toString();

            // Filter by today's date only (commerce filter is already applied by Firebase subscription)
            const filteredFirebaseAttentions = firebaseAttentions
              .filter(attention => {
                // Firebase query already filters by createdAt >= today, but let's verify date as well
                const dateValue = attention.date || attention.createdAt || attention.createdDate;
                if (!dateValue) return false;

                // Handle different date formats - Firebase subscription already has createdAt as string
                try {
                  let dateStr;
                  if (typeof dateValue === 'string') {
                    // If it's already in YYYY-MM-DD format, compare directly
                    if (dateValue.length >= 10) {
                      dateStr = dateValue.substring(0, 10);
                      if (dateStr === today) return true;
                    }
                    // Try parsing as date string
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                      dateStr = date.toISOString().substring(0, 10);
                      return dateStr === today;
                    }
                  } else if (dateValue instanceof Date) {
                    dateStr = dateValue.toISOString().substring(0, 10);
                    return dateStr === today;
                  }

                  // If date parsing fails, but createdAt is from today (Firebase filtered),
                  // include it (Firebase query already ensures createdAt >= today)
                  return true;
                } catch (error) {
                  // If date parsing fails, include it (Firebase already filtered by date and commerce)
                  return true;
                }
              })
              .map(attention => ({
                ...attention,
                id: attention.id || attention._id || attention.docId,
              }))
              .filter(attention => attention.id); // Only include attentions with IDs

            // Sort by number
            filteredFirebaseAttentions.sort((a, b) => {
              const numA = a.number || 0;
              const numB = b.number || 0;
              if (numA !== numB) {
                return numA - numB;
              }
              // If same number, sort by date
              const dateA = a.date
                ? new Date(a.date)
                : a.createdDate
                ? new Date(a.createdDate)
                : new Date(0);
              const dateB = b.date
                ? new Date(b.date)
                : b.createdDate
                ? new Date(b.createdDate)
                : new Date(0);
              return dateA - dateB;
            });

            state.recentAttentions = filteredFirebaseAttentions.slice(0, 5); // Show only first 5 attentions
          } else {
            state.recentAttentions = [];
          }
        }

        state.recentBookings = [];
        state.showAttentions = true;
        loading.value = false;
      } catch (error) {
        console.error('Error in viewTodayBookings:', error);
        alertError.value = error.response?.status || error.status || 500;
        state.recentAttentions = [];
        state.recentBookings = [];
        state.showAttentions = true;
        loading.value = false;
      }
    };

    const viewPendingBookings = async () => {
      if (!commerce.value || !commerce.value.id) return;

      try {
        loading.value = true;
        // Reset showAttentions when viewing pending bookings
        state.showAttentions = false;
        state.recentAttentions = [];
        const today = new DateModel().toString();
        const endOfMonth = new DateModel().endOfMonth().toString();

        // Get pending bookings filtered by commerce only (no queueId filter)
        const pendingBookings = await getBookingsDetails(
          commerce.value.id,
          today,
          endOfMonth,
          [commerce.value.id],
          1,
          50,
          undefined,
          undefined, // No queueId filter - filter by commerce only
          true,
          undefined,
          'PENDING'
        );
        const allBookings = (pendingBookings || []).filter(Boolean);
        allBookings.sort((a, b) => {
          const dateA = new Date(a.date || a.createdDate);
          const dateB = new Date(b.date || b.createdDate);
          return dateA - dateB;
        });
        state.recentBookings = allBookings.slice(0, 50);
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    return {
      state,
      loading,
      alertError,
      commerce,
      business,
      module,
      isActiveCommerce,
      goBack,
      loadDashboardStats,
      viewTodayBookings,
      viewPendingBookings,
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :commerce-id="commerce?.id"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`collaboratorBookingsView.welcome`)"
          :toggles="state.toggles"
          component-name="collaboratorBookingsView"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
          <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
            <Message
              :title="$t('businessQueuesAdmin.message.4.title')"
              :content="$t('businessQueuesAdmin.message.4.content')"
            />
          </div>
          <!-- Dashboard Stats Cards -->
          <div class="dashboard-stats-container mt-3" v-if="!loading && commerce && commerce.id">
            <div class="row g-3">
              <div class="col-6 col-md-3">
                <div class="stat-card stat-card-today">
                  <div class="stat-icon">
                    <i class="bi bi-calendar-day"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ state.stats.todayCount }}</div>
                    <div class="stat-label">
                      {{ $t('collaboratorBookingsView.today') }}
                      <Popper :class="'dark'" arrow hover>
                        <template #content>
                          <div>
                            {{ $t('collaboratorBookingsView.metrics.today.description') }}
                          </div>
                        </template>
                        <i class="bi bi-info-circle-fill stat-info-icon"></i>
                      </Popper>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="stat-card stat-card-pending">
                  <div class="stat-icon">
                    <i class="bi bi-clock-history"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ state.stats.pendingCount }}</div>
                    <div class="stat-label">
                      {{ $t('collaboratorBookingsView.pending') }}
                      <Popper :class="'dark'" arrow hover>
                        <template #content>
                          <div>
                            {{ $t('collaboratorBookingsView.metrics.pending.description') }}
                          </div>
                        </template>
                        <i class="bi bi-info-circle-fill stat-info-icon"></i>
                      </Popper>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="stat-card stat-card-upcoming">
                  <div class="stat-icon">
                    <i class="bi bi-calendar-week"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ state.stats.upcomingWeekCount }}</div>
                    <div class="stat-label">
                      {{ $t('collaboratorBookingsView.upcomingWeek') }}
                      <Popper :class="'dark'" arrow hover>
                        <template #content>
                          <div>
                            {{ $t('collaboratorBookingsView.metrics.upcomingWeek.description') }}
                          </div>
                        </template>
                        <i class="bi bi-info-circle-fill stat-info-icon"></i>
                      </Popper>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="stat-card stat-card-active">
                  <div class="stat-icon">
                    <i class="bi bi-calendar-check"></i>
                  </div>
                  <div class="stat-content">
                    <div class="stat-value">{{ state.stats.totalActiveCount }}</div>
                    <div class="stat-label">
                      {{ $t('collaboratorBookingsView.totalActive') }}
                      <Popper :class="'dark'" arrow hover>
                        <template #content>
                          <div>
                            {{ $t('collaboratorBookingsView.metrics.totalActive.description') }}
                          </div>
                        </template>
                        <i class="bi bi-info-circle-fill stat-info-icon"></i>
                      </Popper>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Quick Actions -->
          <div class="quick-actions-container mt-1">
            <div class="row g-2 justify-content-center">
              <div class="col-auto">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-5 py-3 pulse-btn"
                  data-bs-toggle="modal"
                  data-bs-target="#modalAgenda"
                  :disabled="
                    !state.toggles['collaborator.bookings.manage'] || state.queues.length === 0
                  "
                >
                  <i class="bi bi-calendar-check-fill me-2"></i>
                  {{ $t('collaboratorBookingsView.schedules') }}
                </button>
              </div>
            </div>
          </div>
          <!-- Recent Attentions (when clicking Hoje) -->
          <div
            class="recent-bookings-container mt-4"
            v-if="state.showAttentions && state.recentAttentions.length > 0"
          >
            <div class="section-header">
              <h5 class="section-title">
                <i class="bi bi-clock-history"></i>
                {{ $t('collaboratorBookingsView.todayAttentions') }}
              </h5>
            </div>
            <div class="recent-bookings-list">
              <div
                class="booking-item-wrapper"
                v-for="(attention, index) in state.recentAttentions"
                :key="`attention-${index}`"
              >
                <AttentionDetailsCard :show="true" :attention="attention" :commerce="commerce" />
              </div>
            </div>
          </div>
          <!-- Recent Bookings -->
          <div
            class="recent-bookings-container mt-4"
            v-else-if="!state.showAttentions && state.recentBookings.length > 0"
          >
            <div class="section-header">
              <h5 class="section-title">
                <i class="bi bi-clock-history"></i>
                {{ $t('collaboratorBookingsView.recentBookings') }}
              </h5>
            </div>
            <div class="recent-bookings-list">
              <div
                class="booking-item-wrapper"
                v-for="(booking, index) in state.recentBookings"
                :key="`booking-${index}`"
              >
                <BookingDetailsCard :show="true" :booking="booking" :commerce="commerce" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :commerce-id="commerce?.id"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('collaboratorBookingsView.welcome')"
          :toggles="state.toggles"
          component-name="collaboratorBookingsView"
          @go-back="goBack"
        />
        <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
          <Message
            :title="$t('businessQueuesAdmin.message.4.title')"
            :content="$t('businessQueuesAdmin.message.4.content')"
          />
        </div>
        <!-- Dashboard Stats Cards -->
        <div class="dashboard-stats-container mt-3" v-if="!loading && commerce && commerce.id">
          <div class="row g-3">
            <div class="col-6 col-md-3">
              <div class="stat-card stat-card-today">
                <div class="stat-icon">
                  <i class="bi bi-calendar-day"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ state.stats.todayCount }}</div>
                  <div class="stat-label">
                    {{ $t('collaboratorBookingsView.today') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{ $t('collaboratorBookingsView.metrics.today.description') }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill stat-info-icon"></i>
                    </Popper>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-card stat-card-pending">
                <div class="stat-icon">
                  <i class="bi bi-clock-history"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ state.stats.pendingCount }}</div>
                  <div class="stat-label">
                    {{ $t('collaboratorBookingsView.pending') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{ $t('collaboratorBookingsView.metrics.pending.description') }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill stat-info-icon"></i>
                    </Popper>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-card stat-card-upcoming">
                <div class="stat-icon">
                  <i class="bi bi-calendar-week"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ state.stats.upcomingWeekCount }}</div>
                  <div class="stat-label">
                    {{ $t('collaboratorBookingsView.upcomingWeek') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{ $t('collaboratorBookingsView.metrics.upcomingWeek.description') }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill stat-info-icon"></i>
                    </Popper>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="stat-card stat-card-active">
                <div class="stat-icon">
                  <i class="bi bi-calendar-check"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ state.stats.totalActiveCount }}</div>
                  <div class="stat-label">
                    {{ $t('collaboratorBookingsView.totalActive') }}
                    <Popper :class="'dark'" arrow hover>
                      <template #content>
                        <div>
                          {{ $t('collaboratorBookingsView.metrics.totalActive.description') }}
                        </div>
                      </template>
                      <i class="bi bi-info-circle-fill stat-info-icon"></i>
                    </Popper>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Quick Actions -->
        <div class="quick-actions-container mt-1">
          <div class="row g-2 justify-content-center">
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-5 py-3 pulse-btn"
                data-bs-toggle="modal"
                data-bs-target="#modalAgenda"
                :disabled="
                  !state.toggles['collaborator.bookings.manage'] || state.queues.length === 0
                "
              >
                <i class="bi bi-calendar-check-fill me-2"></i>
                {{ $t('collaboratorBookingsView.schedules') }}
              </button>
            </div>
          </div>
        </div>
        <!-- Recent Attentions (when clicking Hoje) -->
        <div
          class="recent-bookings-container mt-4"
          v-if="state.showAttentions && state.recentAttentions.length > 0"
        >
          <div class="section-header">
            <h5 class="section-title">
              <i class="bi bi-clock-history"></i>
              {{ $t('collaboratorBookingsView.todayAttentions') }}
            </h5>
          </div>
          <div class="">
            <div
              class=""
              v-for="(attention, index) in state.recentAttentions"
              :key="`attention-${index}`"
            >
              <AttentionDetailsCard :show="true" :attention="attention" :commerce="commerce" />
            </div>
          </div>
        </div>
        <!-- Recent Bookings -->
        <div
          class="recent-bookings-container mt-4"
          v-else-if="!state.showAttentions && state.recentBookings.length > 0"
        >
          <div class="section-header">
            <h5 class="section-title">
              <i class="bi bi-clock-history"></i>
              {{ $t('collaboratorBookingsView.recentBookings') }}
            </h5>
          </div>
          <div class="">
            <div
              class=""
              v-for="(booking, index) in state.recentBookings"
              :key="`booking-${index}`"
            >
              <BookingDetailsCard :show="true" :booking="booking" :commerce="commerce" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Agenda - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        id="modalAgenda"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modal-fullscreen modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header border-0 centered active-name">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-calendar-check-fill"></i> Agenda {{ commerce?.name || '' }} -
                {{ commerce?.tag || '' }}
              </h5>
              <button
                id="close-modal"
                class="btn-close btn-light"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body text-center mb-0" id="attentions-component">
              <BookingCalendar
                :show="true"
                :commerce="commerce"
                :queues="state.queues"
                :toggles="state.toggles"
              >
              </BookingCalendar>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.indicator {
  font-size: 0.7rem;
}
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.2rem;
  margin-bottom: 0.2rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
}
.blocks-section {
  overflow-y: scroll;
  max-height: 600px;
  font-size: small;
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
}

/* Dashboard Stats Cards */
.dashboard-stats-container {
  margin: 1.5rem 0.5rem;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 90px;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.stat-card-today {
  border-left: 4px solid #00c2cb;
}

.stat-card-pending {
  border-left: 4px solid #ffc107;
}

.stat-card-upcoming {
  border-left: 4px solid #004aad;
}

.stat-card-active {
  border-left: 4px solid #28a745;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.5rem;
}

.stat-card-today .stat-icon {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.stat-card-pending .stat-icon {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
}

.stat-card-upcoming .stat-icon {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.stat-card-active .stat-icon {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.stat-info-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.4);
  cursor: help;
  transition: color 0.2s ease;
}

.stat-info-icon:hover {
  color: rgba(0, 194, 203, 0.8);
}

/* Quick Actions */
.quick-actions-container {
  margin: 1.5rem 0.5rem;
}

/* Recent Bookings */
.recent-bookings-container {
  margin: 1.5rem 0.5rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #000000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.recent-bookings-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.booking-item-wrapper {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.booking-item-wrapper:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Desktop Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }

  .dashboard-stats-container {
    margin: 1.5rem 0;
  }

  .quick-actions-container {
    margin: 1.5rem 0;
  }

  .recent-bookings-container {
    margin: 1.5rem 0;
  }
}
</style>
