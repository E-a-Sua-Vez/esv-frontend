<script>
import { ref, computed, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import { getDateAndHour } from '../../../shared/utils/date';
import {
  downloadExamOrderPdf,
  getExamOrderPdfUrl,
  updateExamOrderStatus,
  addExamResults,
} from '../../../application/services/medical-exam-order';

export default {
  name: 'MedicalExamOrderList',
  components: {
    Spinner,
    Message,
  },
  props: {
    examOrders: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    toggles: { type: Object, default: () => ({}) },
    sortAsc: { type: Boolean, default: true },
  },
  emits: ['create-new', 'complete', 'refresh'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const actionLoading = ref({});
    const showResultsModal = ref(false);
    const selectedOrder = ref(null);
    const resultsForm = ref({
      results: '',
      observations: '',
      attachments: [],
    });

    const { examOrders, loading, toggles, sortAsc } = toRefs(props);

    // Computed sorted exam orders
    const sortedExamOrders = computed(() => {
      if (!examOrders.value || examOrders.value.length === 0) return [];

      const sorted = [...examOrders.value].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderedAt);
        const dateB = new Date(b.createdAt || b.orderedAt);
        return sortAsc.value ? dateA - dateB : dateB - dateA;
      });

      return sorted;
    });

    // Set loading state for specific action
    const setActionLoading = (orderId, action, state) => {
      actionLoading.value = {
        ...actionLoading.value,
        [`${orderId}-${action}`]: state,
      };
    };

    // Check if action is loading
    const isActionLoading = (orderId, action) =>
      actionLoading.value[`${orderId}-${action}`] || false;

    // Download exam order PDF
    const handleDownloadPdf = async examOrder => {
      try {
        setActionLoading(examOrder.id, 'download', true);
        const pdfBlob = await downloadExamOrderPdf(examOrder.id);

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orden-examen-${examOrder.id}-${
          new Date().toISOString().split('T')[0]
        }.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading exam order PDF:', error);
      } finally {
        setActionLoading(examOrder.id, 'download', false);
      }
    };

    // View exam order PDF
    const handleViewPdf = async examOrder => {
      try {
        setActionLoading(examOrder.id, 'view', true);
        const pdfUrl = await getExamOrderPdfUrl(examOrder.id, 3600); // 1 hour expiry
        window.open(pdfUrl.url, '_blank');
      } catch (error) {
        console.error('Error viewing exam order PDF:', error);
        // Fallback to download
        await handleDownloadPdf(examOrder);
      } finally {
        setActionLoading(examOrder.id, 'view', false);
      }
    };

    // Update exam order status
    const handleStatusUpdate = async (examOrder, newStatus, scheduledDate = null) => {
      try {
        setActionLoading(examOrder.id, 'status', true);
        await updateExamOrderStatus(examOrder.id, newStatus, scheduledDate);
        emit('refresh');
      } catch (error) {
        console.error('Error updating exam order status:', error);
      } finally {
        setActionLoading(examOrder.id, 'status', false);
      }
    };

    // Schedule exam
    const handleSchedule = async examOrder => {
      const scheduledDate = prompt('Fecha y hora programada (YYYY-MM-DD HH:MM):');
      if (!scheduledDate) return;

      try {
        const dateTime = new Date(scheduledDate);
        if (isNaN(dateTime.getTime())) {
          alert('Formato de fecha inválido');
          return;
        }

        await handleStatusUpdate(examOrder, 'SCHEDULED', dateTime.toISOString());
      } catch (error) {
        alert('Error al programar el examen');
      }
    };

    // Complete exam
    const handleComplete = async examOrder => {
      await handleStatusUpdate(examOrder, 'COMPLETED');
      emit('complete', examOrder.id);
    };

    // Cancel exam
    const handleCancel = async examOrder => {
      const reason = prompt('Motivo de cancelación:');
      if (!reason) return;

      await handleStatusUpdate(examOrder, 'CANCELLED');
    };

    // Show results modal
    const showAddResults = examOrder => {
      selectedOrder.value = examOrder;
      resultsForm.value = {
        results: '',
        observations: '',
        attachments: [],
      };
      showResultsModal.value = true;
    };

    // Add exam results
    const handleAddResults = async () => {
      if (!selectedOrder.value) return;

      try {
        setActionLoading(selectedOrder.value.id, 'results', true);
        await addExamResults(selectedOrder.value.id, resultsForm.value);
        showResultsModal.value = false;
        selectedOrder.value = null;
        emit('refresh');
      } catch (error) {
        console.error('Error adding exam results:', error);
      } finally {
        setActionLoading(selectedOrder.value.id, 'results', false);
      }
    };

    // Get status badge class
    const getStatusBadgeClass = status => {
      const statusClasses = {
        PENDING: 'badge-warning',
        SCHEDULED: 'badge-info',
        IN_PROGRESS: 'badge-primary',
        COMPLETED: 'badge-success',
        CANCELLED: 'badge-danger',
        EXPIRED: 'badge-secondary',
      };
      return statusClasses[status] || 'badge-secondary';
    };

    // Get status text
    const getStatusText = status => {
      const statusTexts = {
        PENDING: 'Pendiente',
        SCHEDULED: 'Programado',
        IN_PROGRESS: 'En Proceso',
        COMPLETED: 'Completado',
        CANCELLED: 'Cancelado',
        EXPIRED: 'Vencido',
      };
      return statusTexts[status] || status;
    };

    // Get urgency badge class
    const getUrgencyBadgeClass = urgency => {
      const urgencyClasses = {
        ROUTINE: 'urgency-routine',
        URGENT: 'urgency-urgent',
        STAT: 'urgency-stat',
        ASAP: 'urgency-asap',
      };
      return urgencyClasses[urgency] || 'urgency-routine';
    };

    // Get urgency text
    const getUrgencyText = urgency => {
      const urgencyTexts = {
        ROUTINE: 'Rutina',
        URGENT: 'Urgente',
        STAT: 'STAT',
        ASAP: 'ASAP',
      };
      return urgencyTexts[urgency] || urgency;
    };

    // Check if can schedule
    const canSchedule = examOrder => examOrder.status === 'PENDING';

    // Check if can complete
    const canComplete = examOrder =>
      ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(examOrder.status);

    // Check if can cancel
    const canCancel = examOrder => ['PENDING', 'SCHEDULED'].includes(examOrder.status);

    // Check if can add results
    const canAddResults = examOrder =>
      ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(examOrder.status);

    return {
      t,
      loading,
      toggles,
      sortedExamOrders,
      showResultsModal,
      selectedOrder,
      resultsForm,
      getDateAndHour,
      handleDownloadPdf,
      handleViewPdf,
      handleSchedule,
      handleComplete,
      handleCancel,
      showAddResults,
      handleAddResults,
      isActionLoading,
      getStatusBadgeClass,
      getStatusText,
      getUrgencyBadgeClass,
      getUrgencyText,
      canSchedule,
      canComplete,
      canCancel,
      canAddResults,
    };
  },
};
</script>

