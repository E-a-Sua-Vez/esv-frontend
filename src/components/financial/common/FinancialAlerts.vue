<script>
export default {
  name: 'FinancialAlerts',
  props: {
    show: { type: Boolean, default: true },
    alerts: { type: Array, default: () => [] },
    healthStatus: { type: String, default: 'good' }, // excellent, good, warning, critical
  },
  computed: {
    hasAlerts() {
      return this.alerts && this.alerts.length > 0;
    },
    healthStatusClass() {
      return `health-${this.healthStatus}`;
    },
    healthStatusIcon() {
      switch (this.healthStatus) {
        case 'excellent':
          return 'bi-check-circle-fill';
        case 'good':
          return 'bi-check-circle';
        case 'warning':
          return 'bi-exclamation-triangle-fill';
        case 'critical':
          return 'bi-x-circle-fill';
        default:
          return 'bi-info-circle';
      }
    },
  },
  methods: {
    formatAlertMessage(message, params) {
      if (!params) return message;
      let formatted = message;
      Object.keys(params).forEach(key => {
        formatted = formatted.replace(`{${key}}`, params[key]);
      });
      return formatted;
    },
  },
};
</script>

<template>
  <div v-if="show" class="financial-alerts-container">
    <div class="alerts-header">
      <div class="health-indicator" :class="healthStatusClass">
        <i :class="`bi ${healthStatusIcon}`"></i>
        <span class="health-label">{{
          $t(`businessFinancial.alerts.health.${healthStatus}`)
        }}</span>
      </div>
      <h5 class="alerts-title">{{ $t('businessFinancial.alerts.title') }}</h5>
    </div>
    <div v-if="!hasAlerts" class="no-alerts">
      <i class="bi bi-check-circle-fill success-icon"></i>
      <span>{{ $t('businessFinancial.alerts.allGood') }}</span>
    </div>
    <div v-else class="alerts-list">
      <div v-for="(alert, index) in alerts" :key="index" class="alert-item" :class="alert.type">
        <i :class="`bi ${alert.icon || 'bi-exclamation-circle'}`"></i>
        <span class="alert-message">{{ formatAlertMessage(alert.message, alert.params) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.financial-alerts-container {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 1.25rem 1rem;
  margin: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.alerts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.health-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
}

.health-indicator i {
  font-size: 1rem;
}

.health-excellent {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.health-good {
  background: rgba(0, 194, 203, 0.1);
  color: #00c2cb;
}

.health-warning {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.health-critical {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.health-label {
  font-size: 0.875rem;
}

.alerts-title {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  margin: 0;
}

.no-alerts {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #00c2cb;
  font-weight: 500;
}

.success-icon {
  font-size: 1.25rem;
  color: #00c2cb;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(169, 169, 169, 0.05);
  border-left: 3px solid;
  transition: all 0.2s ease;
}

.alert-item:hover {
  background: rgba(169, 169, 169, 0.1);
}

.alert-item.warning {
  border-left-color: #f9c322;
  background: rgba(249, 195, 34, 0.05);
}

.alert-item.warning i {
  color: #f9c322;
}

.alert-item.error {
  border-left-color: #a52a2a;
  background: rgba(165, 42, 42, 0.05);
}

.alert-item.error i {
  color: #a52a2a;
}

.alert-item.info {
  border-left-color: #004aad;
  background: rgba(0, 74, 173, 0.05);
}

.alert-item.info i {
  color: #004aad;
}

.alert-item i {
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.alert-message {
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.7);
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .alerts-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .health-indicator {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .financial-alerts-container {
    padding: 1rem 0.75rem;
  }

  .alert-item {
    padding: 0.5rem;
  }

  .alert-message {
    font-size: 0.8rem;
  }
}
</style>
