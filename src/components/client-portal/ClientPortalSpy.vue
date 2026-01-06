<template>
  <div class="client-portal-spy">
    <div class="spy-header">
      <h5 class="spy-title">
        <i class="bi bi-speedometer2 me-2"></i>
        {{ $t('clientPortal.spy.title') }}
      </h5>
    </div>

    <div class="spy-content">
      <!-- Próximas Reservas -->
      <div v-if="upcomingBookings && upcomingBookings.length > 0" class="spy-section">
        <div class="spy-section-header">
          <i class="bi bi-calendar-check text-primary me-2"></i>
          <strong>{{ $t('clientPortal.spy.upcomingBookings') }}</strong>
        </div>
        <div class="spy-section-content">
          <div
            v-for="(booking, index) in upcomingBookings.slice(0, 3)"
            :key="index"
            class="spy-item"
          >
            <div class="spy-item-icon">
              <i class="bi bi-clock-fill text-primary"></i>
            </div>
            <div class="spy-item-content">
              <div class="spy-item-title">{{ booking.serviceName || $t('clientPortal.spy.service') }}</div>
              <div class="spy-item-subtitle">
                {{ formatDate(booking.date) }} - {{ booking.time }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Última Atención -->
      <div v-if="lastAttention" class="spy-section">
        <div class="spy-section-header">
          <i class="bi bi-heart-pulse text-success me-2"></i>
          <strong>{{ $t('clientPortal.spy.lastAttention') }}</strong>
        </div>
        <div class="spy-section-content">
          <div class="spy-item">
            <div class="spy-item-icon">
              <i class="bi bi-check-circle-fill text-success"></i>
            </div>
            <div class="spy-item-content">
              <div class="spy-item-title">{{ lastAttention.serviceName || $t('clientPortal.spy.service') }}</div>
              <div class="spy-item-subtitle">
                {{ formatDate(lastAttention.date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nueva Atención -->
      <div class="spy-section">
        <div class="spy-section-header">
          <i class="bi bi-plus-circle text-info me-2"></i>
          <strong>{{ $t('clientPortal.spy.newAttention') }}</strong>
        </div>
        <div class="spy-section-content">
          <button
            type="button"
            class="btn btn-sm btn-info text-white w-100"
            @click="createNewAttention"
          >
            <i class="bi bi-calendar-plus me-2"></i>
            {{ $t('clientPortal.spy.scheduleService') }}
          </button>
        </div>
      </div>

      <!-- Consentimientos Pendientes -->
      <div v-if="pendingConsents > 0" class="spy-section">
        <div class="spy-section-header">
          <i class="bi bi-shield-exclamation text-warning me-2"></i>
          <strong>{{ $t('clientPortal.spy.pendingConsents') }}</strong>
        </div>
        <div class="spy-section-content">
          <div class="spy-item clickable" @click="goToConsents">
            <div class="spy-item-icon">
              <i class="bi bi-exclamation-triangle-fill text-warning"></i>
            </div>
            <div class="spy-item-content">
              <div class="spy-item-title">
                {{ pendingConsents }} {{ $t('clientPortal.spy.consentsWaiting') }}
              </div>
              <div class="spy-item-subtitle">
                {{ $t('clientPortal.spy.reviewConsents') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Documentos Recientes -->
      <div v-if="recentDocuments && recentDocuments.length > 0" class="spy-section">
        <div class="spy-section-header">
          <i class="bi bi-file-earmark-text text-secondary me-2"></i>
          <strong>{{ $t('clientPortal.spy.recentDocuments') }}</strong>
        </div>
        <div class="spy-section-content">
          <div
            v-for="(doc, index) in recentDocuments.slice(0, 3)"
            :key="index"
            class="spy-item clickable"
            @click="viewDocument(doc)"
          >
            <div class="spy-item-icon">
              <i class="bi bi-file-pdf text-danger"></i>
            </div>
            <div class="spy-item-content">
              <div class="spy-item-title">{{ doc.name }}</div>
              <div class="spy-item-subtitle">{{ formatDate(doc.date) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

export default {
  name: 'ClientPortalSpy',
  props: {
    upcomingBookings: {
      type: Array,
      default: () => [],
    },
    lastAttention: {
      type: Object,
      default: null,
    },
    pendingConsents: {
      type: Number,
      default: 0,
    },
    recentDocuments: {
      type: Array,
      default: () => [],
    },
    commerce: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const router = useRouter();
    const route = useRoute();
    const { t, d } = useI18n();

    const commerceSlug = computed(() => route.params.commerceSlug);

    const formatDate = date => {
      if (!date) return '';
      try {
        return d(new Date(date), 'short');
      } catch (e) {
        return date;
      }
    };

    const createNewAttention = () => {
      // Redirigir al mini sitio público del comercio para crear una nueva reserva
      console.log('Commerce data for minisite:', props.commerce);

      // Intentar usar keyName primero, si no está disponible usar el commerceSlug de la URL
      let commerceIdentifier = props.commerce?.keyName;

      if (!commerceIdentifier) {
        console.warn('Commerce keyName not available, using commerceSlug from URL');
        commerceIdentifier = commerceSlug.value;
      }

      if (commerceIdentifier) {
        const minisiteUrl = `${import.meta.env.VITE_URL}/publico/comercio/${commerceIdentifier}/filas`;
        console.log('Opening minisite URL:', minisiteUrl);
        window.open(minisiteUrl, '_blank');
      } else {
        console.error('Cannot open minisite: no commerce identifier available');
      }
    };

    const goToConsents = () => {
      router.push({
        name: 'client-portal-consents',
        params: { commerceSlug: commerceSlug.value },
      });
    };

    const viewDocument = doc => {
      router.push({
        name: 'client-portal-documents',
        params: { commerceSlug: commerceSlug.value },
      });
    };

    return {
      formatDate,
      createNewAttention,
      goToConsents,
      viewDocument,
    };
  },
};
</script>

<style scoped>
.client-portal-spy {
  background: var(--gris-background);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.spy-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
  color: white;
}

.spy-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.spy-content {
  padding: 1rem;
}

.spy-section {
  margin-bottom: 1.5rem;
}

.spy-section:last-child {
  margin-bottom: 0;
}

.spy-section-header {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
}

.spy-section-content {
  padding-left: 0.5rem;
}

.spy-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  background: white;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.spy-item:last-child {
  margin-bottom: 0;
}

.spy-item.clickable {
  cursor: pointer;
}

.spy-item.clickable:hover {
  background: var(--gris-clear);
  transform: translateX(4px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.spy-item-icon {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  font-size: 1.2rem;
}

.spy-item-content {
  flex: 1;
  min-width: 0;
}

.spy-item-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--gris-default);
  margin-bottom: 0.25rem;
}

.spy-item-subtitle {
  font-size: 0.8rem;
  color: var(--gris-medium);
}

@media (max-width: 768px) {
  .client-portal-spy {
    margin-bottom: 1rem;
  }

  .spy-header {
    padding: 0.75rem;
  }

  .spy-title {
    font-size: 1rem;
  }

  .spy-content {
    padding: 0.75rem;
  }
}
</style>
