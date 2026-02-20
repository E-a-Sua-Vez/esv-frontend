<template>
  <div class="telemedicine-session-list patient-form-modern">
    <div class="list-header">
      <div class="header-content">
        <div class="header-icon">
          <i class="bi bi-camera-video"></i>
        </div>
        <div class="header-title">
          <h5>{{ $t('telemedicineSession.listTitle') }}</h5>
          <span v-if="loading" class="status-badge badge-modern badge-modern-warning">
            <i class="bi bi-circle-fill me-1"></i>
            {{ $t('telemedicineSession.loading') }}
          </span>
        </div>
      </div>
      <button
        v-if="showRefresh"
        type="button"
        class="btn-modern btn-sm"
        @click="loadSessions"
        :disabled="loading"
      >
        <i class="bi bi-arrow-clockwise"></i>
        {{ $t('telemedicineSession.refresh') }}
      </button>
    </div>

    <div class="list-filters" v-if="showFilters">
      <div class="filter-group">
        <label class="form-label-modern">
          <i class="bi bi-funnel"></i>
          {{ $t('telemedicineSession.filterStatus') }}
        </label>
        <select class="form-control-modern" v-model="filters.status" @change="applyFilters">
          <option value="">{{ $t('telemedicineSession.filterAll') }}</option>
          <option value="SCHEDULED">{{ $t('telemedicineSession.filterScheduled') }}</option>
          <option value="ACTIVE">{{ $t('telemedicineSession.filterActive') }}</option>
          <option value="ENDED">{{ $t('telemedicineSession.filterEnded') }}</option>
          <option value="CANCELLED">{{ $t('telemedicineSession.filterCancelled') }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="form-label-modern">
          <i class="bi bi-calendar"></i>
          {{ $t('telemedicineSession.filterFrom') }}
        </label>
        <input
          type="date"
          class="form-control-modern"
          v-model="filters.dateFrom"
          @change="applyFilters"
        />
      </div>

      <div class="filter-group">
        <label class="form-label-modern">
          <i class="bi bi-calendar"></i>
          {{ $t('telemedicineSession.filterTo') }}
        </label>
        <input
          type="date"
          class="form-control-modern"
          v-model="filters.dateTo"
          @change="applyFilters"
        />
      </div>

      <div class="filter-group">
        <button type="button" class="btn-modern btn-sm" @click="clearFilters">
          <i class="bi bi-x-circle me-1"></i>
          {{ $t('telemedicineSession.clearFilters') }}
        </button>
      </div>
    </div>

    <div class="list-content">
      <div v-if="loading" class="text-center py-5">
        <Spinner />
      </div>

      <div v-else-if="filteredSessions.length === 0" class="empty-state-modern">
        <div class="empty-state-modern-icon">
          <i class="bi bi-camera-video-off"></i>
        </div>
        <div class="empty-state-modern-text">{{ $t('telemedicineSession.noSessions') }}</div>
      </div>

      <div v-else class="sessions-grid">
        <TelemedicineSessionCard
          v-for="session in filteredSessions"
          :key="session.id"
          :session="session"
          :user-type="userType"
          :current-user-id="currentUserId"
          @session-selected="handleSessionSelected"
          @start-session="handleStartSession"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import {
  getDoctorTelemedicineSessions,
  getClientTelemedicineSessions,
} from '../../../application/services/telemedicine';
import TelemedicineSessionCard from './TelemedicineSessionCard.vue';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'TelemedicineSessionList',
  components: {
    TelemedicineSessionCard,
    Spinner,
  },
  props: {
    doctorId: {
      type: String,
      default: null,
    },
    clientId: {
      type: String,
      default: null,
    },
    userType: {
      type: String,
      required: true,
      validator: value => ['doctor', 'patient'].includes(value),
    },
    currentUserId: {
      type: String,
      required: true,
    },
    showFilters: {
      type: Boolean,
      default: true,
    },
    showRefresh: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['session-selected', 'start-session'],
  setup(props, { emit }) {
    const loading = ref(false);
    const sessions = ref([]);
    const filters = reactive({
      status: '',
      dateFrom: '',
      dateTo: '',
    });

    const loadSessions = async () => {
      try {
        loading.value = true;
        let loadedSessions = [];

        if (props.userType === 'doctor' && props.doctorId) {
          loadedSessions = await getDoctorTelemedicineSessions(props.doctorId);
        } else if (props.userType === 'patient' && props.clientId) {
          loadedSessions = await getClientTelemedicineSessions(props.clientId);
        }

        sessions.value = loadedSessions || [];
      } catch (error) {
        console.error('Error loading sessions:', error);
        sessions.value = [];
      } finally {
        loading.value = false;
      }
    };

    const filteredSessions = computed(() => {
      let filtered = [...sessions.value];

      // Filtrar por estado
      if (filters.status) {
        filtered = filtered.filter(s => s.status === filters.status);
      }

      // Filtrar por fecha desde
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        filtered = filtered.filter(s => {
          const sessionDate = new Date(s.scheduledAt);
          return sessionDate >= fromDate;
        });
      }

      // Filtrar por fecha hasta
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Incluir todo el día
        filtered = filtered.filter(s => {
          const sessionDate = new Date(s.scheduledAt);
          return sessionDate <= toDate;
        });
      }

      // Ordenar por fecha programada (más recientes primero)
      return filtered.sort((a, b) => {
        const dateA = new Date(a.scheduledAt);
        const dateB = new Date(b.scheduledAt);
        return dateB - dateA;
      });
    });

    const applyFilters = () => {
      // Los filtros se aplican automáticamente a través del computed
    };

    const clearFilters = () => {
      filters.status = '';
      filters.dateFrom = '';
      filters.dateTo = '';
    };

    const handleSessionSelected = session => {
      emit('session-selected', session);
    };

    const handleStartSession = session => {
      emit('start-session', session);
    };

    onMounted(() => {
      loadSessions();
    });

    return {
      loading,
      sessions,
      filters,
      filteredSessions,
      loadSessions,
      applyFilters,
      clearFilters,
      handleSessionSelected,
      handleStartSession,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.telemedicine-session-list {
  padding: 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.header-title h5 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.list-filters {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
}

.list-content {
  padding: 1rem 1.25rem;
  min-height: 200px;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .sessions-grid {
    grid-template-columns: 1fr;
  }

  .list-filters {
    flex-direction: column;
  }

  .filter-group {
    min-width: 100%;
  }
}
</style>
