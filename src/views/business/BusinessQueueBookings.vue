<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getQueuesByCommerceId } from '../../application/services/queue';
import { getQueueByCommerce } from '../../application/services/queue';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getBookingsDetails } from '../../application/services/query-stack';
import { DateModel } from '../../shared/utils/date.model';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import BookingCalendar from '../../components/bookings/domain/BookingCalendar.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';

export default {
  name: 'BusinessQueueBookings',
  components: {
    CommerceLogo,
    Message,
    VueRecaptcha,
    Spinner,
    Alert,
    BookingCalendar,
    ComponentMenu,
    DesktopPageHeader,
  },
  async setup() {
    const router = useRouter();

    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      queue: {},
      queues: [],
      groupedQueues: [],
      module: {},
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
      commerce: {},
      // Dashboard stats
      stats: {
        todayCount: 0,
        pendingCount: 0,
        upcomingWeekCount: 0,
        totalActiveCount: 0,
      },
      loadingStats: false,
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    const isActiveCommerce = () => commerce.value && commerce.value.active === true;

    const goBack = () => {
      router.push({ path: '/interno/negocio/menu' });
    };

    // Load queues when commerce changes
    const loadQueues = async commerceId => {
      if (!commerceId) {
        state.queues = [];
        state.queue = {};
        return;
      }
      try {
        const selectedCommerce = await getQueueByCommerce(commerceId);
        state.queues = selectedCommerce.queues || [];
        state.queue = {};
      } catch (error) {
        state.queues = [];
        state.queue = {};
      }
    };

    // Watch for commerce changes from store and sync state + reload data
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id) {
          // Sync state.commerce with store commerce
          if (!state.commerce || state.commerce.id !== newCommerce.id) {
            state.commerce = newCommerce;
          }

          // Reload data only if commerce actually changed
          if (!oldCommerce || oldCommerce.id !== newCommerce.id) {
            try {
              loading.value = true;
              // Immediately clear data to prevent showing old results
              state.queues = [];
              state.queue = {};
              state.bookings = [];
              state.waitlists = [];
              await loadQueues(newCommerce.id);
              await loadDashboardStats();
              loading.value = false;
            } catch (error) {
              loading.value = false;
            }
          }
        } else if (!newCommerce && state.commerce && state.commerce.id) {
          // Clear state if commerce is removed from store
          state.commerce = {};
        }
      },
      { immediate: true }
    );

    const loadDashboardStats = async () => {
      if (!commerce.value || !commerce.value.id) return;

      try {
        state.loadingStats = true;
        const today = new DateModel().toString();
        const endOfWeek = new DateModel().addDays(7).toString();
        const endOfMonth = new DateModel().endOfMonth().toString();

        // Get today's bookings
        const todayBookings = await getBookingsDetails(
          commerce.value.id,
          today,
          today,
          [commerce.value.id],
          1,
          100
        );
        state.stats.todayCount = todayBookings?.length || 0;

        // Get pending bookings
        const pendingBookings = await getBookingsDetails(
          commerce.value.id,
          today,
          endOfMonth,
          [commerce.value.id],
          1,
          100,
          undefined,
          undefined,
          true,
          undefined,
          'PENDING'
        );
        state.stats.pendingCount = pendingBookings?.length || 0;

        // Get upcoming week bookings
        const upcomingBookings = await getBookingsDetails(
          commerce.value.id,
          today,
          endOfWeek,
          [commerce.value.id],
          1,
          100,
          undefined,
          undefined,
          true,
          undefined,
          undefined
        );
        state.stats.upcomingWeekCount = upcomingBookings?.length || 0;

        // Get total active bookings (CONFIRMED + PENDING)
        const confirmedBookings = await getBookingsDetails(
          commerce.value.id,
          today,
          endOfMonth,
          [commerce.value.id],
          1,
          100,
          undefined,
          undefined,
          true,
          undefined,
          'CONFIRMED'
        );
        state.stats.totalActiveCount =
          (pendingBookings?.length || 0) + (confirmedBookings?.length || 0);

        state.loadingStats = false;
      } catch (error) {
        state.loadingStats = false;
      }
    };

    const openCalendar = () => {
      // Modal will be opened via data-bs-toggle
    };

    // Load stats after component mounts
    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('business', 'bookings');

        // Initialize commerce in store if not set
        const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
            // The watch with immediate: true will handle syncing state.commerce and loading data
          }
        } else {
          // Ensure state.commerce is synced (watch will handle loading data)
          state.commerce = currentCommerce;
        }

        // Set locale and clear queue
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          state.locale = commerceToUse.localeInfo?.language || 'es';
          store.setCurrentQueue(undefined);
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    });

    return {
      state,
      loading,
      alertError,
      commerce,
      isActiveCommerce,
      goBack,
      loadDashboardStats,
      openCalendar,
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
          :src="state.business?.logo"
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
                    <div class="stat-label">{{ $t('collaboratorBookingsView.today') }}</div>
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
                    <div class="stat-label">{{ $t('collaboratorBookingsView.pending') }}</div>
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
                    <div class="stat-label">{{ $t('collaboratorBookingsView.upcomingWeek') }}</div>
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
                    <div class="stat-label">{{ $t('collaboratorBookingsView.totalActive') }}</div>
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
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-5 py-3"
                  data-bs-toggle="modal"
                  data-bs-target="#modalAgenda"
                  :disabled="
                    !state.toggles['business.bookings.manage'] || state.queues.length === 0
                  "
                >
                  <i class="bi bi-calendar-check-fill me-2"></i>
                  {{ $t('collaboratorBookingsView.schedules') }}
                </button>
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
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('collaboratorBookingsView.welcome')"
          :toggles="state.toggles"
          component-name="collaboratorBookingsView"
          @go-back="goBack"
        />
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
                  <div class="stat-label">{{ $t('collaboratorBookingsView.today') }}</div>
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
                  <div class="stat-label">{{ $t('collaboratorBookingsView.pending') }}</div>
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
                  <div class="stat-label">{{ $t('collaboratorBookingsView.upcomingWeek') }}</div>
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
                  <div class="stat-label">{{ $t('collaboratorBookingsView.totalActive') }}</div>
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
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-5 py-3"
                data-bs-toggle="modal"
                data-bs-target="#modalAgenda"
                :disabled="!state.toggles['business.bookings.manage'] || state.queues.length === 0"
              >
                <i class="bi bi-calendar-check-fill me-2"></i>
                {{ $t('collaboratorBookingsView.schedules') }}
              </button>
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
                <i class="bi bi-calendar-check-fill"></i> Agenda
                {{ commerce && commerce.name ? commerce.name : '' }} -
                {{ commerce && commerce.tag ? commerce.tag : '' }}
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
/* Modern Form Controls */
.control-box {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  margin: 1rem 0.5rem;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
}

.control-box .row {
  margin: 0;
  padding: 0;
}

.control-box .col {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
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

/* Desktop Layout Styles - Only affects the header row */
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
