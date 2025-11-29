<script>
import Popper from 'vue3-popper';
import IncomesCollectionDetails from './IncomesCollectionDetails.vue';
import OutcomesCollectionDetails from './OutcomesCollectionDetails.vue';
import DetailItem from '../common/DetailItem.vue';

export default {
  name: 'CollectionDetails',
  components: { IncomesCollectionDetails, Popper, OutcomesCollectionDetails, DetailItem },
  props: {
    show: { type: Boolean, default: true },
    calculatedMetrics: { type: Object, default: {} },
    detailsOpened: { type: Boolean, default: false },
    showDetailsSection: { type: Boolean, default: true },
  },
  data() {
    return {
      showIncomesCollection: true,
      showOutcomesCollection: false,
      extendedEntity: false,
    };
  },
  computed: {
    incomesCreated() {
      return this.calculatedMetrics?.['incomes.created'] || {};
    },
    outcomesCreated() {
      return this.calculatedMetrics?.['outcomes.created'] || {};
    },
    incomesPaymentData() {
      return this.incomesCreated?.paymentData || {};
    },
    outcomesPaymentData() {
      return this.outcomesCreated?.paymentData || {};
    },
    totalIncomes() {
      return this.incomesPaymentData?.paymentAmountSum || 0;
    },
    totalOutcomes() {
      return this.outcomesPaymentData?.paymentAmountSum || 0;
    },
    netCollection() {
      return (this.totalIncomes || 0) - (this.totalOutcomes || 0);
    },
    mainValue() {
      return this.showIncomesCollection ? this.totalIncomes : this.totalOutcomes;
    },
  },
  methods: {
    scorePercentage(total, tag) {
      return parseFloat(((tag * 100) / total).toFixed(2), 2) || 0;
    },
    onShowAttentionCollection() {
      this.showIncomesCollection = true;
      this.showOutcomesCollection = false;
    },
    onShowBookingCollection() {
      this.showIncomesCollection = false;
      this.showOutcomesCollection = true;
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.detailsOpened === true) {
          this.showIncomesCollection = true;
          this.showOutcomesCollection = true;
        } else {
          this.showIncomesCollection = true;
          this.showOutcomesCollection = false;
        }
      },
    },
  },
};
</script>

<template>
  <div v-if="show" class="modern-metric-card metric-type-info">
    <div class="metric-card-header">
      <div class="metric-icon-container icon-info">
        <i class="bi bi-cash-coin"></i>
      </div>
      <div class="metric-title-section">
        <span class="metric-label">{{ $t('dashboard.collection') }}</span>
        <Popper :class="'dark'" arrow disable-click-away :content="$t('dashboard.collection')">
          <i class="bi bi-info-circle metric-info-icon"></i>
        </Popper>
      </div>
    </div>

    <div class="metric-value-container">
      <span class="metric-value">
        {{ mainValue ? Number(mainValue).toLocaleString('de-DE') : '0' }}
      </span>
      <span class="metric-subdata">
        {{ showIncomesCollection ? $t('dashboard.incomes') : $t('dashboard.outcomes') }}
      </span>
    </div>

    <div class="collection-tabs-container">
      <div class="collection-tabs">
        <button
          class="collection-tab"
          :class="{ active: showIncomesCollection }"
          @click="onShowAttentionCollection()"
        >
          <i class="bi bi-arrow-down-circle-fill"></i>
          <span>{{ $t('dashboard.incomes') }}</span>
        </button>
        <button
          class="collection-tab"
          :class="{ active: showOutcomesCollection }"
          @click="onShowBookingCollection()"
        >
          <i class="bi bi-arrow-up-circle-fill"></i>
          <span>{{ $t('dashboard.outcomes') }}</span>
        </button>
      </div>
    </div>

    <div class="collection-card-body">
      <Transition name="fade-slide" mode="out-in">
        <div v-if="showIncomesCollection" key="incomes" class="collection-content">
          <IncomesCollectionDetails
            :show="show"
            :distribution="incomesPaymentData"
            :count="incomesPaymentData.paymentCounter || 0"
            :distribution-payment="incomesCreated.paymentDistribution"
            :distribution-type="incomesCreated.paymentTypeDistribution"
            :distribution-method="incomesCreated.paymentMethodDistribution"
            :distribution-fiscal-note="incomesCreated.paymentFiscalNoteDistribution"
            :details-opened="detailsOpened"
            :show-details-section="showDetailsSection"
          >
          </IncomesCollectionDetails>
        </div>
      </Transition>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="showOutcomesCollection" key="outcomes" class="collection-content">
          <OutcomesCollectionDetails
            :show="show"
            :distribution="outcomesPaymentData"
            :distribution-payment="outcomesCreated.paymentDistribution"
            :count="outcomesPaymentData.paymentCounter || 0"
            :distribution-type="outcomesCreated.paymentTypeDistribution"
            :details-opened="detailsOpened"
            :show-details-section="showDetailsSection"
          >
          </OutcomesCollectionDetails>
        </div>
      </Transition>
    </div>
    <div class="metric-card-accent"></div>
  </div>
</template>

<style scoped>
/* Modern Metric Card - matching SimpleCard style */
.modern-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 1.25rem 1rem;
  margin: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.modern-metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-metric-card:hover::before {
  opacity: 0.6;
}

.metric-type-info {
  border-left: 3px solid #004aad;
}

.metric-type-info:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);
}

/* Card Header - matching SimpleCard */
.metric-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.modern-metric-card:hover .metric-icon-container {
  transform: scale(1.1) rotate(5deg);
}

.icon-info {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.metric-icon-container i {
  font-size: 1.25rem;
}

.metric-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.metric-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.metric-info-icon {
  font-size: 0.75rem;
  color: #a9a9a9;
  cursor: help;
  transition: color 0.15s ease;
}

.metric-info-icon:hover {
  color: #004aad;
}

/* Value Container */
.metric-value-container {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.metric-subdata {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  white-space: nowrap;
}

/* Collection Tabs */
.collection-tabs-container {
  margin-bottom: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.collection-tabs {
  display: flex;
  gap: 0.5rem;
  background: rgba(169, 169, 169, 0.1);
  padding: 0.25rem;
  border-radius: 8px;
}

.collection-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex: 1;
  justify-content: center;
}

.collection-tab i {
  font-size: 0.875rem;
}

.collection-tab:hover {
  background: rgba(255, 255, 255, 0.5);
  color: rgba(0, 0, 0, 0.8);
}

.collection-tab.active {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.1) 100%);
  color: #004aad;
  font-weight: 700;
}

.collection-card-body {
  padding-top: 0;
  margin-top: 0.5rem;
}

.collection-content {
  padding: 0;
}

/* Accent Bar */
.metric-card-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(169, 169, 169, 0.2) 50%,
    transparent 100%
  );
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-metric-card:hover .metric-card-accent {
  opacity: 1;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}

/* Responsive */
@media (max-width: 768px) {
  .collection-tabs {
    flex-direction: column;
    width: 100%;
  }

  .collection-tab {
    width: 100%;
    justify-content: center;
  }

  .collection-section-title {
    font-size: 0.9rem;
  }
}

@media (max-width: 576px) {
  .collection-tab {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .collection-tab i {
    font-size: 0.9rem;
  }
}
</style>
