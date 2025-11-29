<script>
import Spinner from '../common/Spinner.vue';
import Message from '../common/Message.vue';
import DashboardAttentionsManagement from './DashboardAttentionsManagement.vue';
import DashboardBookingsManagement from '../bookings/DashboardBookingsManagement.vue';

export default {
  name: 'DashboardAttentionsAndBookingsManagement',
  components: {
    Spinner,
    Message,
    DashboardAttentionsManagement,
    DashboardBookingsManagement,
  },
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
    };
  },
  methods: {
    showAttentions() {
      this.showAttentionsResults = true;
      this.showBookingsResults = false;
    },
    showBookings() {
      this.showAttentionsResults = false;
      this.showBookingsResults = true;
    },
  },
};
</script>

<template>
  <!-- Expose filters slot from DashboardAttentionsManagement for desktop -->
  <DashboardAttentionsManagement
    v-if="filtersLocation === 'slot'"
    :show-attention-management="false"
    :toggles="toggles"
    :commerce="commerce"
    :queues="queues"
    :commerces="commerces"
    :services="services"
    filters-location="slot"
  >
    <template #filters-exposed="filterProps">
      <slot name="filters-exposed" v-bind="filterProps"></slot>
    </template>
  </DashboardAttentionsManagement>
  <div
    id="surveys"
    class="row"
    v-if="showAttentionManagement === true && toggles['dashboard.attentions-management.view']"
  >
    <div>
      <hr />
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
        >
        </DashboardAttentionsManagement>
        <DashboardBookingsManagement
          :show-bookings-management="this.showBookingsResults"
          :toggles="this.toggles"
          :commerce="this.commerce"
          :queues="this.queues"
          :commerces="this.commerces"
          :services="this.services"
        >
        </DashboardBookingsManagement>
      </div>
    </div>
  </div>
  <div v-if="showAttentionManagement === true && !toggles['dashboard.attentions-management.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')"
    />
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
