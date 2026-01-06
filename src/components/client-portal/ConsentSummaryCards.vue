<template>
  <div class="consent-summary-cards">
    <div class="row g-3">
      <div
        v-for="card in cards"
        :key="card.key"
        class="col-6 col-md-4 col-lg-2"
        @click="$emit('filter', card.key)"
      >
        <div class="summary-card" :class="{ active: activeFilter === card.key }">
          <div class="summary-card-icon" :style="{ backgroundColor: card.color }">
            <i :class="card.icon"></i>
          </div>
          <div class="summary-card-content">
            <div class="summary-card-value">{{ card.value }}</div>
            <div class="summary-card-label">{{ card.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'ConsentSummaryCards',
  props: {
    summary: {
      type: Object,
      required: true,
    },
    activeFilter: {
      type: String,
      default: 'all',
    },
  },
  emits: ['filter'],
  setup(props) {
    const { t } = useI18n();

    const cards = computed(() => [
      {
        key: 'all',
        label: t('clientPortal.consents.summary.all'),
        value: props.summary.total || 0,
        icon: 'bi-list-ul',
        color: '#6c757d',
      },
      {
        key: 'granted',
        label: t('clientPortal.consents.summary.granted'),
        value: props.summary.granted || 0,
        icon: 'bi-check-circle-fill',
        color: '#28a745',
      },
      {
        key: 'pending',
        label: t('clientPortal.consents.summary.pending'),
        value: props.summary.pending || 0,
        icon: 'bi-clock-fill',
        color: '#ffc107',
      },
      {
        key: 'denied',
        label: t('clientPortal.consents.summary.denied'),
        value: props.summary.denied || 0,
        icon: 'bi-x-circle-fill',
        color: '#dc3545',
      },
      {
        key: 'expired',
        label: t('clientPortal.consents.summary.expired'),
        value: props.summary.expired || 0,
        icon: 'bi-exclamation-triangle-fill',
        color: '#fd7e14',
      },
      {
        key: 'revoked',
        label: t('clientPortal.consents.summary.revoked'),
        value: props.summary.revoked || 0,
        icon: 'bi-shield-x',
        color: '#6c757d',
      },
    ]);

    return {
      cards,
    };
  },
};
</script>

<style scoped>
.consent-summary-cards {
  margin-bottom: 1.5rem;
}

.summary-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.summary-card.active {
  border-color: var(--azul-turno);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

.summary-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.5rem;
  color: white;
  font-size: 1.5rem;
}

.summary-card-content {
  margin-top: 0.5rem;
}

.summary-card-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--gris-elite-1);
}

.summary-card-label {
  font-size: 0.875rem;
  color: var(--gris-elite-1);
  margin-top: 0.25rem;
}

@media (max-width: 768px) {
  .summary-card {
    padding: 0.75rem;
  }

  .summary-card-icon {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }

  .summary-card-value {
    font-size: 1.25rem;
  }

  .summary-card-label {
    font-size: 0.75rem;
  }
}
</style>


