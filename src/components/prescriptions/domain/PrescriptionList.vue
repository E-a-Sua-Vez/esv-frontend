<script>
import { ref, computed, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import { getDateAndHour } from '../../../shared/utils/date';
import {
  downloadPrescriptionPdf,
  getPrescriptionPdfUrl,
  refillPrescription,
  recordDispensation,
  cancelPrescription,
} from '../../../application/services/prescription';

export default {
  name: 'PrescriptionList',
  components: {
    Spinner,
    Message,
  },
  props: {
    prescriptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    toggles: { type: Object, default: () => ({}) },
    sortAsc: { type: Boolean, default: true },
  },
  emits: ['create-new', 'refill', 'dispense', 'cancel', 'refresh'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const actionLoading = ref({});
    const { prescriptions, loading, toggles, sortAsc } = toRefs(props);

    // Computed sorted prescriptions
    const sortedPrescriptions = computed(() => {
      if (!prescriptions.value || prescriptions.value.length === 0) return [];

      const sorted = [...prescriptions.value].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.prescribedAt);
        const dateB = new Date(b.createdAt || b.prescribedAt);
        return sortAsc.value ? dateA - dateB : dateB - dateA;
      });

      return sorted;
    });

    // Set loading state for specific action
    const setActionLoading = (prescriptionId, action, state) => {
      actionLoading.value = {
        ...actionLoading.value,
        [`${prescriptionId}-${action}`]: state,
      };
    };

    // Check if action is loading
    const isActionLoading = (prescriptionId, action) =>
      actionLoading.value[`${prescriptionId}-${action}`] || false;

    // Download prescription PDF
    const handleDownloadPdf = async prescription => {
      try {
        setActionLoading(prescription.id, 'download', true);
        const pdfBlob = await downloadPrescriptionPdf(prescription.id);

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receta-${prescription.id}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading prescription PDF:', error);
        // You could show a toast notification here
      } finally {
        setActionLoading(prescription.id, 'download', false);
      }
    };

    // View prescription PDF
    const handleViewPdf = async prescription => {
      try {
        setActionLoading(prescription.id, 'view', true);
        const pdfUrl = await getPrescriptionPdfUrl(prescription.id, 3600); // 1 hour expiry
        window.open(pdfUrl.url, '_blank');
      } catch (error) {
        console.error('Error viewing prescription PDF:', error);
        // Fallback to download
        await handleDownloadPdf(prescription);
      } finally {
        setActionLoading(prescription.id, 'view', false);
      }
    };

    // Refill prescription
    const handleRefill = async prescription => {
      try {
        setActionLoading(prescription.id, 'refill', true);
        await refillPrescription(prescription.id);
        emit('refill', prescription.id);
        emit('refresh');
      } catch (error) {
        console.error('Error refilling prescription:', error);
      } finally {
        setActionLoading(prescription.id, 'refill', false);
      }
    };

    // Record dispensation
    const handleDispense = async prescription => {
      try {
        setActionLoading(prescription.id, 'dispense', true);
        const dispensationData = {
          dispensedAt: new Date().toISOString(),
          dispensedBy: 'current-user', // TODO: Get from auth store
          notes: '',
        };
        await recordDispensation(prescription.id, dispensationData);
        emit('dispense', prescription.id);
        emit('refresh');
      } catch (error) {
        console.error('Error recording dispensation:', error);
      } finally {
        setActionLoading(prescription.id, 'dispense', false);
      }
    };

    // Cancel prescription
    const handleCancel = async prescription => {
      const reason = prompt('Motivo de cancelación:');
      if (!reason) return;

      try {
        setActionLoading(prescription.id, 'cancel', true);
        await cancelPrescription(prescription.id, reason);
        emit('cancel', prescription.id);
        emit('refresh');
      } catch (error) {
        console.error('Error canceling prescription:', error);
      } finally {
        setActionLoading(prescription.id, 'cancel', false);
      }
    };

    // Get status badge class
    const getStatusBadgeClass = status => {
      const statusClasses = {
        ACTIVE: 'badge-success',
        DISPENSED: 'badge-info',
        EXPIRED: 'badge-warning',
        CANCELLED: 'badge-danger',
        COMPLETED: 'badge-secondary',
      };
      return statusClasses[status] || 'badge-secondary';
    };

    // Get status text
    const getStatusText = status => {
      const statusTexts = {
        ACTIVE: 'Activa',
        DISPENSED: 'Dispensada',
        EXPIRED: 'Vencida',
        CANCELLED: 'Cancelada',
        COMPLETED: 'Completada',
      };
      return statusTexts[status] || status;
    };

    // Get priority badge class
    const getPriorityBadgeClass = priority => {
      const priorityClasses = {
        LOW: 'priority-low',
        NORMAL: 'priority-normal',
        HIGH: 'priority-high',
        URGENT: 'priority-urgent',
      };
      return priorityClasses[priority] || 'priority-normal';
    };

    // Get priority text
    const getPriorityText = priority => {
      const priorityTexts = {
        LOW: 'Baja',
        NORMAL: 'Normal',
        HIGH: 'Alta',
        URGENT: 'Urgente',
      };
      return priorityTexts[priority] || priority;
    };

    // Check if prescription can be refilled
    const canRefill = prescription =>
      prescription.status === 'ACTIVE' &&
      prescription.refillsRemaining > 0 &&
      new Date(prescription.validUntil) > new Date();

    // Check if prescription can be dispensed
    const canDispense = prescription =>
      prescription.status === 'ACTIVE' && new Date(prescription.validUntil) > new Date();

    // Check if prescription can be cancelled
    const canCancel = prescription => prescription.status === 'ACTIVE';

    return {
      t,
      loading,
      toggles,
      sortedPrescriptions,
      getDateAndHour,
      handleDownloadPdf,
      handleViewPdf,
      handleRefill,
      handleDispense,
      handleCancel,
      isActionLoading,
      getStatusBadgeClass,
      getStatusText,
      getPriorityBadgeClass,
      getPriorityText,
      canRefill,
      canDispense,
      canCancel,
    };
  },
};
</script>

