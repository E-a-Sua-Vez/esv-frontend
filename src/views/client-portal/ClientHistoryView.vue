<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo -->
      <CommerceLogo
        v-if="commerce && commerce.logo"
        :src="commerce.logo"
        :loading="false"
      ></CommerceLogo>

      <!-- Header -->
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('clientPortal.history.title') }}</span>
        </div>
        <div class="mt-2">
          <button type="button" class="btn btn-link text-muted" @click="goBack">
            <i class="bi bi-arrow-left me-2"></i>
            {{ $t('clientPortal.history.backToMenu') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('clientPortal.history.loading') }}</span>
        </div>
        <p class="mt-3 text-muted">{{ $t('clientPortal.history.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="errors">
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>{{ error }}</strong>
        </div>
      </div>

      <!-- History Content -->
      <div v-else class="history-container">
        <!-- Filter Tabs -->
        <div class="filter-tabs mb-4">
          <button
            v-for="filter in filters"
            :key="filter"
            type="button"
            class="btn btn-sm"
            :class="activeFilter === filter ? 'btn-dark' : 'btn-outline-dark'"
            @click="setFilter(filter)"
          >
            {{ $t(`clientPortal.history.filters.${filter}`) }}
          </button>
        </div>

        <!-- Attentions List -->
        <div class="attentions-list">
          <div v-if="filteredAttentions.length === 0" class="text-center py-5">
            <i class="bi bi-clock-history" style="font-size: 3rem; color: var(--gris-elite-1)"></i>
            <p class="mt-3 text-muted">{{ $t('clientPortal.history.noAttentions') }}</p>
          </div>

          <div v-else>
            <div v-for="attention in filteredAttentions" :key="attention.id" class="attention-card">
              <div class="attention-header">
                <div class="attention-number">
                  <i class="bi bi-hash"></i>
                  {{ attention.number }}
                </div>
                <div class="attention-status-badge" :class="getStatusClass(attention.status)">
                  {{ $t(`clientPortal.history.status.${attention.status?.toLowerCase()}`) }}
                </div>
              </div>
              <div class="attention-body">
                <div class="attention-info-item">
                  <i class="bi bi-calendar-event me-2"></i>
                  <span>{{ formatDate(attention.createdAt) }}</span>
                </div>
                <div class="attention-info-item" v-if="attention.endAt">
                  <i class="bi bi-clock me-2"></i>
                  <span
                    >{{ formatTime(attention.createdAt) }} - {{ formatTime(attention.endAt) }}</span
                  >
                </div>
                <div class="attention-info-item" v-if="attention.duration">
                  <i class="bi bi-hourglass-split me-2"></i>
                  <span>{{ formatDuration(attention.duration) }}</span>
                </div>
                <div
                  class="attention-info-item"
                  v-if="attention.servicesDetails && attention.servicesDetails.length > 0"
                >
                  <i class="bi bi-briefcase me-2"></i>
                  <span>
                    {{ attention.servicesDetails.map(s => s.name || s).join(', ') }}
                  </span>
                </div>
                <div class="attention-info-item" v-if="attention.comment">
                  <i class="bi bi-chat-left-text me-2"></i>
                  <span>{{ attention.comment }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getClientAttentions } from '../../application/services/client-portal';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientHistoryView',
  components: {
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(true);
    const error = ref('');
    const attentions = ref([]);
    const client = ref(null);
    const commerce = ref(null);
    const activeFilter = ref('all');

    const filters = ['all', 'completed', 'cancelled', 'pending'];

    const filteredAttentions = computed(() => {
      if (activeFilter.value === 'all') {
        return attentions.value;
      }
      return attentions.value.filter(attention => {
        const status = attention.status?.toLowerCase();
        if (activeFilter.value === 'completed') {
          return status === 'terminated' || status === 'rated';
        }
        if (activeFilter.value === 'cancelled') {
          return attention.cancelled === true;
        }
        if (activeFilter.value === 'pending') {
          return status === 'pending';
        }
        return true;
      });
    });

    const getStatusClass = status => {
      const statusLower = status?.toLowerCase();
      return {
        'badge-completed': statusLower === 'terminated' || statusLower === 'rated',
        'badge-cancelled': statusLower === 'cancelled',
        'badge-pending': statusLower === 'pending',
      };
    };

    const formatDate = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatDuration = minutes => {
      if (!minutes) return '';
      if (minutes < 60) {
        return `${minutes} ${t('clientPortal.history.minutes')}`;
      }
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours} ${t('clientPortal.history.hours')}`;
      }
      return `${hours} ${t('clientPortal.history.hours')} ${mins} ${t(
        'clientPortal.history.minutes',
      )}`;
    };

    const setFilter = filter => {
      activeFilter.value = filter;
    };

    const goBack = () => {
      router.push({ path: '/portal' });
    };

    const loadAttentions = async () => {
      try {
        loading.value = true;
        error.value = '';

        // Obtener datos del localStorage
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');

        if (!storedClient || !storedCommerce) {
          router.push({ path: '/portal/login' });
          return;
        }

        client.value = JSON.parse(storedClient);
        commerce.value = JSON.parse(storedCommerce);

        // Obtener histórico de atenciones
        const response = await getClientAttentions(commerce.value.id, client.value.id);
        attentions.value = response || [];
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('clientPortal.history.loadError');
        console.error('Error loading attentions:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadAttentions();
    });

    return {
      loading,
      error,
      attentions,
      client,
      commerce,
      activeFilter,
      filters,
      filteredAttentions,
      getStatusClass,
      formatDate,
      formatTime,
      formatDuration,
      setFilter,
      goBack,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.history-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.attentions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.attention-card {
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  overflow: hidden;
  transition: all 0.3s ease;
}

.attention-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.attention-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.attention-number {
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attention-status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-completed {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #10b981;
}

.badge-cancelled {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

.badge-pending {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #3b82f6;
}

.attention-body {
  padding: 1rem;
}

.attention-info-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.attention-info-item:last-child {
  margin-bottom: 0;
}

.attention-info-item i {
  color: var(--azul-turno);
  width: 1.25rem;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .history-container {
    padding: 0.5rem;
  }

  .filter-tabs {
    gap: 0.25rem;
  }

  .filter-tabs .btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  .attention-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>

