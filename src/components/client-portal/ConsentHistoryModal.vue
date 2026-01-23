<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h5>{{ $t('clientPortal.consents.history.title') }}</h5>
        <button type="button" class="btn-close" @click="$emit('close')"></button>
      </div>
      <div class="modal-body">
        <div v-if="history.length === 0" class="text-center py-4">
          <p class="text-muted">{{ $t('clientPortal.consents.history.noHistory') }}</p>
        </div>
        <div v-else class="history-timeline">
          <div v-for="(item, index) in history" :key="index" class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-action">{{ getActionLabel(item.action) }}</div>
              <div class="timeline-date">{{ formatDate(item.timestamp) }}</div>
              <div v-if="item.reason" class="timeline-reason">{{ item.reason }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          {{ $t('clientPortal.consents.history.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'ConsentHistoryModal',
  props: {
    consent: {
      type: Object,
      required: true,
    },
  },
  emits: ['close'],
  setup(props) {
    const { t } = useI18n();

    const history = computed(() => {
      if (props.consent.history && Array.isArray(props.consent.history)) {
        return props.consent.history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      return [];
    });

    const getActionLabel = action =>
      t(`clientPortal.consents.history.actions.${action.toLowerCase()}`);

    const formatDate = dateString => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return {
      history,
      getActionLabel,
      formatDate,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--gris-default);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h5 {
  margin: 0;
}

.modal-body {
  padding: 1rem;
}

.history-timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline-item {
  position: relative;
  padding-bottom: 1.5rem;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: -1.5rem;
  top: 1.5rem;
  width: 2px;
  height: calc(100% - 0.5rem);
  background: var(--gris-default);
}

.timeline-marker {
  position: absolute;
  left: -1.75rem;
  top: 0.25rem;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--azul-turno);
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--azul-turno);
}

.timeline-content {
  background: var(--color-background);
  padding: 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid var(--gris-default);
}

.timeline-action {
  font-weight: 600;
  color: var(--gris-elite-1);
  margin-bottom: 0.25rem;
}

.timeline-date {
  font-size: 0.875rem;
  color: var(--gris-elite-1);
  margin-bottom: 0.25rem;
}

.timeline-reason {
  font-size: 0.875rem;
  color: var(--gris-elite-1);
  font-style: italic;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--gris-default);
  display: flex;
  justify-content: flex-end;
}
</style>