<template>
  <div class="prescription-list-modern">
    <Spinner :show="loading" />

    <!-- Header -->
    <div class="list-header">
      <div class="list-header-content">
        <h5 class="list-title">
          <i class="bi bi-prescription me-2"></i>
          Recetas del Paciente
        </h5>
        <p class="list-subtitle">Historial de prescripciones médicas</p>
      </div>

      <button
        class="btn-create-new"
        @click="$emit('create-new')"
        :disabled="!toggles['patient.history.edit']"
      >
        <i class="bi bi-plus-circle me-2"></i>
        Nueva Receta
      </button>
    </div>

    <!-- Prescriptions List -->
    <div v-if="sortedPrescriptions.length > 0" class="prescriptions-container">
      <div
        v-for="prescription in sortedPrescriptions"
        :key="prescription.id"
        class="prescription-card"
      >
        <!-- Card Header -->
        <div class="prescription-header">
          <div class="prescription-info">
            <div class="prescription-date">
              <i class="bi bi-calendar3 me-1"></i>
              {{ getDateAndHour(prescription.createdAt || prescription.prescribedAt) }}
            </div>
            <div class="prescription-id">ID: {{ prescription.id.slice(-8) }}</div>
          </div>

          <div class="prescription-badges">
            <span :class="['status-badge', getStatusBadgeClass(prescription.status)]">
              {{ getStatusText(prescription.status) }}
            </span>
            <span :class="['priority-badge', getPriorityBadgeClass(prescription.priority)]">
              {{ getPriorityText(prescription.priority) }}
            </span>
          </div>
        </div>

        <!-- Prescription Details -->
        <div class="prescription-content">
          <!-- Diagnosis -->
          <div v-if="prescription.diagnosis" class="prescription-diagnosis">
            <strong>Diagnóstico:</strong> {{ prescription.diagnosis }}
          </div>

          <!-- Medications -->
          <div
            v-if="prescription.medications && prescription.medications.length > 0"
            class="medications-section"
          >
            <h6 class="medications-title">
              <i class="bi bi-capsule me-1"></i>
              Medicamentos ({{ prescription.medications.length }})
            </h6>

            <div class="medications-grid">
              <div
                v-for="(medication, index) in prescription.medications"
                :key="index"
                class="medication-item"
              >
                <div class="medication-name">
                  {{ medication.medicationName || medication.name }}
                </div>
                <div class="medication-details">
                  <span class="medication-dosage">{{ medication.dosage }}</span>
                  <span class="medication-frequency">{{ medication.frequency }}</span>
                  <span class="medication-duration">{{ medication.duration }}</span>
                </div>
                <div v-if="medication.instructions" class="medication-instructions">
                  {{ medication.instructions }}
                </div>
              </div>
            </div>
          </div>

          <!-- Instructions -->
          <div v-if="prescription.instructions" class="prescription-instructions">
            <strong>Instrucciones:</strong>
            <p>{{ prescription.instructions }}</p>
          </div>

          <!-- Prescription Info -->
          <div class="prescription-meta">
            <div class="meta-item">
              <i class="bi bi-calendar-check me-1"></i>
              <span
                >Válida hasta: {{ new Date(prescription.validUntil).toLocaleDateString() }}</span
              >
            </div>
            <div v-if="prescription.refillsAllowed > 0" class="meta-item">
              <i class="bi bi-arrow-repeat me-1"></i>
              <span
                >Refills: {{ prescription.refillsRemaining || 0 }}/{{
                  prescription.refillsAllowed
                }}</span
              >
            </div>
            <div v-if="prescription.doctorName" class="meta-item">
              <i class="bi bi-person-badge me-1"></i>
              <span>Dr. {{ prescription.doctorName }}</span>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="prescription-actions">
          <!-- View/Download PDF -->
          <button
            class="action-btn btn-view"
            @click="handleViewPdf(prescription)"
            :disabled="isActionLoading(prescription.id, 'view')"
            title="Ver receta"
          >
            <Spinner v-if="isActionLoading(prescription.id, 'view')" :show="true" size="sm" />
            <i v-else class="bi bi-eye"></i>
          </button>

          <button
            class="action-btn btn-download"
            @click="handleDownloadPdf(prescription)"
            :disabled="isActionLoading(prescription.id, 'download')"
            title="Descargar PDF"
          >
            <Spinner v-if="isActionLoading(prescription.id, 'download')" :show="true" size="sm" />
            <i v-else class="bi bi-download"></i>
          </button>

          <!-- Refill -->
          <button
            v-if="canRefill(prescription)"
            class="action-btn btn-refill"
            @click="handleRefill(prescription)"
            :disabled="
              isActionLoading(prescription.id, 'refill') || !toggles['patient.history.edit']
            "
            title="Renovar receta"
          >
            <Spinner v-if="isActionLoading(prescription.id, 'refill')" :show="true" size="sm" />
            <i v-else class="bi bi-arrow-repeat"></i>
          </button>

          <!-- Dispense -->
          <button
            v-if="canDispense(prescription)"
            class="action-btn btn-dispense"
            @click="handleDispense(prescription)"
            :disabled="
              isActionLoading(prescription.id, 'dispense') || !toggles['patient.history.edit']
            "
            title="Marcar como dispensada"
          >
            <Spinner v-if="isActionLoading(prescription.id, 'dispense')" :show="true" size="sm" />
            <i v-else class="bi bi-check-circle"></i>
          </button>

          <!-- Cancel -->
          <button
            v-if="canCancel(prescription)"
            class="action-btn btn-cancel"
            @click="handleCancel(prescription)"
            :disabled="
              isActionLoading(prescription.id, 'cancel') || !toggles['patient.history.edit']
            "
            title="Cancelar receta"
          >
            <Spinner v-if="isActionLoading(prescription.id, 'cancel')" :show="true" size="sm" />
            <i v-else class="bi bi-x-circle"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="empty-state">
      <Message
        :title="t('prescription.list.empty.title') || 'No hay recetas'"
        :content="
          t('prescription.list.empty.content') ||
          'Este paciente no tiene recetas registradas. Haga clic en &quot;Nueva Receta&quot; para crear la primera.'
        "
      />
    </div>
  </div>
