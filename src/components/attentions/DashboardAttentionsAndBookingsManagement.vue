<script>
import { KeepAlive } from 'vue';
import Spinner from '../common/Spinner.vue';
import Message from '../common/Message.vue';
import DashboardAttentionsManagement from './DashboardAttentionsManagement.vue';
import DashboardBookingsManagement from '../bookings/DashboardBookingsManagement.vue';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'DashboardAttentionsAndBookingsManagement',
  components: {
    KeepAlive,
    Spinner,
    Message,
    DashboardAttentionsManagement,
    DashboardBookingsManagement,
  },
  emits: ['subsection-changed', 'tab-changed'],
  props: {
    showAttentionManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    services: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      showAttentionsResults: true,
      showBookingsResults: false,
      // Store filter values for syncing
      attentionsFilterValues: {},
      bookingsFilterValues: {},
      // CRITICAL: Flag to prevent watchers from resetting states during refresh
      _isRefreshing: false,
    };
  },
  computed: {
    currentFiltersComponent() {
      // Return the component that should expose filters based on active tab
      return this.showAttentionsResults ? 'attentions' : 'bookings';
    },
    shouldShowAttentionsFilters() {
      // Only show attentions filters when attentions tab is active
      return this.filtersLocation === 'slot' && this.showAttentionsResults;
    },
    shouldShowBookingsFilters() {
      // Only show bookings filters when bookings tab is active
      return this.filtersLocation === 'slot' && this.showBookingsResults;
    },
  },
  watch: {
    // REMOVED: Watchers were causing state resets. States are now managed directly in showAttentions() and showBookings() methods.
  },
  mounted() {
    // Emit initial subsection state
    if (this.showAttentionsResults) {
      this.$emit('subsection-changed', 'attentions');
    } else if (this.showBookingsResults) {
      this.$emit('subsection-changed', 'bookings');
    }
  },
  methods: {
    showAttentions() {
      // SIMPLE: Just set the states - no complex logic
      this.showAttentionsResults = true;
      this.showBookingsResults = false;

      // Emit event to notify parent to sync filter instance
      this.$emit('subsection-changed', 'attentions');
      this.$emit('tab-changed', { type: 'attentions' });

      // Set default date range: one month ago to today
      const today = new Date().toISOString().slice(0, 10);
      const oneMonthAgo = new DateModel(today).substractMonths(1).toString();

      // Update filter values with default dates
      this.attentionsFilterValues = {
        ...this.attentionsFilterValues,
        startDate: oneMonthAgo,
        endDate: today,
      };

      // Set dates directly in the filter instance that exposes filters
      this.$nextTick(() => {
        const filterInstance = this.$refs?.attentionsManagement;
        if (filterInstance) {
          filterInstance.startDate = oneMonthAgo;
          filterInstance.endDate = today;
        }

        // Refresh attentions content when switching to attentions tab
        // BUT only if attentions is still active (to prevent state resets)
        if (this.showAttentionsResults && !this.showBookingsResults) {
          this.refreshAttentionsContent();
        }
      });
    },
    showBookings() {
      // SIMPLE: Just set the states - no complex logic
      this.showAttentionsResults = false;
      this.showBookingsResults = true;

      // Emit event to notify parent to sync filter instance
      this.$emit('subsection-changed', 'bookings');
      this.$emit('tab-changed', { type: 'bookings' });

      // Set default date range: one month ago to today
      const today = new Date().toISOString().slice(0, 10);
      const oneMonthAgo = new DateModel(today).substractMonths(1).toString();

      // Update filter values with default dates
      this.bookingsFilterValues = {
        ...this.bookingsFilterValues,
        startDate: oneMonthAgo,
        endDate: today,
      };

      // Set dates directly in the filter instance that exposes filters
      this.$nextTick(() => {
        const filterInstance = this.$refs?.bookingsManagement;
        if (filterInstance) {
          filterInstance.startDate = oneMonthAgo;
          filterInstance.endDate = today;
        }

        // Refresh bookings content when switching to bookings tab
        // BUT only if bookings is still active (to prevent state resets)
        if (this.showBookingsResults && !this.showAttentionsResults) {
          this.refreshBookingsContent();
        }
      });
    },
    refreshAttentionsContent() {
      // CRITICAL: If attentions is not active, don't refresh - this prevents state resets
      if (!this.showAttentionsResults) {
        return;
      }

      // CRITICAL: Set flag to prevent watchers from resetting states
      this._isRefreshing = true;

      // CRITICAL: Lock the states to prevent them from being reset
      const wasAttentionsActive = this.showAttentionsResults;
      const wasBookingsActive = this.showBookingsResults;

      this.$nextTick(() => {
        const contentInstance = this.$refs?.attentionsManagement;
        if (contentInstance && contentInstance.refresh) {
          // Clear previous data
          contentInstance.attentions = [];
          contentInstance.counter = 0;
          contentInstance.totalPages = 0;

          // Set flag to skip watch
          contentInstance._skipWatch = true;

          // Sync filter values from stored values
          const filterValues = this.attentionsFilterValues;
          if (Object.keys(filterValues).length > 0) {
            contentInstance.page = 1;
            if (filterValues.daysSinceType !== undefined)
              contentInstance.daysSinceType = filterValues.daysSinceType;
            if (filterValues.contactResultType !== undefined)
              contentInstance.contactResultType = filterValues.contactResultType;
            if (filterValues.contactable !== undefined)
              contentInstance.contactable = filterValues.contactable;
            if (filterValues.contacted !== undefined)
              contentInstance.contacted = filterValues.contacted;
            if (filterValues.survey !== undefined) contentInstance.survey = filterValues.survey;
            if (filterValues.asc !== undefined) contentInstance.asc = filterValues.asc;
            if (filterValues.searchText !== undefined)
              contentInstance.searchText = filterValues.searchText;
            if (filterValues.queueId !== undefined) contentInstance.queueId = filterValues.queueId;
            if (filterValues.serviceId !== undefined)
              contentInstance.serviceId = filterValues.serviceId;
            if (filterValues.startDate !== undefined)
              contentInstance.startDate = filterValues.startDate;
            if (filterValues.endDate !== undefined) contentInstance.endDate = filterValues.endDate;
          }

          // Clear skip flag and refresh
          contentInstance._skipWatch = false;
          this.$nextTick(() => {
            // CRITICAL: Ensure states are still correct before calling refresh
            if (wasAttentionsActive) {
              this.showAttentionsResults = true;
              this.showBookingsResults = false;
            }
            contentInstance.refresh(1);

            // CRITICAL: Double-check states after refresh
            this.$nextTick(() => {
              if (
                wasAttentionsActive &&
                (!this.showAttentionsResults || this.showBookingsResults)
              ) {
                this.showAttentionsResults = true;
                this.showBookingsResults = false;
                this.$forceUpdate();
              }

              // CRITICAL: Clear the refreshing flag after everything is done
              this._isRefreshing = false;
            });
          });
        } else {
          // CRITICAL: Restore states even if contentInstance is null
          if (wasAttentionsActive) {
            this.showAttentionsResults = true;
            this.showBookingsResults = false;
          }

          // CRITICAL: Clear the refreshing flag even if contentInstance is null
          this._isRefreshing = false;
        }
      });
    },
    refreshBookingsContent() {
      console.trace('📍 CALL STACK for refreshBookingsContent():');

      // CRITICAL: If bookings is not active, don't refresh - this prevents state resets
      if (!this.showBookingsResults) {
        // Don't fix it here - let the caller handle it
        return;
      }

      // CRITICAL: Set flag to prevent watchers from resetting states
      this._isRefreshing = true;

      // CRITICAL: Lock the states to prevent them from being reset
      const wasBookingsActive = this.showBookingsResults;
      const wasAttentionsActive = this.showAttentionsResults;
      this.$nextTick(() => {
        // CRITICAL: Restore states IMMEDIATELY after nextTick to prevent reset
        if (wasBookingsActive) {
          this.showAttentionsResults = false;
          this.showBookingsResults = true;
        }

        // Find the content instance (not the filter instance with filtersLocation='slot')
        // The content instance is the one with showBookingsManagement=true (NOT filtersLocation='slot')
        let contentInstance = null;

        // First, try to find it in the template section (not the slot section)
        // Look for the instance that is rendered in the template with showBookingsManagement prop
        if (this.$children && this.$children.length > 0) {
          contentInstance = this.$children.find(child => {
            const name = child.$options?.name || child.$options?.__name;
            // Find the one that shows content, not the one that exposes filters
            return (
              name === 'DashboardBookingsManagement' &&
              child.showBookingsManagement === true &&
              child.filtersLocation !== 'slot'
            );
          });
        }

        // If not found, try to find any DashboardBookingsManagement that is NOT the filter one
        if (!contentInstance && this.$children && this.$children.length > 0) {
          contentInstance = this.$children.find(child => {
            const name = child.$options?.name || child.$options?.__name;
            return name === 'DashboardBookingsManagement' && child.filtersLocation !== 'slot';
          });
        }

        // Last resort: use refs but verify it's not the filter instance
        if (!contentInstance && this.$refs?.bookingsManagement) {
          const refInstance = this.$refs.bookingsManagement;
          // Only use it if it's not the filter instance
          if (refInstance.filtersLocation !== 'slot') {
            contentInstance = refInstance;
          }
        }

        if (contentInstance && contentInstance.refresh) {
          contentInstance.bookings = [];
          contentInstance.counter = 0;
          contentInstance.totalPages = 0;

          contentInstance._skipWatch = true;

          const filterValues = this.bookingsFilterValues;
          if (Object.keys(filterValues).length > 0) {
            contentInstance.page = 1;
            if (filterValues.status !== undefined) contentInstance.status = filterValues.status;
            if (filterValues.survey !== undefined) contentInstance.survey = filterValues.survey;
            if (filterValues.asc !== undefined) contentInstance.asc = filterValues.asc;
            if (filterValues.searchText !== undefined)
              contentInstance.searchText = filterValues.searchText;
            if (filterValues.queueId !== undefined) contentInstance.queueId = filterValues.queueId;
            if (filterValues.serviceId !== undefined)
              contentInstance.serviceId = filterValues.serviceId;
            if (filterValues.startDate !== undefined)
              contentInstance.startDate = filterValues.startDate;
            if (filterValues.endDate !== undefined) contentInstance.endDate = filterValues.endDate;
          }

          contentInstance._skipWatch = false;
          this.$nextTick(() => {
            // CRITICAL: Ensure states are still correct before calling refresh

            // CRITICAL: Restore states BEFORE calling refresh
            if (wasBookingsActive) {
              this.showAttentionsResults = false;
              this.showBookingsResults = true;
              // Force update to ensure the change is reflected
              this.$forceUpdate();
            }

            // CRITICAL: Double-check states are still correct
            if (!this.showBookingsResults || this.showAttentionsResults) {
              this.showAttentionsResults = false;
              this.showBookingsResults = true;
              this.$forceUpdate();
              // Wait a bit for the state to settle
              this.$nextTick(() => {
                contentInstance.refresh(1);
              });
            } else {
              contentInstance.refresh(1);
            }

            // CRITICAL: Double-check states after refresh
            this.$nextTick(() => {
              if (wasBookingsActive && (!this.showBookingsResults || this.showAttentionsResults)) {
                this.showAttentionsResults = false;
                this.showBookingsResults = true;
                this.$forceUpdate();
              }

              // CRITICAL: Clear the refreshing flag after everything is done
              this._isRefreshing = false;
            });
          });
        } else {
          // CRITICAL: Restore states even if contentInstance is null
          if (wasBookingsActive) {
            this.showAttentionsResults = false;
            this.showBookingsResults = true;
            this.$forceUpdate();
          }

          // CRITICAL: Clear the refreshing flag even if contentInstance is null
          this._isRefreshing = false;
        }
      });
    },
    updateAttentionsFilters(filterValues) {
      this.attentionsFilterValues = { ...this.attentionsFilterValues, ...filterValues };
    },
    updateBookingsFilters(filterValues) {
      this.bookingsFilterValues = { ...this.bookingsFilterValues, ...filterValues };
    },
  },
};
</script>

