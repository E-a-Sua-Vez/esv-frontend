<template>
  <div class="consent-status-card">
    <div class="card-header">
      <div class="card-title">
        <h5>{{ consent.consentType || consent.type || 'N/A' }}</h5>
        <span class="badge" :class="getStatusBadgeClass(consent.status)">
          {{ getStatusLabel(consent.status) }}
        </span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-info">
        <div class="info-item" v-if="consent.grantedAt">
          <i class="bi bi-calendar-check me-2"></i>
          <span
            >{{ $t('clientPortal.consents.card.grantedAt') }}:
            {{ formatDate(consent.grantedAt) }}</span
          >
        </div>
        <div class="info-item" v-if="consent.expiresAt">
          <i class="bi bi-calendar-x me-2"></i>
          <span
            >{{ $t('clientPortal.consents.card.expiresAt') }}:
            {{ formatDate(consent.expiresAt) }}</span
          >
        </div>
        <div class="info-item" v-if="consent.revokedAt">
          <i class="bi bi-shield-x me-2"></i>
          <span
            >{{ $t('clientPortal.consents.card.revokedAt') }}:
            {{ formatDate(consent.revokedAt) }}</span
          >
        </div>
      </div>
      <div class="card-actions">
        <button
          v-if="canRevoke"
          class="btn btn-sm btn-outline-danger"
          @click="$emit('revoke', consent)"
        >
          <i class="bi bi-x-circle me-2"></i>
          {{ $t('clientPortal.consents.card.revoke') }}
        </button>
        <button class="btn btn-sm btn-outline-primary" @click="$emit('view-history', consent)">
          <i class="bi bi-clock-history me-2"></i>
          {{ $t('clientPortal.consents.card.viewHistory') }}
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('view-terms', consent)">
          <i class="bi bi-file-text me-2"></i>
          {{ $t('clientPortal.consents.card.viewTerms') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'ConsentStatusCard',
  props: {
    consent: {
      type: Object,
      required: true,
    },
    commerce: {
      type: Object,
      default: null,
    },
  },
  emits: ['revoke', 'view-history', 'view-terms'],
  setup(props) {
    const { t } = useI18n();

    const canRevoke = computed(() => {
      const status =
        typeof props.consent.status === 'string'
          ? props.consent.status.toUpperCase()
          : props.consent.status;
      return status === 'GRANTED' && !props.consent.revokedAt;
    });

    const getStatusBadgeClass = status => {
      const classes = {
        GRANTED: 'bg-success',
        DENIED: 'bg-danger',
        PENDING: 'bg-warning',
        EXPIRED: 'bg-warning text-dark',
        REVOKED: 'bg-secondary',
      };
      return classes[status] || 'bg-secondary';
    };

    const getStatusLabel = status => {
      // Normalizar status (pode vir como string ou enum)
      const normalizedStatus =
        typeof status === 'string' ? status.toLowerCase() : status?.toLowerCase() || 'unknown';
      return t(`clientPortal.consents.status.${normalizedStatus}`);
    };

    const formatDate = dateString => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return {
      canRevoke,
      getStatusBadgeClass,
      getStatusLabel,
      formatDate,
    };
  },
};
</script>

<style scoped>
.consent-status-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--gris-default);
  overflow: hidden;
  transition: all 0.3s ease;
}

.consent-status-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  padding: 1rem;
  background: var(--color-background);
  border-bottom: 1px solid var(--gris-default);
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-title h5 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--gris-elite-1);
}

.card-body {
  padding: 1rem;
}

.card-info {
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--gris-elite-1);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .card-header,
  .card-body {
    padding: 0.75rem;
  }

  .card-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions {
    flex-direction: column;
  }

  .card-actions .btn {
    width: 100%;
  }
}
</style>
