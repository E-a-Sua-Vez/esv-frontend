<script>
export default {
  name: 'PlanActivationName',
  props: {
    activation: { type: Object, default: {} },
  },
  data() {
    return {};
  },
  methods: {
    isActive() {
      if (this.activation.active === true) {
        return 'active';
      } else {
        return 'desactived';
      }
    },
    isAttention() {
      if (this.activation.endDate) {
        const dateToAttention = new Date(
          new Date(this.activation.endDate).setDate(new Date().getDate() - 5)
        );
        if (new Date() > dateToAttention) {
          return 'activation-attention';
        }
        return '';
      }
      return '';
    },
    isDesactivate() {
      if (this.activation.endDate) {
        const dateToAttention = new Date(this.activation.endDate);
        if (new Date() >= dateToAttention) {
          return 'activation-desactivate';
        }
        return '';
      }
      return '';
    },
    formatDate(dateString) {
      if (!dateString) return '';
      return dateString.slice(0, 10);
    },
    getCardTypeClass() {
      if (this.isDesactivate()) return 'metric-type-error';
      if (this.isAttention()) return 'metric-type-warning';
      if (this.isActive() === 'active') return 'metric-type-success';
      return 'metric-type-neutral';
    },
    getIconClass() {
      if (this.isDesactivate()) return 'icon-error';
      if (this.isAttention()) return 'icon-warning';
      if (this.isActive() === 'active') return 'icon-success';
      return 'icon-neutral';
    },
  },
};
</script>

<template>
  <div class="modern-metric-card plan-activation-card" :class="getCardTypeClass()">
    <div class="metric-card-header">
      <div class="metric-icon-container" :class="getIconClass()">
        <i class="bi bi-star-fill"></i>
      </div>
      <div class="metric-title-section">
        <span class="metric-label">{{ activation.business?.name || 'N/A' }}</span>
        <span class="plan-name-badge">{{ activation.planPayedCopy?.name || 'N/A' }}</span>
      </div>
    </div>

    <div class="plan-status-row">
      <span
        v-if="activation.active"
        class="status-badge status-active"
      >
        <i class="bi bi-check-circle-fill"></i>
        <span>{{ $t('businessPlan.planActive') }}</span>
      </span>
      <span
        v-else
        class="status-badge status-inactive"
      >
        <i class="bi bi-x-circle-fill"></i>
        <span>{{ $t('businessPlan.planInactive') }}</span>
      </span>
      <span
        v-if="activation.validated"
        class="status-badge status-validated"
      >
        <i class="bi bi-shield-check"></i>
        <span>{{ $t('businessPlan.planValidated') }}</span>
      </span>
      <span
        v-else
        class="status-badge status-pending"
      >
        <i class="bi bi-clock-history"></i>
        <span>{{ $t('businessPlan.planPending') }}</span>
      </span>
    </div>

    <div class="plan-dates-row">
      <div v-if="activation.createdAt" class="date-item">
        <i class="bi bi-calendar-event"></i>
        <span class="date-label">{{ $t('businessPlan.purchaseDate') || 'Creado' }}</span>
        <span class="date-value">{{ formatDate(activation.createdAt) }}</span>
      </div>
      <div v-if="activation.startDate" class="date-item">
        <i class="bi bi-play-circle"></i>
        <span class="date-label">{{ $t('businessPlan.startDate') || 'Inicio' }}</span>
        <span class="date-value">{{ formatDate(activation.startDate) }}</span>
      </div>
      <div v-if="activation.endDate" class="date-item">
        <i class="bi bi-calendar-x"></i>
        <span class="date-label">{{ $t('businessPlan.endDate') || 'Fin' }}</span>
        <span class="date-value">{{ formatDate(activation.endDate) }}</span>
      </div>
    </div>

    <div class="metric-card-accent"></div>
  </div>
</template>

<style scoped>
.plan-activation-card {
  margin: 0.5rem 0;
}

.plan-name-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  background: rgba(13, 202, 240, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  margin-left: 0.5rem;
}

.plan-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.status-badge i {
  font-size: 0.875rem;
}

.status-active {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
}

.status-inactive {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.status-validated {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.3);
}

.status-pending {
  background: rgba(249, 195, 34, 0.15);
  color: #b8860b;
  border: 1px solid rgba(249, 195, 34, 0.3);
}

.plan-dates-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

.date-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.date-item i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.4);
  width: 16px;
  text-align: center;
}

.date-label {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  min-width: 60px;
}

.date-value {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  margin-left: auto;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .plan-activation-card {
    padding: 1rem 0.75rem;
  }

  .plan-status-row {
    gap: 0.375rem;
  }

  .status-badge {
    font-size: 0.7rem;
    padding: 0.3rem 0.6rem;
  }

  .date-item {
    font-size: 0.75rem;
  }
}

@media (max-width: 576px) {
  .plan-activation-card {
    padding: 0.875rem 0.625rem;
    margin: 0.25rem 0;
  }

  .plan-name-badge {
    display: block;
    margin-left: 0;
    margin-top: 0.25rem;
  }

  .plan-status-row {
    gap: 0.25rem;
  }

  .status-badge {
    font-size: 0.65rem;
    padding: 0.25rem 0.5rem;
    gap: 0.25rem;
  }

  .status-badge i {
    font-size: 0.75rem;
  }

  .date-item {
    font-size: 0.7rem;
    gap: 0.375rem;
  }

  .date-label {
    min-width: 50px;
  }
}
</style>