<template>
  <div class="exam-order-list-modern">
    <Spinner :show="loading" />

    <!-- Header -->
    <div class="list-header">
      <div class="list-header-content">
        <h5 class="list-title">
          <i class="bi bi-clipboard-data me-2"></i>
          Órdenes de Examen
        </h5>
        <p class="list-subtitle">Historial de órdenes de exámenes diagnósticos</p>
      </div>

      <button
        class="btn-create-new"
        @click="$emit('create-new')"
        :disabled="!toggles['patient.history.edit']"
      >
        <i class="bi bi-plus-circle me-2"></i>
        Nueva Orden
      </button>
    </div>

    <!-- Exam Orders List -->
    <div v-if="sortedExamOrders.length > 0" class="exam-orders-container">
      <div v-for="examOrder in sortedExamOrders" :key="examOrder.id" class="exam-order-card">
        <!-- Card Header -->
        <div class="exam-order-header">
          <div class="exam-order-info">
            <div class="exam-order-date">
              <i class="bi bi-calendar3 me-1"></i>
              {{ getDateAndHour(examOrder.createdAt || examOrder.orderedAt) }}
            </div>
            <div class="exam-order-id">ID: {{ examOrder.id.slice(-8) }}</div>
          </div>

          <div class="exam-order-badges">
            <span :class="['status-badge', getStatusBadgeClass(examOrder.status)]">
              {{ getStatusText(examOrder.status) }}
            </span>
            <span :class="['urgency-badge', getUrgencyBadgeClass(examOrder.urgency)]">
              {{ getUrgencyText(examOrder.urgency) }}
            </span>
          </div>
        </div>

        <!-- Exam Order Details -->
        <div class="exam-order-content">
          <!-- Clinical Indication -->
          <div v-if="examOrder.clinicalIndication" class="clinical-indication">
            <strong>Indicación Clínica:</strong> {{ examOrder.clinicalIndication }}
          </div>

          <!-- Diagnosis -->
          <div v-if="examOrder.diagnosis" class="diagnosis">
            <strong>Diagnóstico:</strong> {{ examOrder.diagnosis }}
          </div>

          <!-- Exams -->
          <div v-if="examOrder.exams && examOrder.exams.length > 0" class="exams-section">
            <h6 class="exams-title">
              <i class="bi bi-list-check me-1"></i>
              Exámenes Solicitados ({{ examOrder.exams.length }})
            </h6>

            <div class="exams-grid">
              <div v-for="(exam, index) in examOrder.exams" :key="index" class="exam-item">
                <div class="exam-name">{{ exam.examName || exam.name }}</div>
                <div class="exam-details">
                  <span v-if="exam.examCode" class="exam-code">{{ exam.examCode }}</span>
                  <span v-if="exam.type" class="exam-type">{{ exam.type }}</span>
                  <span v-if="exam.estimatedDuration" class="exam-duration">{{
                    exam.estimatedDuration
                  }}</span>
                </div>
                <div v-if="exam.instructions" class="exam-instructions">
                  {{ exam.instructions }}
                </div>
                <div v-if="exam.preparationInstructions" class="exam-preparation">
                  <strong>Preparación:</strong> {{ exam.preparationInstructions }}
                </div>
              </div>
            </div>
          </div>

          <!-- Special Instructions -->
          <div v-if="examOrder.specialInstructions" class="special-instructions">
            <strong>Instrucciones Especiales:</strong>
            <p>{{ examOrder.specialInstructions }}</p>
          </div>

          <!-- Scheduled Date -->
          <div v-if="examOrder.scheduledDate" class="scheduled-info">
            <i class="bi bi-calendar-event me-1"></i>
            <strong>Programado para:</strong> {{ getDateAndHour(examOrder.scheduledDate) }}
          </div>

          <!-- Fasting Required -->
          <div v-if="examOrder.fasting" class="fasting-info">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            <strong>Requiere ayuno</strong>
          </div>

          <!-- Exam Order Meta -->
          <div class="exam-order-meta">
            <div v-if="examOrder.doctorName" class="meta-item">
              <i class="bi bi-person-badge me-1"></i>
              <span>Dr. {{ examOrder.doctorName }}</span>
            </div>
            <div v-if="examOrder.totalCost" class="meta-item">
              <i class="bi bi-currency-dollar me-1"></i>
              <span>Costo: ${{ examOrder.totalCost.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Results Section -->
          <div v-if="examOrder.results && examOrder.results.length > 0" class="results-section">
            <h6 class="results-title">
              <i class="bi bi-file-medical me-1"></i>
              Resultados
            </h6>
            <div v-for="(result, index) in examOrder.results" :key="index" class="result-item">
              <div class="result-date">{{ getDateAndHour(result.createdAt) }}</div>
              <div class="result-content">{{ result.results }}</div>
              <div v-if="result.observations" class="result-observations">
                <strong>Observaciones:</strong> {{ result.observations }}
              </div>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="exam-order-actions">
          <!-- View/Download PDF -->
          <button
            class="action-btn btn-view"
            @click="handleViewPdf(examOrder)"
            :disabled="isActionLoading(examOrder.id, 'view')"
            title="Ver orden"
          >
            <Spinner v-if="isActionLoading(examOrder.id, 'view')" :show="true" size="sm" />
            <i v-else class="bi bi-eye"></i>
          </button>

          <button
            class="action-btn btn-download"
            @click="handleDownloadPdf(examOrder)"
            :disabled="isActionLoading(examOrder.id, 'download')"
            title="Descargar PDF"
          >
            <Spinner v-if="isActionLoading(examOrder.id, 'download')" :show="true" size="sm" />
            <i v-else class="bi bi-download"></i>
          </button>

          <!-- Schedule -->
          <button
            v-if="canSchedule(examOrder)"
            class="action-btn btn-schedule"
            @click="handleSchedule(examOrder)"
            :disabled="isActionLoading(examOrder.id, 'status') || !toggles['patient.history.edit']"
            title="Programar examen"
          >
            <Spinner v-if="isActionLoading(examOrder.id, 'status')" :show="true" size="sm" />
            <i v-else class="bi bi-calendar-plus"></i>
          </button>

          <!-- Add Results -->
          <button
            v-if="canAddResults(examOrder)"
            class="action-btn btn-results"
            @click="showAddResults(examOrder)"
            :disabled="isActionLoading(examOrder.id, 'results') || !toggles['patient.history.edit']"
            title="Agregar resultados"
          >
            <Spinner v-if="isActionLoading(examOrder.id, 'results')" :show="true" size="sm" />
            <i v-else class="bi bi-file-plus"></i>
          </button>

          <!-- Complete -->
          <button
            v-if="canComplete(examOrder)"
            class="action-btn btn-complete"
            @click="handleComplete(examOrder)"
            :disabled="isActionLoading(examOrder.id, 'status') || !toggles['patient.history.edit']"
            title="Marcar como completado"
          >
            <Spinner v-if="isActionLoading(examOrder.id, 'status')" :show="true" size="sm" />
            <i v-else class="bi bi-check-circle"></i>
          </button>

          <!-- Cancel -->
          <button
            v-if="canCancel(examOrder)"
            class="action-btn btn-cancel"
            @click="handleCancel(examOrder)"
            :disabled="isActionLoading(examOrder.id, 'status') || !toggles['patient.history.edit']"
            title="Cancelar orden"
          >
            <Spinner v-if="isActionLoading(examOrder.id, 'status')" :show="true" size="sm" />
            <i v-else class="bi bi-x-circle"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="empty-state">
      <Message
        :title="t('examOrder.list.empty.title') || 'No hay órdenes de examen'"
        :content="
          t('examOrder.list.empty.content') ||
          'Este paciente no tiene órdenes de examen registradas. Haga clic en &quot;Nueva Orden&quot; para crear la primera.'
        "
      />
    </div>

    <!-- Results Modal -->
    <div v-if="showResultsModal" class="modal-overlay" @click="showResultsModal = false">
      <div class="results-modal" @click.stop>
        <div class="modal-header">
          <h5>Agregar Resultados</h5>
          <button class="btn-close-modal" @click="showResultsModal = false">
            <i class="bi bi-x"></i>
          </button>
        </div>

        <div class="modal-content">
          <div class="form-field">
            <label class="form-label">Resultados *</label>
            <textarea
              v-model="resultsForm.results"
              class="form-control"
              rows="4"
              placeholder="Ingrese los resultados del examen"
            ></textarea>
          </div>

          <div class="form-field">
            <label class="form-label">Observaciones</label>
            <textarea
              v-model="resultsForm.observations"
              class="form-control"
              rows="2"
              placeholder="Observaciones adicionales"
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button
            class="btn-save-results"
            @click="handleAddResults"
            :disabled="!resultsForm.results.trim()"
          >
            <i class="bi bi-check-circle me-2"></i>
            Guardar Resultados
          </button>

          <button class="btn-cancel-modal" @click="showResultsModal = false">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exam-order-list-modern {
  width: 100%;
}

/* Header */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.list-header-content {
  flex: 1;
}

.list-title {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.25rem 0;
}

.list-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
}

.btn-create-new {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-create-new:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-create-new:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Exam Orders Container */
.exam-orders-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Exam Order Card */
.exam-order-card {
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.875rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.exam-order-card:hover {
  border-color: rgba(0, 123, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Card Header */
.exam-order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.exam-order-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.exam-order-date {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.exam-order-id {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  font-family: monospace;
}

.exam-order-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Badges */
.status-badge,
.urgency-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-success {
  background: rgba(40, 167, 69, 0.2);
  color: #155724;
}

.badge-info {
  background: rgba(23, 162, 184, 0.2);
  color: #0c5460;
}

.badge-warning {
  background: rgba(255, 193, 7, 0.2);
  color: #856404;
}

.badge-danger {
  background: rgba(220, 53, 69, 0.2);
  color: #721c24;
}

.badge-secondary {
  background: rgba(108, 117, 125, 0.2);
  color: #495057;
}

.badge-primary {
  background: rgba(0, 123, 255, 0.2);
  color: #004085;
}

.urgency-routine {
  background: rgba(40, 167, 69, 0.1);
  color: #155724;
}

.urgency-urgent {
  background: rgba(255, 193, 7, 0.1);
  color: #856404;
}

.urgency-stat {
  background: rgba(220, 53, 69, 0.1);
  color: #721c24;
}

.urgency-asap {
  background: rgba(255, 107, 0, 0.1);
  color: #cc4400;
}

/* Card Content */
.exam-order-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.clinical-indication,
.diagnosis {
  font-size: 0.9rem;
  color: var(--color-text);
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.5rem;
  border-left: 4px solid var(--azul-turno);
}

/* Exams */
.exams-section {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
  padding: 1rem;
}

.exams-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.75rem 0;
}

.exams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0.75rem;
}

.exam-item {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.exam-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.exam-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.exam-code,
.exam-type,
.exam-duration {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
}

.exam-code {
  background: rgba(0, 123, 255, 0.1);
  color: var(--azul-turno);
}

.exam-type {
  background: rgba(108, 117, 125, 0.1);
  color: #495057;
}

.exam-duration {
  background: rgba(40, 167, 69, 0.1);
  color: #155724;
}

.exam-instructions,
.exam-preparation {
  font-size: 0.8rem;
  color: var(--color-text);
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.25rem;
}

/* Special Instructions */
.special-instructions {
  font-size: 0.9rem;
  color: var(--color-text);
}

.special-instructions p {
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}

/* Info Items */
.scheduled-info,
.fasting-info {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.fasting-info {
  color: #856404;
  background: rgba(255, 193, 7, 0.1);
}

/* Meta Information */
.exam-order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.meta-item {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Results Section */
.results-section {
  background: rgba(40, 167, 69, 0.05);
  border-radius: 0.5rem;
  padding: 1rem;
}

.results-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: #155724;
  margin: 0 0 0.75rem 0;
}

.result-item {
  background: white;
  border: 1px solid rgba(40, 167, 69, 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.result-date {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 0.5rem;
}

.result-content {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.5;
}

.result-observations {
  font-size: 0.85rem;
  color: var(--color-text);
  margin-top: 0.5rem;
  font-style: italic;
}

/* Actions */
.exam-order-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.btn-view {
  background: rgba(0, 123, 255, 0.1);
  color: var(--azul-turno);
}

.btn-view:hover:not(:disabled) {
  background: rgba(0, 123, 255, 0.2);
}

.btn-download {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.btn-download:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.2);
}

.btn-schedule {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.btn-schedule:hover:not(:disabled) {
  background: rgba(255, 193, 7, 0.2);
}

.btn-results {
  background: rgba(23, 162, 184, 0.1);
  color: #17a2b8;
}

.btn-results:hover:not(:disabled) {
  background: rgba(23, 162, 184, 0.2);
}

.btn-complete {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.btn-complete:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.2);
}

.btn-cancel {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.2);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 2rem;
}

/* Results Modal */
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
  z-index: 1000;
}

.results-modal {
  background: white;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-header h5 {
  margin: 0;
  font-weight: 600;
  color: var(--color-text);
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.btn-close-modal:hover {
  background: rgba(0, 0, 0, 0.1);
}

.modal-content {
  padding: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  background: white;
  resize: vertical;
}

.form-control:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.btn-save-results {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-save-results:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-save-results:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel-modal {
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel-modal:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .exam-order-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .exam-order-badges {
    align-self: flex-start;
  }

  .exams-grid {
    grid-template-columns: 1fr;
  }

  .exam-details {
    flex-direction: column;
    gap: 0.25rem;
  }

  .exam-order-meta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .exam-order-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .results-modal {
    width: 95%;
    margin: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-save-results,
  .btn-cancel-modal {
    width: 100%;
    justify-content: center;
  }
}
</style>
