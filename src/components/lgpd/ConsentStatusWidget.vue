<template>
  <div class="requirement-card requirement-card-compact">
    <div class="requirement-card-header">
      <div class="requirement-icon" :class="statusClass">
        <i :class="statusIcon"></i>
      </div>
      <div class="requirement-info">
        <div class="requirement-title">
          {{ $t('lgpd.consent.widget.title') }}
        </div>
        <div class="requirement-status" :class="getStatusClass()">
          <i :class="getStatusIconClass()"></i>
          <span>{{ summary }}</span>
        </div>
      </div>
    </div>
    <button
      v-if="hasPending"
      @click.stop="requestAllPending"
      :disabled="requesting"
      class="requirement-action-btn-compact whatsapp-btn"
    >
      <i class="bi bi-whatsapp"></i>
      <span>{{
        hasBlockingConsents
          ? $t('lgpd.consent.widget.requestBlockingConsents')
          : $t('lgpd.consent.widget.requestAllPending')
      }}</span>
    </button>
    <button
      v-else-if="hasBlockingConsents"
      @click.stop="openFullManager"
      class="requirement-action-btn-compact"
      style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white"
    >
      <i class="bi bi-shield-exclamation"></i>
      <span>{{ $t('lgpd.consent.widget.manageAll') }}</span>
    </button>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { requestAllPendingConsents, getConsentStatus } from '@/application/services/consent';

export default {
  name: 'ConsentStatusWidget',
  props: {
    commerceId: { type: String, required: true },
    clientId: { type: String, required: true },
    consents: { type: Array, default: () => [] },
    requirements: { type: Array, default: () => [] },
    autoRefresh: { type: Boolean, default: true },
    refreshInterval: { type: Number, default: 10000 }, // 10 segundos
  },
  emits: ['refresh', 'open-manager', 'status-updated'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const requesting = ref(false);
    let refreshIntervalId = null;

    const allConsents = computed(() => {
      if (!props.requirements || props.requirements.length === 0) {
        return [];
      }
      return props.requirements.map(req => {
        const existing = props.consents?.find(c => c.consentType === req.consentType);
        return {
          type: req.consentType,
          status: existing?.status || 'PENDING',
          grantedAt: existing?.grantedAt,
          blockingForAttention: req.blockingForAttention || false,
          required: req.required || false,
        };
      });
    });

    const granted = computed(() => allConsents.value.filter(c => c.status === 'GRANTED').length);

    const total = computed(() => allConsents.value.length);

    const hasPending = computed(() => allConsents.value.some(c => c.status === 'PENDING'));

    const hasBlockingConsents = computed(() =>
      allConsents.value.some(c => c.status === 'PENDING' && c.blockingForAttention && c.required),
    );

    const blockingConsentsCount = computed(
      () =>
        allConsents.value.filter(
          c => c.status === 'PENDING' && c.blockingForAttention && c.required
        ).length
    );

    const statusClass = computed(() => {
      if (total.value === 0) return 'status-neutral';
      if (hasBlockingConsents.value) return 'status-blocking';
      if (granted.value === total.value) return 'status-complete';
      if (granted.value > 0) return 'status-partial';
      return 'status-pending';
    });

    const statusIcon = computed(() => {
      if (total.value === 0) return 'bi bi-info-circle-fill';
      if (hasBlockingConsents.value) return 'bi bi-shield-exclamation';
      if (granted.value === total.value) return 'bi bi-check-circle-fill';
      if (granted.value > 0) return 'bi bi-exclamation-triangle-fill';
      return 'bi bi-x-circle-fill';
    });

    const summary = computed(() => {
      if (total.value === 0) {
        return t('lgpd.consent.widget.noRequirements');
      }
      return t('lgpd.consent.widget.summary', {
        granted: granted.value,
        total: total.value,
      });
    });

    const getStatusClass = () => {
      if (total.value === 0) return 'status-neutral';
      if (hasBlockingConsents.value) return 'status-pending';
      if (granted.value === total.value) return 'status-completed';
      return 'status-pending';
    };

    const getStatusIconClass = () => {
      if (total.value === 0) return 'bi bi-info-circle-fill';
      if (hasBlockingConsents.value) return 'bi bi-exclamation-circle-fill';
      if (granted.value === total.value) return 'bi bi-check-circle-fill';
      return 'bi bi-exclamation-circle-fill';
    };

    const requestAllPending = async () => {
      try {
        requesting.value = true;
        await requestAllPendingConsents(props.commerceId, props.clientId, 'CHECK_IN');
        emit('refresh');
        // Mostrar mensaje de éxito (puede ser un toast o alert)
        const successMsg = t('lgpd.consent.widget.requestSent');
        alert(successMsg);
      } catch (error) {
        console.error('Error requesting consents:', error);
        const errorMsg = error.response?.data?.message || t('common.error');
        alert(errorMsg);
      } finally {
        requesting.value = false;
      }
    };

    const openFullManager = () => {
      emit('open-manager');
    };

    const refreshStatus = async () => {
      if (!props.commerceId || !props.clientId) return;

      try {
        const status = await getConsentStatus(props.commerceId, props.clientId);
        emit('status-updated', status);
        emit('refresh');
      } catch (error) {
        console.error('Error refreshing consent status:', error);
      }
    };

    // Polling para atualização em tempo real
    onMounted(() => {
      if (props.autoRefresh && props.commerceId && props.clientId) {
        refreshIntervalId = setInterval(() => {
          refreshStatus();
        }, props.refreshInterval);
      }
    });

    onUnmounted(() => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    });

    // Watch para mudanças em props
    watch(
      () => [props.commerceId, props.clientId],
      () => {
        if (refreshIntervalId) {
          clearInterval(refreshIntervalId);
        }
        if (props.autoRefresh && props.commerceId && props.clientId) {
          refreshIntervalId = setInterval(() => {
            refreshStatus();
          }, props.refreshInterval);
        }
      }
    );

    return {
      requesting,
      allConsents,
      hasPending,
      hasBlockingConsents,
      blockingConsentsCount,
      statusClass,
      statusIcon,
      summary,
      getStatusClass,
      getStatusIconClass,
      requestAllPending,
      openFullManager,
      refreshStatus,
    };
  },
};
</script>

<style scoped>
.requirement-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.requirement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.requirement-card-compact {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
}

.requirement-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0;
  flex: 1;
  min-width: 0; /* Allow flex item to shrink */
}

.requirement-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  font-size: 1.1rem;
}

.requirement-icon.status-blocking {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.requirement-icon.status-complete {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.requirement-icon.status-partial {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.requirement-icon.status-pending {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.requirement-icon.status-neutral {
  background: rgba(108, 117, 125, 0.1);
  color: #6c757d;
}

.requirement-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0; /* Allow flex item to shrink */
}

.requirement-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.requirement-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
}

.requirement-status.status-completed {
  color: #28a745;
}

.requirement-status.status-pending {
  color: #ffc107;
}

.requirement-status.status-neutral {
  color: #6c757d;
}

.requirement-status i {
  font-size: 0.875rem;
}

.requirement-action-btn-compact {
  width: auto;
  padding: 0.4rem 0.875rem;
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0;
  flex-shrink: 0;
  white-space: nowrap;
}

.whatsapp-btn {
  background: linear-gradient(135deg, #25d366 0%, #20c65a 100%);
  color: white;
}

.whatsapp-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #20c65a 0%, #1db954 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.whatsapp-btn:disabled,
.whatsapp-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}
</style>
