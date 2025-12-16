<template>
  <div class="clinical-alerts-banner">
    <div v-for="alert in alerts" :key="alert.id" :class="['alert-item', `alert-${alert.severity}`]">
      <div class="alert-icon">
        <i :class="getAlertIcon(alert.type)"></i>
      </div>
      <div class="alert-content">
        <div class="alert-title">{{ alert.title }}</div>
        <div class="alert-message">{{ alert.message }}</div>
        <div v-if="alert.details" class="alert-details">{{ alert.details }}</div>
      </div>
      <div class="alert-actions">
        <button
          v-if="!alert.acknowledged"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="handleAcknowledge(alert.id)"
        >
          <i class="bi bi-check me-1"></i>
          Reconocer
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { acknowledgeAlert } from '../../../application/services/clinical-alerts';

export default {
  name: 'ClinicalAlertsBanner',
  props: {
    alerts: { type: Array, default: () => [] },
  },
  emits: ['acknowledge'],
  methods: {
    getAlertIcon(type) {
      const icons = {
        allergy: 'bi bi-exclamation-triangle-fill',
        drug_interaction: 'bi bi-shield-exclamation',
        contraindication: 'bi bi-x-circle-fill',
        abnormal_value: 'bi bi-graph-up-arrow',
        missing_data: 'bi bi-info-circle-fill',
        duplicate_prescription: 'bi bi-file-earmark-duplicate',
      };
      return icons[type] || 'bi bi-exclamation-circle-fill';
    },
    async handleAcknowledge(alertId) {
      try {
        await acknowledgeAlert(alertId);
        this.$emit('acknowledge', alertId);
      } catch (error) {
        console.error('Error acknowledging alert:', error);
      }
    },
  },
};
</script>

<style scoped>
.clinical-alerts-banner {
  margin-bottom: 1.5rem;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  border-left: 4px solid;
}

.alert-low {
  background: rgba(255, 193, 7, 0.1);
  border-color: #ffc107;
}

.alert-medium {
  background: rgba(255, 152, 0, 0.1);
  border-color: #ff9800;
}

.alert-high {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
}

.alert-critical {
  background: rgba(211, 47, 47, 0.15);
  border-color: #d32f2f;
  animation: pulse-critical 2s ease-in-out infinite;
}

@keyframes pulse-critical {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(211, 47, 47, 0);
  }
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-low .alert-icon {
  color: #ffc107;
}

.alert-medium .alert-icon {
  color: #ff9800;
}

.alert-high .alert-icon {
  color: #f44336;
}

.alert-critical .alert-icon {
  color: #d32f2f;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.alert-message {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.alert-details {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}
</style>
