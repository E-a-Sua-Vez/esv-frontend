<template>
  <div class="hl7-monitoring-dashboard patient-form-modern">
    <div class="dashboard-header">
      <div class="dashboard-header-content">
        <div class="dashboard-header-icon">
          <i class="bi bi-activity"></i>
        </div>
        <div class="dashboard-header-title">
          <h4>Monitoreo HL7</h4>
          <p class="text-muted small mb-0">Estado de integración con laboratorios</p>
        </div>
      </div>
      <div class="dashboard-header-actions">
        <button
          type="button"
          class="btn-action btn-refresh"
          @click="refreshData"
          :disabled="loading"
        >
          <i class="bi bi-arrow-clockwise" :class="{ spinning: loading }"></i>
          Actualizar
        </button>
      </div>
    </div>

    <div v-if="loading && !statistics" class="text-center py-5">
      <Spinner />
    </div>

    <div v-else>
      <!-- Statistics Cards -->
      <div class="statistics-grid">
        <div class="stat-card">
          <div class="stat-card-icon stat-success">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ statistics?.processed || 0 }}</div>
            <div class="stat-card-label">Procesados</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-icon stat-warning">
            <i class="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ statistics?.errors || 0 }}</div>
            <div class="stat-card-label">Errores</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-icon stat-info">
            <i class="bi bi-clock-history"></i>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ statistics?.pending || 0 }}</div>
            <div class="stat-card-label">Pendientes</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-icon stat-primary">
            <i class="bi bi-building"></i>
          </div>
          <div class="stat-card-content">
            <div class="stat-card-value">{{ statistics?.laboratories || 0 }}</div>
            <div class="stat-card-label">Laboratorios</div>
          </div>
        </div>
      </div>

      <!-- Laboratories List -->
      <div class="laboratories-section">
        <h5 class="section-title">
          <i class="bi bi-building me-2"></i>
          Laboratorios Activos
        </h5>
        <div class="laboratories-list">
          <div v-for="lab in laboratories" :key="lab.id" class="laboratory-card">
            <div class="laboratory-card-header">
              <div class="laboratory-info">
                <h6 class="laboratory-name">{{ lab.name }}</h6>
                <span class="laboratory-code">{{ lab.code }}</span>
              </div>
              <div class="laboratory-status">
                <span
                  class="status-badge"
                  :class="lab.active ? 'status-active' : 'status-inactive'"
                >
                  {{ lab.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            <div class="laboratory-card-body">
              <div class="laboratory-details">
                <div class="detail-item">
                  <i class="bi bi-check-circle me-2"></i>
                  <span>HL7: {{ lab.hl7Enabled ? 'Habilitado' : 'Deshabilitado' }}</span>
                </div>
                <div class="detail-item" v-if="lab.email">
                  <i class="bi bi-envelope me-2"></i>
                  <span>{{ lab.email }}</span>
                </div>
                <div class="detail-item" v-if="lab.phone">
                  <i class="bi bi-telephone me-2"></i>
                  <span>{{ lab.phone }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Messages -->
      <div class="messages-section">
        <h5 class="section-title">
          <i class="bi bi-inbox me-2"></i>
          Mensajes Recientes
        </h5>
        <div class="messages-list">
          <div
            v-for="message in recentMessages"
            :key="message.id"
            class="message-card"
            :class="{ 'message-error': message.error, 'message-success': !message.error }"
          >
            <div class="message-header">
              <div class="message-info">
                <span class="message-type">{{ message.messageType }}</span>
                <span class="message-date">{{ formatDate(message.createdAt) }}</span>
              </div>
              <div class="message-status">
                <i
                  :class="
                    message.processed
                      ? 'bi bi-check-circle-fill text-success'
                      : 'bi bi-clock text-warning'
                  "
                ></i>
              </div>
            </div>
            <div class="message-body" v-if="message.error">
              <div class="error-message">
                <i class="bi bi-exclamation-circle me-2"></i>
                {{ message.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import Spinner from '../../common/Spinner.vue';
import { getDateAndHour } from '../../../shared/utils/date';

export default {
  name: 'HL7MonitoringDashboard',
  components: {
    Spinner,
  },
  setup() {
    const loading = ref(false);
    const statistics = ref(null);
    const laboratories = ref([]);
    const recentMessages = ref([]);

    const loadData = async () => {
      loading.value = true;
      try {
        // TODO: Implementar servicios reales
        // const stats = await getHL7Statistics();
        // const labs = await listLaboratories();
        // const messages = await getRecentHL7Messages();

        // Mock data por ahora
        statistics.value = {
          processed: 1250,
          errors: 12,
          pending: 3,
          laboratories: 5,
        };

        laboratories.value = [
          {
            id: '1',
            name: 'Laboratorio Central',
            code: 'LAB-CENTRAL',
            active: true,
            hl7Enabled: true,
            email: 'contacto@labcentral.com',
            phone: '+5511999999999',
          },
        ];

        recentMessages.value = [
          {
            id: '1',
            messageType: 'ORU^R01',
            processed: true,
            createdAt: new Date(),
            error: null,
          },
        ];
      } catch (error) {
        console.error('Error loading HL7 monitoring data:', error);
      } finally {
        loading.value = false;
      }
    };

    const refreshData = () => {
      loadData();
    };

    const formatDate = date => getDateAndHour(date);

    onMounted(() => {
      loadData();
    });

    return {
      loading,
      statistics,
      laboratories,
      recentMessages,
      refreshData,
      formatDate,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.hl7-monitoring-dashboard {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.dashboard-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dashboard-header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.dashboard-header-title h4 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: 1.25rem;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s ease;
}

.stat-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.stat-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
}

.stat-card-icon.stat-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.stat-card-icon.stat-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.stat-card-icon.stat-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.stat-card-icon.stat-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.stat-card-content {
  flex: 1;
}

.stat-card-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-card-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.laboratories-section,
.messages-section {
  margin-bottom: 2rem;
}

.laboratories-list,
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.laboratory-card,
.message-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.laboratory-card:hover,
.message-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.laboratory-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.laboratory-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}

.laboratory-code {
  font-size: 0.875rem;
  color: #6b7280;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-inactive {
  background: #fee2e2;
  color: #991b1b;
}

.laboratory-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--color-text);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.message-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.message-type {
  font-weight: 600;
  color: var(--color-text);
}

.message-date {
  font-size: 0.875rem;
  color: #6b7280;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.btn-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .statistics-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