</template>

<style scoped>
.prescription-list-modern {
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

/* Prescriptions Container */
.prescriptions-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Prescription Card */
.prescription-card {
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.875rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.prescription-card:hover {
  border-color: rgba(0, 123, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Card Header */
.prescription-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.prescription-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.prescription-date {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.prescription-id {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  font-family: monospace;
}

.prescription-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Badges */
.status-badge,
.priority-badge {
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

.priority-low {
  background: rgba(40, 167, 69, 0.1);
  color: #155724;
}

.priority-normal {
  background: rgba(0, 123, 255, 0.1);
  color: #004085;
}

.priority-high {
  background: rgba(255, 193, 7, 0.1);
  color: #856404;
}

.priority-urgent {
  background: rgba(220, 53, 69, 0.1);
  color: #721c24;
}

/* Card Content */
.prescription-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prescription-diagnosis {
  font-size: 0.9rem;
  color: var(--color-text);
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.5rem;
  border-left: 4px solid var(--azul-turno);
}

/* Medications */
.medications-section {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
  padding: 1rem;
}

.medications-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.75rem 0;
}

.medications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0.75rem;
}

.medication-item {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.medication-name {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.medication-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.medication-dosage,
.medication-frequency,
.medication-duration {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.8;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 0.25rem;
}

.medication-instructions {
  font-size: 0.8rem;
  color: var(--azul-turno);
  font-style: italic;
  margin-top: 0.5rem;
}

/* Instructions */
.prescription-instructions {
  font-size: 0.9rem;
  color: var(--color-text);
}

.prescription-instructions p {
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}

/* Meta Information */
.prescription-meta {
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

/* Actions */
.prescription-actions {
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

.btn-refill {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.btn-refill:hover:not(:disabled) {
  background: rgba(255, 193, 7, 0.2);
}

.btn-dispense {
  background: rgba(23, 162, 184, 0.1);
  color: #17a2b8;
}

.btn-dispense:hover:not(:disabled) {
  background: rgba(23, 162, 184, 0.2);
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

/* Responsive */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .prescription-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .prescription-badges {
    align-self: flex-start;
  }

  .medications-grid {
    grid-template-columns: 1fr;
  }

  .medication-details {
    flex-direction: column;
    gap: 0.5rem;
  }

  .prescription-meta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .prescription-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
