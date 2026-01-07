<template>
  <div>
    <div class="content text-center">
      <div class="d-block d-lg-none">
        <CommerceLogo
          :commerce-id="commerce?.id"
          :business-id="commerce?.businessId"
          :loading="loading"
        ></CommerceLogo>
      </div>
      <div class="row align-items-center mb-1 desktop-header-row d-none d-lg-flex">
        <div class="col-auto desktop-logo-wrapper">
          <div class="desktop-commerce-logo">
            <CommerceLogo
              :commerce-id="commerce?.id"
              :business-id="commerce?.businessId"
              :loading="loading"
              class="logo-desktop"
            />
          </div>
        </div>
        <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
          <ComponentMenu
            :title="$t('clientPortal.telemedicine.title')"
            :toggles="toggles"
            component-name="clientPortalTelemedicine"
            :is-client-portal="true"
            @goBack="goBack"
          />
        </div>
      </div>
      <div class="d-block d-lg-none">
        <ComponentMenu
          :title="$t('clientPortal.telemedicine.title')"
          :toggles="toggles"
          component-name="clientPortalTelemedicine"
          :is-client-portal="true"
          @goBack="goBack"
        />
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
        <!-- Filter Tabs - Modern Style -->
        <div class="filter-tabs-modern mb-4">
          <button
            v-for="filter in filters"
            :key="filter"
            type="button"
            class="filter-tab-btn"
            :class="{ 'active': activeFilter === filter }"
            @click="setFilter(filter)"
          >
            <i :class="`bi ${getFilterIcon(filter)} me-2`"></i>
            {{ $t(`clientPortal.telemedicine.filters.${filter}`) }}
          </button>
        </div>

        <!-- Sessions List -->
        <div class="sessions-list-modern">
          <!-- Empty State -->
          <div v-if="filteredSessions.length === 0" class="empty-state-modern">
            <div class="empty-state-icon">
              <i class="bi bi-camera-video-off"></i>
            </div>
            <h5 class="empty-state-title">{{ $t('clientPortal.telemedicine.noSessions') }}</h5>
            <p class="empty-state-text">No hay sesiones para mostrar en esta categoría</p>
          </div>

          <!-- Sessions Grid -->
          <div v-else class="sessions-grid">
            <div
              v-for="session in filteredSessions"
              :key="session.id"
              class="session-card-modern"
            >
              <!-- Card Header with Badges -->
              <div class="session-card-header-modern">
                <div class="session-meta-badges">
                  <span class="session-date-badge">
                    <i class="bi bi-calendar3 me-1"></i>
                    {{ formatDate(session.scheduledAt) }}
                  </span>
                  <span class="session-status-badge-modern" :class="getStatusClass(session.status)">
                    <i class="bi bi-circle-fill me-1"></i>
                    {{ $t(`clientPortal.telemedicine.status.${session.status?.toLowerCase()}`) }}
                  </span>
                </div>
                <span class="session-type-badge-modern" :class="getTypeClass(session.type)">
                  <i :class="getTypeIcon(session.type)" class="me-1"></i>
                  {{ getTypeLabel(session.type) }}
                </span>
              </div>

              <!-- Card Body with Session Info -->
              <div class="session-card-body-modern">
                <div class="session-info-grid">
                  <div class="session-info-row">
                    <div class="session-info-label">
                      <i class="bi bi-clock"></i>
                      <span>Hora</span>
                    </div>
                    <div class="session-info-value">{{ formatTime(session.scheduledAt) }}</div>
                  </div>
                  <div v-if="session.doctorName" class="session-info-row">
                    <div class="session-info-label">
                      <i class="bi bi-person-badge"></i>
                      <span>Profesional</span>
                    </div>
                    <div class="session-info-value">{{ session.doctorName }}</div>
                  </div>
                  <div v-if="session.duration" class="session-info-row">
                    <div class="session-info-label">
                      <i class="bi bi-hourglass-split"></i>
                      <span>Duración</span>
                    </div>
                    <div class="session-info-value">{{ session.duration }} min</div>
                  </div>
                </div>
              </div>

              <!-- Card Footer with Actions -->
              <div class="session-card-footer-modern">
                <button
                  v-if="canAccessSession(session)"
                  type="button"
                  class="btn-session-access"
                  @click="accessSession(session)"
                >
                  <i class="bi bi-camera-video me-2"></i>
                  {{ $t('clientPortal.telemedicine.accessSession') }}
                </button>
                <div v-else class="session-unavailable">
                  <i class="bi bi-info-circle me-2"></i>
                  {{ $t('clientPortal.telemedicine.sessionNotAvailable') }}
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
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getClientTelemedicineSessions } from '../../application/services/client-portal';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientTelemedicineView',
  components: {
    ComponentMenu,
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const commerceSlug = ref(route.params.commerceSlug);

    const loading = ref(true);
    const error = ref('');
    const sessions = ref([]);
    const client = ref(null);
    const commerce = ref(null);
    const activeFilter = ref('all');
    const permissions = ref({});

    // Toggles para ComponentMenu (computed basado en permisos)
    const toggles = computed(() => ({
      'clientPortal.telemedicine.view': permissions.value['client-portal.telemedicine.view'] || false,
      'clientPortal.telemedicine.join': permissions.value['client-portal.telemedicine.join'] || false,
    }));

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

    const getFilterIcon = filter => {
      const icons = {
        all: 'bi-collection',
        active: 'bi-play-circle',
        scheduled: 'bi-calendar-check',
        completed: 'bi-check-circle',
        cancelled: 'bi-x-circle',
      };
      return icons[filter] || 'bi-circle';
    };

    const getTypeClass = type => {
      const normalizedType = type?.toUpperCase() || type;
      const classes = {
        VIDEO: 'type-video',
        video: 'type-video',
        CHAT: 'type-chat',
        chat: 'type-chat',
        BOTH: 'type-both',
        both: 'type-both',
      };
      return classes[normalizedType] || classes[type] || 'type-video';
    };

    const getTypeLabel = type => {
      const normalizedType = type?.toUpperCase() || type;
      const labels = {
        VIDEO: 'Video',
        video: 'Video',
        CHAT: 'Chat',
        chat: 'Chat',
        BOTH: 'Video + Chat',
        both: 'Video + Chat',
      };
      return labels[normalizedType] || labels[type] || 'Video';
    };

    const getTypeIcon = type => {
      const normalizedType = type?.toUpperCase() || type;
      const icons = {
        VIDEO: 'bi-camera-video-fill',
        video: 'bi-camera-video-fill',
        CHAT: 'bi-chat-dots-fill',
        chat: 'bi-chat-dots-fill',
        BOTH: 'bi-camera-video-fill',
        both: 'bi-camera-video-fill',
      };
      return icons[normalizedType] || icons[type] || 'bi-camera-video-fill';
    };

    const goBack = () => {
      router.push({ name: 'client-portal-menu', params: { commerceSlug: commerceSlug.value } });
    };

    const loadSessions = async () => {
      try {
        loading.value = true;
        error.value = '';

        // Obtener datos del localStorage
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');

        if (!storedClient || !storedCommerce) {
          router.push({ name: 'client-portal-login', params: { commerceSlug: commerceSlug.value } });
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

    const loadPermissions = async () => {
      try {
        const clientPermissions = await getClientPortalPermissions('client-portal', 'telemedicine');
        permissions.value = clientPermissions;
      } catch (err) {
        console.error('Error loading permissions:', err);
        // Permisos por defecto si falla
        permissions.value = {
          'client-portal.telemedicine.view': true,
          'client-portal.telemedicine.schedule': true,
        };
      }
    };

    onMounted(async () => {
      await loadPermissions();
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
      permissions,
      toggles,
      loadPermissions,
      getFilterIcon,
      getTypeClass,
      getTypeLabel,
      getTypeIcon,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

/* Desktop Header Styles */
.desktop-header-row {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.desktop-logo-wrapper {
  flex: 0 0 auto;
  max-width: 200px;
}

.desktop-commerce-logo {
  display: flex;
  align-items: center;
  max-width: 150px;
  text-align: left;
}

.logo-desktop {
  max-width: 120px;
  max-height: 100px;
  width: auto;
  height: auto;
  margin-bottom: 0;
}

.desktop-menu-wrapper {
  flex: 1 1 0%;
  min-width: 0;
  width: auto;
  text-align: left;
}

/* Container */
.telemedicine-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Modern Filter Tabs */
.filter-tabs-modern {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  padding: 1rem;
  background: rgba(68, 111, 252, 0.05);
  border-radius: 1rem;
  margin-bottom: 2rem;
}

.filter-tab-btn {
  padding: 0.625rem 1.25rem;
  border: 2px solid transparent;
  background: var(--color-background);
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-tab-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(68, 111, 252, 0.15);
  border-color: rgba(68, 111, 252, 0.3);
}

.filter-tab-btn.active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-color: var(--azul-turno);
  box-shadow: 0 4px 12px rgba(68, 111, 252, 0.3);
}

.filter-tab-btn i {
  font-size: 1rem;
}

/* Empty State */
.empty-state-modern {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-icon {
  font-size: 4rem;
  color: var(--gris-elite-1);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-state-text {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
}

/* Sessions Grid */
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

/* Modern Session Card */
.session-card-modern {
  background: var(--color-background);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.session-card-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(68, 111, 252, 0.12);
  border-color: var(--azul-turno);
}

/* Card Header */
.session-card-header-modern {
  padding: 0.875rem;
  background: linear-gradient(135deg, rgba(68, 111, 252, 0.06) 0%, rgba(0, 194, 203, 0.06) 100%);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.session-meta-badges {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.session-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  background: rgba(68, 111, 252, 0.1);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--azul-turno);
  width: fit-content;
}

.session-status-badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  width: fit-content;
}

.session-status-badge-modern i {
  font-size: 0.4375rem;
}

.badge-active {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.badge-scheduled {
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
}

.badge-completed {
  background: rgba(107, 114, 128, 0.15);
  color: #4b5563;
}

.badge-cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.session-type-badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.type-video {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.type-chat {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.type-both {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* Card Body */
.session-card-body-modern {
  padding: 0.875rem;
  flex: 1;
}

.session-info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.625rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.375rem;
  transition: background 0.2s ease;
}

.session-info-row:hover {
  background: rgba(68, 111, 252, 0.05);
}

.session-info-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.session-info-label i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.session-info-value {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Card Footer */
.session-card-footer-modern {
  padding: 0.875rem;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.01);
}

.btn-session-access {
  width: 100%;
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.625rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

.btn-session-access:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(68, 111, 252, 0.3);
}

.btn-session-access:active {
  transform: translateY(0);
}

.session-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem;
  background: rgba(107, 114, 128, 0.08);
  border-radius: 0.625rem;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

/* Responsive Design */
@media (max-width: 992px) {
  .sessions-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .telemedicine-container {
    padding: 1rem;
  }

  .filter-tabs-modern {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .filter-tab-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
  }

  .sessions-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .session-card-header-modern {
    padding: 1rem;
  }

  .session-card-body-modern {
    padding: 1rem;
  }

  .session-card-footer-modern {
    padding: 1rem;
  }
}

@media (max-width: 576px) {
  .filter-tab-btn {
    flex: 1 1 calc(50% - 0.5rem);
    min-width: 140px;
    justify-content: center;
  }

  .sessions-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>

