<template>
  <div class="exam-order-list-modern">
    <div class="list-header">
      <div class="list-header-content">
        <div class="list-header-icon">
          <i class="bi bi-clipboard-data"></i>
        </div>
        <div class="list-header-title">
          <h4>Historial de Exámenes Médicos</h4>
          <p class="text-muted small mb-0">{{ examOrders.length }} orden(es)</p>
        </div>
      </div>
      <div class="list-header-actions">
        <button
          v-if="toggles['patient.history.edit']"
          type="button"
          class="btn btn-sm btn-primary"
          @click="$emit('create-new')"
        >
          <i class="bi bi-plus-circle me-1"></i>
          Nueva Orden
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <Spinner />
    </div>

    <div v-else-if="examOrders.length === 0" class="empty-state">
      <Message
        title="No hay órdenes de exámenes"
        content="Aún no se han registrado órdenes de exámenes para este paciente"
      />
    </div>

    <div v-else class="exam-orders-timeline">
      <div v-for="order in sortedExamOrders" :key="order.id" class="exam-order-card">
        <div class="exam-order-card-header">
          <div class="exam-order-meta">
            <span class="exam-order-date-badge">
              <i class="bi bi-calendar3 me-1"></i>
              {{ getDate(order.createdAt) }}
            </span>
            <span class="exam-order-status-badge" :class="getStatusClass(order.status)">
              {{ getStatusLabel(order.status) }}
            </span>
            <span class="exam-order-priority-badge" :class="getPriorityClass(order.priority)">
              {{ getPriorityLabel(order.priority) }}
            </span>
          </div>
          <div class="exam-order-actions">
            <!-- PDF Button: Always visible, different states -->
            <button
              v-if="order.pdfUrl"
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="downloadPdf(order.id)"
              title="Descargar PDF"
              :disabled="downloadingPdf === order.id"
            >
              <i v-if="downloadingPdf !== order.id" class="bi bi-file-earmark-pdf"></i>
              <span v-else class="spinner-border spinner-border-sm" role="status"></span>
              <span v-if="downloadingPdf !== order.id" class="ms-1">PDF</span>
            </button>
            <button
              v-else
              type="button"
              class="btn btn-sm btn-outline-secondary"
              title="Generando PDF..."
              disabled
            >
              <span class="spinner-border spinner-border-sm me-1" role="status"></span>
              <span>Generando PDF...</span>
            </button>
            <button
              v-if="order.status === 'REQUESTED' && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-outline-primary me-2"
              @click="openResultForm(order)"
              title="Cargar resultados"
            >
              <i class="bi bi-clipboard-check me-1"></i>
              Cargar Resultados
            </button>
            <button
              v-if="order.status === 'REQUESTED' && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-outline-success"
              @click="$emit('complete', order.id)"
              title="Marcar como completado"
            >
              <i class="bi bi-check-circle"></i>
            </button>
          </div>
        </div>

        <div class="exam-order-type">
          <i class="bi" :class="getTypeIcon(order.examType)"></i>
          <strong>{{ getTypeLabel(order.examType) }}</strong>
        </div>

        <div class="exam-order-exams">
          <div v-for="(exam, index) in order.exams" :key="index" class="exam-item">
            <div class="exam-info">
              <div class="exam-name">
                <strong>{{ exam.name }}</strong>
                <span v-if="exam.type" class="text-muted small ms-2"> ({{ exam.type }}) </span>
              </div>
              <div v-if="order.results && order.results.length > 0" class="exam-results-section">
                <button
                  type="button"
                  class="btn btn-sm btn-link p-0 mb-2"
                  @click="toggleResultView(order.id)"
                >
                  <i
                    class="bi"
                    :class="expandedResults[order.id] ? 'bi-chevron-up' : 'bi-chevron-down'"
                  ></i>
                  {{ order.results.length }} resultado(s)
                </button>
                <div v-if="expandedResults[order.id]">
                  <div
                    v-for="(result, resultIndex) in order.results"
                    :key="resultIndex"
                    class="result-view-container mb-3"
                  >
                    <ExamResultView
                      :result="result"
                      :historical-results="getHistoricalResults(order)"
                      :previous-result="getPreviousResult(order, resultIndex)"
                    />
                  </div>
                </div>
              </div>
              <div v-else-if="exam.result" class="exam-result">
                <i class="bi bi-file-earmark-text me-1"></i>
                <strong>Resultado:</strong> {{ exam.result }}
              </div>
              <div v-if="exam.documentId" class="exam-document">
                <i class="bi bi-paperclip me-1"></i>
                <a :href="`/documents/${exam.documentId}`" target="_blank">
                  Ver documento adjunto
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-if="order.clinicalJustification" class="exam-order-justification">
          <strong>Justificación clínica:</strong>
          <p>{{ order.clinicalJustification }}</p>
        </div>

        <div class="exam-order-footer">
          <div class="exam-order-dates">
            <span v-if="order.scheduledDate">
              <i class="bi bi-calendar-event me-1"></i>
              Programado: {{ getDate(order.scheduledDate) }}
            </span>
            <span v-if="order.completedDate">
              <i class="bi bi-check-circle me-1"></i>
              Completado: {{ getDate(order.completedDate) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para cargar resultados -->
    <div v-if="showResultForm && selectedOrder" class="modal-overlay" @click.self="closeResultForm">
      <div class="modal-content modal-content-large">
        <ExamResultForm
          :exam-order="selectedOrder"
          @close="closeResultForm"
          @saved="handleResultSaved"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import ExamResultForm from './ExamResultForm.vue';
import ExamResultView from './ExamResultView.vue';
import { getDate } from '../../../shared/utils/date';
import {
  downloadExamOrderPdf,
  getExamOrderById,
} from '../../../application/services/medical-exam-order';

export default {
  name: 'MedicalExamOrderList',
  components: {
    Spinner,
    Message,
    ExamResultForm,
    ExamResultView,
  },
  props: {
    examOrders: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    toggles: {
      type: Object,
      default: () => {},
    },
    sortAsc: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['create-new', 'complete', 'refresh'],
  setup(props, { emit }) {
    const showResultForm = ref(false);
    const selectedOrder = ref(null);
    const expandedResults = ref({});
    const downloadingPdf = ref(null);
    const pollingIntervals = ref({});

    const toggleResultView = orderId => {
      if (expandedResults.value[orderId]) {
        delete expandedResults.value[orderId];
      } else {
        expandedResults.value[orderId] = true;
      }
    };

    const openResultForm = order => {
      selectedOrder.value = order;
      showResultForm.value = true;
    };

    const closeResultForm = () => {
      showResultForm.value = false;
      selectedOrder.value = null;
    };

    const handleResultSaved = () => {
      emit('refresh');
      closeResultForm();
    };

    const getHistoricalResults = order => {
      // Obtener todos los resultados históricos del mismo tipo de examen
      if (!order.results || order.results.length === 0) return [];
      return order.results;
    };

    const getPreviousResult = (order, currentResultIndex) => {
      if (!order.results || currentResultIndex === 0) return null;
      return order.results[currentResultIndex - 1];
    };

    const downloadPdf = async examOrderId => {
      try {
        downloadingPdf.value = examOrderId;
        const blob = await downloadExamOrderPdf(examOrderId);

        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exam-order-${examOrderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error al descargar el PDF. Por favor, intente nuevamente.');
      } finally {
        downloadingPdf.value = null;
      }
    };

    // Polling para verificar si el PDF está listo
    const startPollingForPdf = orderId => {
      // No iniciar polling si ya está activo para esta orden
      if (pollingIntervals.value[orderId]) {
        return;
      }

      // Solo hacer polling para órdenes recientes (menos de 5 minutos)
      const order = props.examOrders.find(o => o.id === orderId);
      if (!order) return;

      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const maxPollingAge = 5 * 60 * 1000; // 5 minutos

      if (orderAge > maxPollingAge) {
        return; // No hacer polling para órdenes antiguas
      }

      let attempts = 0;
      const maxAttempts = 20; // Máximo 20 intentos (2 minutos con intervalo de 6 segundos)

      pollingIntervals.value[orderId] = setInterval(async () => {
        attempts++;

        try {
          const updatedOrder = await getExamOrderById(orderId);

          // Si el PDF ya está disponible, actualizar la lista
          if (updatedOrder.pdfUrl) {
            stopPollingForPdf(orderId);
            // Emitir evento para refrescar la lista
            emit('refresh');
            return;
          }

          // Si excedemos los intentos máximos, detener polling
          if (attempts >= maxAttempts) {
            stopPollingForPdf(orderId);
          }
        } catch (error) {
          console.error(`Error polling PDF for order ${orderId}:`, error);
          stopPollingForPdf(orderId);
        }
      }, 6000); // Verificar cada 6 segundos
    };

    const stopPollingForPdf = orderId => {
      if (pollingIntervals.value[orderId]) {
        clearInterval(pollingIntervals.value[orderId]);
        delete pollingIntervals.value[orderId];
      }
    };

    const stopAllPolling = () => {
      Object.keys(pollingIntervals.value).forEach(orderId => {
        stopPollingForPdf(orderId);
      });
    };

    // Iniciar polling para órdenes sin PDF
    watch(
      () => props.examOrders,
      newOrders => {
        newOrders.forEach(order => {
          if (!order.pdfUrl) {
            startPollingForPdf(order.id);
          } else {
            stopPollingForPdf(order.id);
          }
        });
      },
      { immediate: true }
    );

    onUnmounted(() => {
      stopAllPolling();
    });
    const sortedExamOrders = computed(() => {
      const sorted = [...props.examOrders];
      if (props.sortAsc) {
        return sorted.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        return sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });

    const getStatusClass = status => {
      const statusMap = {
        REQUESTED: 'status-requested',
        COMPLETED: 'status-completed',
        CANCELLED: 'status-cancelled',
      };
      return statusMap[status] || 'status-default';
    };

    const getStatusLabel = status => {
      const labelMap = {
        REQUESTED: 'Solicitado',
        COMPLETED: 'Completado',
        CANCELLED: 'Cancelado',
      };
      return labelMap[status] || status;
    };

    const getPriorityClass = priority => {
      const priorityMap = {
        routine: 'priority-routine',
        urgent: 'priority-urgent',
        emergency: 'priority-emergency',
      };
      return priorityMap[priority] || 'priority-default';
    };

    const getPriorityLabel = priority => {
      const labelMap = {
        routine: 'Rutina',
        urgent: 'Urgente',
        emergency: 'Emergencia',
      };
      return labelMap[priority] || priority;
    };

    const getTypeIcon = type => {
      const iconMap = {
        laboratory: 'bi-flask',
        imaging: 'bi-camera',
        procedure: 'bi-scissors',
        other: 'bi-file-medical',
      };
      return iconMap[type] || 'bi-file-medical';
    };

    const getTypeLabel = type => {
      const labelMap = {
        laboratory: 'Laboratorio',
        imaging: 'Imagenología',
        procedure: 'Procedimiento',
        other: 'Otro',
      };
      return labelMap[type] || type;
    };

    return {
      sortedExamOrders,
      getDate,
      getStatusClass,
      getStatusLabel,
      getPriorityClass,
      getPriorityLabel,
      getTypeIcon,
      getTypeLabel,
      showResultForm,
      downloadingPdf,
      downloadPdf,
      selectedOrder,
      expandedResults,
      toggleResultView,
      openResultForm,
      closeResultForm,
      handleResultSaved,
      getHistoricalResults,
      getPreviousResult,
      downloadPdf,
      downloadingPdf,
    };
  },
};
</script>

<style scoped>
.exam-order-list-modern {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

.list-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.list-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.list-header-title h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.loading-state,
.empty-state {
  padding: 3rem;
  text-align: center;
}

.exam-orders-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exam-order-card {
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.exam-order-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.exam-order-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.15);
}

.exam-order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.exam-order-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.exam-order-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.exam-order-status-badge,
.exam-order-priority-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-requested {
  background: #ffc107;
  color: #000;
}

.status-completed {
  background: #28a745;
  color: white;
}

.status-cancelled {
  background: #dc3545;
  color: white;
}

.priority-routine {
  background: #6c757d;
  color: white;
}

.priority-urgent {
  background: #fd7e14;
  color: white;
}

.priority-emergency {
  background: #dc3545;
  color: white;
}

.exam-order-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--color-text);
}

.exam-order-exams {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.exam-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0.5rem;
  border-left: 3px solid var(--azul-turno);
}

.exam-name {
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.exam-result {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(40, 167, 69, 0.1);
  border-radius: 0.375rem;
  font-size: 0.9rem;
}

.exam-results-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.result-view-container {
  margin-top: 1rem;
}

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
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content-large {
  max-width: 1200px;
}

.exam-document {
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.exam-order-justification {
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.5rem;
  border-left: 3px solid var(--azul-turno);
  margin-bottom: 1rem;
}

.exam-order-justification p {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
}

.exam-order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.exam-order-dates {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .exam-order-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .exam-order-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
