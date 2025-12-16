<template>
  <div v-if="show" class="hl7-notification-banner">
    <div class="notification-content">
      <div class="notification-icon">
        <i class="bi bi-clipboard-check"></i>
      </div>
      <div class="notification-text">
        <strong>Resultado de Examen Recibido</strong>
        <p>{{ notification.examName }} - {{ formatDate(notification.receivedAt) }}</p>
      </div>
      <div class="notification-actions">
        <button type="button" class="btn btn-sm btn-primary" @click="viewResults">
          Ver Resultados
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="dismiss">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'HL7ResultNotification',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    notification: {
      type: Object,
      default: () => ({
        examOrderId: '',
        examName: '',
        receivedAt: new Date(),
      }),
    },
  },
  emits: ['view-results', 'dismiss'],
  methods: {
    viewResults() {
      this.$emit('view-results', this.notification.examOrderId);
    },
    dismiss() {
      this.$emit('dismiss');
    },
    formatDate(date) {
      if (!date) return '';
      return getDate(date);
    },
  },
};
</script>

<style scoped>
.hl7-notification-banner {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1050;
  background: white;
  border: 2px solid #28a745;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 350px;
  max-width: 500px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 1rem;
  gap: 1rem;
}

.notification-icon {
  font-size: 2rem;
  color: #28a745;
  flex-shrink: 0;
}

.notification-text {
  flex: 1;
}

.notification-text strong {
  display: block;
  color: #333;
  margin-bottom: 0.25rem;
}

.notification-text p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.notification-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
</style>
