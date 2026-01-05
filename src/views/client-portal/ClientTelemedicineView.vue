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
          <span>{{ $t('clientPortal.telemedicine.title') }}</span>
        </div>
        <div class="mt-2">
          <button type="button" class="btn btn-link text-muted" @click="goBack">
            <i class="bi bi-arrow-left me-2"></i>
            {{ $t('clientPortal.telemedicine.backToMenu') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('clientPortal.telemedicine.loading') }}</span>
        </div>
        <p class="mt-3 text-muted">{{ $t('clientPortal.telemedicine.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="errors">
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>{{ error }}</strong>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="telemedicine-container">
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
            {{ $t(`clientPortal.telemedicine.filters.${filter}`) }}
          </button>
        </div>

        <!-- Sessions List -->
        <div class="sessions-list">
          <div v-if="filteredSessions.length === 0" class="text-center py-5">
            <i class="bi bi-camera-video" style="font-size: 3rem; color: var(--gris-elite-1)"></i>
            <p class="mt-3 text-muted">{{ $t('clientPortal.telemedicine.noSessions') }}</p>
          </div>

          <div v-else class="row">
            <div
              v-for="session in filteredSessions"
              :key="session.id"
              class="col-12 col-md-6 col-lg-4 mb-3"
            >
              <div class="session-card">
                <div class="session-card-header">
                  <div class="session-type-icon">
                    <i
                      :class="`bi ${
                        session.type === 'VIDEO' || session.type === 'video'
                          ? 'bi-camera-video-fill'
                          : session.type === 'CHAT' || session.type === 'chat'
                          ? 'bi-chat-dots-fill'
                          : 'bi-camera-video-fill'
                      }`"
                    ></i>
                  </div>
                  <div class="session-status-badge" :class="getStatusClass(session.status)">
                    {{ $t(`clientPortal.telemedicine.status.${session.status?.toLowerCase()}`) }}
                  </div>
                </div>
                <div class="session-card-body">
                  <h6 class="session-title">
                    {{ $t('clientPortal.telemedicine.sessionInfo') }}
                  </h6>
                  <div class="session-info-item">
                    <i class="bi bi-calendar-event me-2"></i>
                    <span>{{ formatDate(session.scheduledAt) }}</span>
                  </div>
                  <div v-if="session.doctorName" class="session-info-item">
                    <i class="bi bi-person-badge me-2"></i>
                    <span>{{ session.doctorName }}</span>
                  </div>
                  <div class="session-info-item">
                    <i class="bi bi-clock me-2"></i>
                    <span>{{ formatTime(session.scheduledAt) }}</span>
                  </div>
                </div>
                <div class="session-card-footer">
                  <button
                    v-if="canAccessSession(session)"
                    type="button"
                    class="btn btn-sm btn-dark rounded-pill w-100"
                    @click="accessSession(session)"
                  >
                    <i class="bi bi-box-arrow-right me-2"></i>
                    {{ $t('clientPortal.telemedicine.accessSession') }}
                  </button>
                  <span v-else class="text-muted small">
                    {{ $t('clientPortal.telemedicine.sessionNotAvailable') }}
                  </span>
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
import { getClientTelemedicineSessions } from '../../application/services/client-portal';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientTelemedicineView',
  components: {
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(true);
    const error = ref('');
    const sessions = ref([]);
    const client = ref(null);
    const commerce = ref(null);
    const activeFilter = ref('all');

    const filters = ['all', 'active', 'scheduled', 'completed', 'cancelled'];

    const filteredSessions = computed(() => {
      if (activeFilter.value === 'all') {
        return sessions.value;
      }
      return sessions.value.filter(session => {
        const status = session.status?.toLowerCase();
        if (activeFilter.value === 'active') {
          return status === 'active';
        }
        if (activeFilter.value === 'scheduled') {
          return status === 'scheduled';
        }
        if (activeFilter.value === 'completed') {
          return status === 'completed';
        }
        if (activeFilter.value === 'cancelled') {
          return status === 'cancelled';
        }
        return true;
      });
    });

    const getStatusClass = status => {
      const statusLower = status?.toLowerCase();
      return {
        'badge-active': statusLower === 'active',
        'badge-scheduled': statusLower === 'scheduled',
        'badge-completed': statusLower === 'completed',
        'badge-cancelled': statusLower === 'cancelled',
      };
    };

    const canAccessSession = session => {
      const status = session.status?.toLowerCase();
      return (
        status === 'active' ||
        status === 'scheduled' ||
        (status === 'completed' && session.accessKeyValidated)
      );
    };

    const accessSession = session => {
      // Redirigir a la sesión de telemedicina
      router.push({ path: `/publico/telemedicina/${session.id}` });
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

    const setFilter = filter => {
      activeFilter.value = filter;
    };

    const goBack = () => {
      router.push({ path: '/portal' });
    };

    const loadSessions = async () => {
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

        // Obtener sesiones de telemedicina
        const response = await getClientTelemedicineSessions(commerce.value.id, client.value.id);
        sessions.value = response || [];
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('clientPortal.telemedicine.loadError');
        console.error('Error loading telemedicine sessions:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadSessions();
    });

    return {
      loading,
      error,
      sessions,
      client,
      commerce,
      activeFilter,
      filters,
      filteredSessions,
      getStatusClass,
      canAccessSession,
      accessSession,
      formatDate,
      formatTime,
      setFilter,
      goBack,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.telemedicine-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.session-card {
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.session-type-icon {
  font-size: 1.5rem;
}

.session-status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-active {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid #10b981;
}

.badge-scheduled {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.badge-completed {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
  border: 1px solid #6b7280;
}

.badge-cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid #ef4444;
}

.session-card-body {
  padding: 1rem;
  flex: 1;
}

.session-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.session-info-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.session-info-item i {
  color: var(--azul-turno);
  width: 1.25rem;
}

.session-card-footer {
  padding: 1rem;
  border-top: 1px solid var(--gris-default);
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .telemedicine-container {
    padding: 0.5rem;
  }

  .filter-tabs {
    gap: 0.25rem;
  }

  .filter-tabs .btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
}
</style>

