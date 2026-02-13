<script>
export default {
  name: 'OutcomesCollectionDetails',
  components: {},
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    distribution: { type: Object, default: {} },
    distributionPayment: { type: Object, default: {} },
    distributionType: { type: Object, default: {} },
    detailsOpened: { type: Boolean, default: false },
    showDetailsSection: { type: Boolean, default: true },
  },
  data() {
    return {
      showAttentionCollection: true,
      showBookingCollection: false,
      extendedEntity: false,
    };
  },
  methods: {
    scorePercentage(total, tag) {
      return parseFloat(((tag * 100) / total).toFixed(2), 2) || 0;
    },
    onShowAttentionCollection() {
      this.showAttentionCollection = true;
      this.showBookingCollection = false;
    },
    onShowBookingCollection() {
      this.showAttentionCollection = false;
      this.showBookingCollection = true;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    distributionTypePercentage(total, tag) {
      return parseFloat(((this.distributionType[tag].count * 100) / total).toFixed(2), 2) || 0;
    },
    classifyOutcomeStatus(status) {
      if (status === 'CONFIRMED') {
        return 'bg-success';
      } else if (status === 'PENDING') {
        return 'bg-warning';
      } else if (status === 'PENDING') {
        return 'bg-danger';
      } else {
        return 'bg-primary';
      }
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
  },
};
</script>

<template>
  <div v-if="show" class="modern-collection-details-content">
    <div v-if="count">
      <div class="notification-grid">
        <div class="notification-item">
          <div class="notification-icon-container icon-blue">
            <i class="bi bi-cash-coin"></i>
          </div>
          <div class="notification-content">
            <div class="notification-label">{{ $t('dashboard.payments') }}</div>
            <div class="notification-value">{{ count ? count : 0 }}</div>
          </div>
        </div>
        <div class="notification-item">
          <div class="notification-icon-container icon-red">
            <i class="bi bi-arrow-up-circle-fill"></i>
          </div>
          <div class="notification-content">
            <div class="notification-label">{{ $t('dashboard.outcomes') }}</div>
            <div class="notification-value">
              {{
                distribution.paymentAmountSum
                  ? Number(distribution.paymentAmountSum).toLocaleString('de-DE')
                  : 0
              }}
            </div>
          </div>
        </div>
      </div>
      <div v-if="showDetailsSection" class="details-expandable-section">
        <button
          class="details-toggle-btn"
          @click.prevent="showDetails()"
          :aria-expanded="extendedEntity"
        >
          <span class="details-toggle-text">{{ $t('dashboard.details') }}</span>
          <i
            class="bi details-toggle-icon"
            :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
          ></i>
        </button>
        <Transition name="details-expand">
          <div v-if="extendedEntity" class="detailed-data">
            <div v-if="Object.keys(distributionPayment).length > 0" class="distribution-section">
              <h6 class="distribution-section-title">
                {{ $t('dashboard.paymentStatus') }}
              </h6>
              <div class="distribution-items">
                <div
                  v-for="origin in Object.keys(distributionPayment)"
                  :key="origin"
                  class="distribution-item"
                >
                  <span class="distribution-item-label">{{ $t(`incomeStatus.${origin}`) }}</span>
                  <span class="distribution-item-badge" :class="classifyOutcomeStatus(origin)">
                    {{ distributionPayment[origin].count || 'N/I' }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="Object.keys(distributionType).length > 0" class="distribution-section">
              <h6 class="distribution-section-title">
                {{ $t('dashboard.paymentType') }}
              </h6>
              <div class="distribution-items">
                <div
                  v-for="origin in Object.keys(distributionType)"
                  :key="origin"
                  class="distribution-item-with-progress"
                >
                  <div class="distribution-item-header">
                    <span class="distribution-item-label">{{ origin }}</span>
                    <span class="distribution-item-badge-secondary">
                      {{ distributionTypePercentage(count, origin) }}%
                    </span>
                  </div>
                  <div class="modern-progress-bar-small">
                    <div
                      class="progress-segment progress-segment-blue"
                      :style="`width: ${distributionTypePercentage(count, origin)}%`"
                    >
                      <span class="progress-segment-value-small">
                        {{ distributionType[origin].count || 'N/I' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
    <div v-else class="details-empty-state">
      <div class="empty-state-content">
        <i class="bi bi-cash-coin empty-state-icon"></i>
        <span class="empty-state-text">{{ 'No Data' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modern-collection-details-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* Notification Details Style - matching AttentionNotificationDetails */
.notification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.625rem;
  margin-bottom: 0.75rem;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.notification-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
}

.notification-icon-container {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-icon-container i {
  font-size: 0.875rem;
}

.icon-blue {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.icon-green {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.icon-red {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.icon-yellow {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.icon-orange {
  background: rgba(222, 100, 37, 0.15);
  color: #de6425;
}

.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.notification-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.notification-value {
  font-size: 1rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
}

.details-expandable-section {
  margin-top: auto;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
}

.details-toggle-btn {
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #000000;
}

.details-toggle-btn:hover {
  background: rgba(169, 169, 169, 0.05);
}

.details-toggle-btn:focus {
  outline: 2px solid #004aad;
  outline-offset: -2px;
}

.details-toggle-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
}

.details-toggle-icon {
  font-size: 0.875rem;
  color: #a9a9a9;
  transition: transform 0.2s ease;
}

.details-toggle-btn[aria-expanded='true'] .details-toggle-icon {
  transform: rotate(180deg);
}

.detailed-data {
  padding: 0.75rem;
  max-height: 800px;
  overflow-y: auto;
  background: rgba(250, 251, 252, 0.5);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.details-expand-enter-to,
.details-expand-leave-from {
  max-height: 800px;
  opacity: 1;
}

/* Distribution Sections */
.distribution-section {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.distribution-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(169, 169, 169, 0.2);
}

.distribution-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.distribution-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.distribution-item:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateX(4px);
}

.distribution-item-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.distribution-item-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  color: white;
  white-space: nowrap;
}

.distribution-item-badge-secondary {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.12);
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.distribution-item-with-progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.distribution-item-with-progress:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.distribution-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.modern-progress-bar-small {
  display: flex;
  height: 22px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(169, 169, 169, 0.1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
}

.progress-segment-blue {
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  min-width: 30px;
}

.progress-segment-value-small {
  font-size: 0.7rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  padding: 0 0.375rem;
}

.details-empty-state {
  padding: 2rem 1rem;
  text-align: center;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-state-icon {
  font-size: 3rem;
  color: #a9a9a9;
  opacity: 0.5;
}

.empty-state-text {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .notification-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .distribution-section {
    padding: 0.75rem;
  }

  .notification-value {
    font-size: 1.1rem;
  }
}

@media (max-width: 576px) {
  .notification-grid {
    grid-template-columns: 1fr;
  }
}
</style>