<template>
  <div>
    <!-- Expose filters slot from DashboardAttentionsManagement for desktop when Atendimentos is active -->
    <template v-if="filtersLocation === 'slot'">
      {{}}
      <!-- SIMPLE: Show attentions filters when attentions tab is active -->
      <div>
        <KeepAlive>
          <DashboardAttentionsManagement
            v-if="showAttentionsResults"
            key="attentions-filters-slot"
            ref="attentionsManagement"
            :show-attention-management="false"
            :toggles="toggles"
            :commerce="commerce"
            :queues="queues"
            :commerces="commerces"
            :services="services"
            filters-location="slot"
          >
            <template #filters-exposed="filterProps">
              {{}}
              <slot
                name="filters-exposed"
                v-bind="{ ...filterProps, filterType: 'attentions' }"
              ></slot>
            </template>
          </DashboardAttentionsManagement>
        </KeepAlive>
        <!-- SIMPLE: Show bookings filters when bookings tab is active -->
        <KeepAlive>
          <DashboardBookingsManagement
            v-if="showBookingsResults"
            key="bookings-filters-slot"
            ref="bookingsManagement"
            :show-bookings-management="false"
            :toggles="toggles"
            :commerce="commerce"
            :queues="queues"
            :commerces="commerces"
            :services="services"
            filters-location="slot"
          >
            <template #filters-exposed="filterProps">
              {{}}
              <slot
                name="filters-exposed"
                v-bind="{ ...filterProps, filterType: 'bookings' }"
              ></slot>
            </template>
          </DashboardBookingsManagement>
        </KeepAlive>
      </div>
    </template>
    <div
      id="surveys"
      class="row"
      v-if="showAttentionManagement === true && toggles['dashboard.attentions-management.view']"
    >
      <div>
        <div class="row col m-1 mb-2">
          <div class="col-6 centered">
            <button
              class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
              :class="showAttentionsResults ? 'btn-selected' : ''"
              @click="showAttentions()"
              :disabled="!toggles['dashboard.attentions-management.view']"
            >
              {{ $t('dashboard.attentions') }}
            </button>
          </div>
          <div class="col-6 centered">
            <button
              class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
              :class="showBookingsResults ? 'btn-selected' : ''"
              @click="showBookings()"
              :disabled="!toggles['dashboard.bookings-management.view']"
            >
              {{ $t('dashboard.bookings') }}
            </button>
          </div>
        </div>
        <div>
          <DashboardAttentionsManagement
            :show-attention-management="this.showAttentionsResults"
            :toggles="this.toggles"
            :commerce="this.commerce"
            :queues="this.queues"
            :commerces="this.commerces"
            :services="this.services"
            :filters-location="filtersLocation"
            ref="attentionsManagement"
          >
          </DashboardAttentionsManagement>
          <DashboardBookingsManagement
            :show-bookings-management="this.showBookingsResults"
            :toggles="this.toggles"
            :commerce="this.commerce"
            :queues="this.queues"
            :commerces="this.commerces"
            :services="this.services"
            :filters-location="filtersLocation"
            ref="bookingsManagement"
          >
          </DashboardBookingsManagement>
        </div>
      </div>
    </div>
    <div
      v-if="showAttentionManagement === true && !toggles['dashboard.attentions-management.view']"
    >
      <Message
        :icon="'graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-card-score {
  font-size: 0.8rem;
  font-weight: 500;
}
</style>
