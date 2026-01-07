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
            :title="$t('clientPortal.history.title')"
            :toggles="toggles"
            component-name="clientPortalHistory"
            :is-client-portal="true"
            @goBack="goBack"
          />
        </div>
      </div>
      <div class="d-block d-lg-none">
        <ComponentMenu
          :title="$t('clientPortal.history.title')"
          :toggles="toggles"
          component-name="clientPortalHistory"
          :is-client-portal="true"
          @goBack="goBack"
        />
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
      <div v-else class="history-container-modern">
        <!-- Filter Tabs Modern -->
        <div class="filter-tabs-modern">
          <button
            v-for="filter in filters"
            :key="filter"
            type="button"
            class="filter-btn-modern"
            :class="{ active: activeFilter === filter }"
            @click="setFilter(filter)"
          >
            <i
              :class="`bi ${
                filter === 'all'
                  ? 'bi-list-ul'
                  : filter === 'completed'
                  ? 'bi-check-circle'
                  : filter === 'cancelled'
                  ? 'bi-x-circle'
                  : 'bi-clock'
              }`"
            ></i>
            {{ $t(`clientPortal.history.filters.${filter}`) }}
          </button>
        </div>

        <!-- Upcoming Attentions Highlight -->
        <div v-if="upcomingAttentions.length > 0" class="upcoming-section">
          <h6 class="upcoming-title">
            <i class="bi bi-calendar-check"></i>
            Próximas Atenciones
          </h6>
          <div class="upcoming-cards">
            <div
              v-for="attention in upcomingAttentions"
              :key="attention.id"
              class="upcoming-card"
            >
              <div class="upcoming-icon">
                <i class="bi bi-calendar-event"></i>
              </div>
              <div class="upcoming-content">
                <div class="upcoming-date">{{ formatDate(attention.createdAt) }}</div>
                <div class="upcoming-time" v-if="attention.createdAt">
                  <i class="bi bi-clock"></i>
                  {{ formatTime(attention.createdAt) }}
                </div>
                <div
                  class="upcoming-service"
                  v-if="attention.servicesDetails && attention.servicesDetails.length > 0"
                >
                  {{ attention.servicesDetails.map(s => s.name || s).join(', ') }}
                </div>
              </div>
              <div class="upcoming-badge">
                <i class="bi bi-hourglass-split"></i>
                Pendiente
              </div>
            </div>
          </div>
        </div>

        <!-- Timeline Container -->
        <div class="timeline-history-container">
          <div v-if="filteredAttentions.length === 0" class="empty-state-history">
            <i class="bi bi-clock-history"></i>
            <p>{{ $t('clientPortal.history.noAttentions') }}</p>
          </div>

          <div v-else class="timeline-list">
            <div
              v-for="(attention, index) in filteredAttentions"
              :key="attention.id"
              class="timeline-item-history"
            >
              <!-- Timeline dot -->
              <div class="timeline-dot-history" :class="getStatusClass(attention.status)">
                <i
                  :class="`bi ${
                    getStatusClass(attention.status)['badge-completed']
                      ? 'bi-check-lg'
                      : getStatusClass(attention.status)['badge-cancelled']
                      ? 'bi-x-lg'
                      : 'bi-clock'
                  }`"
                ></i>
              </div>

              <!-- Timeline line -->
              <div
                v-if="index < filteredAttentions.length - 1"
                class="timeline-line-history"
              ></div>

              <!-- Attention card -->
              <div class="attention-card-modern">
                <div class="attention-header-modern">
                  <div class="attention-number-modern">
                    <i class="bi bi-hash"></i>
                    {{ attention.number }}
                  </div>
                  <div class="attention-status-modern" :class="getStatusClass(attention.status)">
                    <i
                      :class="`bi ${
                        getStatusClass(attention.status)['badge-completed']
                          ? 'bi-check-circle-fill'
                          : getStatusClass(attention.status)['badge-cancelled']
                          ? 'bi-x-circle-fill'
                          : 'bi-clock-fill'
                      }`"
                    ></i>
                    {{ $t(`clientPortal.history.status.${attention.status?.toLowerCase()}`) }}
                  </div>
                </div>

                <div class="attention-body-modern">
                  <div class="attention-info-row">
                    <div class="info-item-modern">
                      <i class="bi bi-calendar3"></i>
                      <span>{{ formatDate(attention.createdAt) }}</span>
                    </div>
                    <div class="info-item-modern" v-if="attention.createdAt">
                      <i class="bi bi-clock"></i>
                      <span>{{ formatTime(attention.createdAt) }}</span>
                    </div>
                  </div>

                  <div
                    class="attention-info-row"
                    v-if="attention.endAt || attention.duration"
                  >
                    <div class="info-item-modern" v-if="attention.endAt">
                      <i class="bi bi-clock-history"></i>
                      <span>Fin: {{ formatTime(attention.endAt) }}</span>
                    </div>
                    <div class="info-item-modern" v-if="attention.duration">
                      <i class="bi bi-hourglass-split"></i>
                      <span>{{ formatDuration(attention.duration) }}</span>
                    </div>
                  </div>

                  <div
                    class="attention-service-modern"
                    v-if="attention.servicesDetails && attention.servicesDetails.length > 0"
                  >
                    <i class="bi bi-briefcase"></i>
                    <span>{{ attention.servicesDetails.map(s => s.name || s).join(', ') }}</span>
                  </div>

                  <div class="attention-comment-modern" v-if="attention.comment">
                    <i class="bi bi-chat-left-text"></i>
                    <span>{{ attention.comment }}</span>
                  </div>
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
import { getClientAttentions } from '../../application/services/client-portal';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientHistoryView',
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
    const attentions = ref([]);
    const client = ref(null);
    const commerce = ref(null);
    const activeFilter = ref('all');
    const permissions = ref({});

    // Toggles para ComponentMenu (computed basado en permisos)
    const toggles = computed(() => ({
      'clientPortal.history.view': permissions.value['client-portal.history.view'] || false,
      'clientPortal.history.details': permissions.value['client-portal.history.view'] || false,
    }));

    const filters = ['all', 'completed', 'cancelled', 'pending'];

    // Identificar próximas atenciones (pendientes en el futuro)
    const upcomingAttentions = computed(() => {
      const now = new Date();
      return attentions.value.filter(attention => {
        if (attention.status?.toLowerCase() !== 'pending') return false;
        const attentionDate = new Date(attention.createdAt);
        return attentionDate >= now;
      }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    const filteredAttentions = computed(() => {
      let filtered = [];
      const upcomingIds = upcomingAttentions.value.map(a => a.id);

      if (activeFilter.value === 'all') {
        filtered = attentions.value.filter(a => !upcomingIds.includes(a.id));
      } else {
        filtered = attentions.value.filter(attention => {
          if (upcomingIds.includes(attention.id)) return false;
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
      }

      // Ordenar por fecha descendente
      return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
      router.push({ name: 'client-portal-menu', params: { commerceSlug: commerceSlug.value } });
    };

    const loadAttentions = async () => {
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

    const loadPermissions = async () => {
      try {
        const clientPermissions = await getClientPortalPermissions('client-portal', 'history');
        permissions.value = clientPermissions;
      } catch (err) {
        console.error('Error loading permissions:', err);
        // Permisos por defecto si falla
        permissions.value = {
          'client-portal.history.view': true,
          'client-portal.history.details': true,
        };
      }
    };

    onMounted(async () => {
      await loadPermissions();
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
      upcomingAttentions,
      filteredAttentions,
      getStatusClass,
      formatDate,
      formatTime,
      formatDuration,
      setFilter,
      goBack,
      permissions,
      toggles,
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

/* History Container */
.history-container-modern {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

/* Filter Tabs Modern */
.filter-tabs-modern {
  display: flex;
  gap: 0.625rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.75rem;
}

.filter-btn-modern {
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

.filter-btn-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(68, 111, 252, 0.15);
  border-color: rgba(68, 111, 252, 0.3);
}

.filter-btn-modern.active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-color: var(--azul-turno);
  box-shadow: 0 4px 12px rgba(68, 111, 252, 0.3);
}

.filter-btn-modern i {
  font-size: 1rem;
}

/* Upcoming Section */
.upcoming-section {
  margin-bottom: 2rem;
}

.upcoming-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.875rem;
}

.upcoming-title i {
  font-size: 1.125rem;
  color: var(--azul-turno);
}

.upcoming-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.875rem;
}

.upcoming-card {
  background: linear-gradient(135deg, rgba(4, 159, 217, 0.08) 0%, rgba(0, 182, 122, 0.08) 100%);
  border: 2px solid var(--azul-turno);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  box-shadow: 0 4px 12px rgba(4, 159, 217, 0.15);
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%,
  100% {
    border-color: var(--azul-turno);
  }
  50% {
    border-color: var(--verde-tu);
  }
}

.upcoming-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 0.5rem;
  color: white;
  font-size: 1.25rem;
}

.upcoming-content {
  flex: 1;
  min-width: 0;
}

.upcoming-date {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.upcoming-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

.upcoming-time i {
  font-size: 0.6875rem;
}

.upcoming-service {
  font-size: 0.8125rem;
  color: var(--azul-turno);
  font-weight: 500;
}

.upcoming-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: var(--azul-turno);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
}

/* Timeline Container */
.timeline-history-container {
  position: relative;
}

.empty-state-history {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.empty-state-history i {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state-history p {
  font-size: 0.9375rem;
  margin: 0;
}

/* Timeline List */
.timeline-list {
  position: relative;
  padding: 0.5rem 0;
}

/* Timeline Item */
.timeline-item-history {
  position: relative;
  padding-left: 3rem;
  margin-bottom: 1rem;
}

.timeline-item-history:last-child {
  margin-bottom: 0;
}

/* Timeline Dot */
.timeline-dot-history {
  position: absolute;
  left: 0;
  top: 0.875rem;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--color-background);
  border: 2px solid var(--azul-turno);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-turno);
  font-size: 0.75rem;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 2;
}

.timeline-dot-history.badge-completed {
  border-color: #10b981;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.timeline-dot-history.badge-cancelled {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.timeline-dot-history.badge-pending {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

/* Timeline Line */
.timeline-line-history {
  position: absolute;
  left: 0.75rem;
  top: 2.375rem;
  bottom: -1rem;
  width: 2px;
  background: linear-gradient(180deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  opacity: 0.2;
  z-index: 1;
}

/* Attention Card Modern */
.attention-card-modern {
  background: var(--color-background);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.attention-card-modern:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
  border-color: rgba(4, 159, 217, 0.2);
}

/* Attention Header Modern */
.attention-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0.875rem;
  background: linear-gradient(135deg, rgba(4, 159, 217, 0.08) 0%, rgba(0, 182, 122, 0.08) 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.attention-number-modern {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--azul-turno);
}

.attention-status-modern {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
}

.attention-status-modern.badge-completed {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.attention-status-modern.badge-cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.attention-status-modern.badge-pending {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.attention-status-modern i {
  font-size: 0.625rem;
}

/* Attention Body Modern */
.attention-body-modern {
  padding: 0.875rem;
}

.attention-info-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.625rem;
}

.attention-info-row:last-child {
  margin-bottom: 0;
}

.info-item-modern {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.info-item-modern i {
  font-size: 0.6875rem;
  color: var(--azul-turno);
  opacity: 0.7;
}

.attention-service-modern,
.attention-comment-modern {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
  margin-top: 0.625rem;
  font-size: 0.8125rem;
}

.attention-service-modern i,
.attention-comment-modern i {
  flex-shrink: 0;
  margin-top: 0.125rem;
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.attention-service-modern span {
  color: var(--color-text);
  font-weight: 500;
}

.attention-comment-modern span {
  color: var(--color-text-secondary);
  font-style: italic;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .history-container-modern {
    padding: 0.75rem;
  }

  .filter-tabs-modern {
    gap: 0.375rem;
    padding: 0.625rem;
  }

  .filter-btn-modern {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .upcoming-cards {
    grid-template-columns: 1fr;
  }

  .timeline-item-history {
    padding-left: 2.5rem;
  }

  .timeline-dot-history {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 0.625rem;
  }

  .timeline-line-history {
    left: 0.625rem;
  }

  .attention-header-modern {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .attention-info-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>


