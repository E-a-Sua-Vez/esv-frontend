<script>
import { ref, computed, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import { getDateAndHour } from '../../../shared/utils/date';
import {
  downloadReferencePdf,
  getReferencePdfUrl,
  acceptReference,
  markReferenceAsAttended,
  rejectReference,
} from '../../../application/services/medical-reference';

export default {
  name: 'MedicalReferenceList',
  components: {
    Spinner,
    Message,
  },
  props: {
    references: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    toggles: { type: Object, default: () => ({}) },
    sortAsc: { type: Boolean, default: true },
  },
  emits: ['create-new', 'accept', 'attend', 'refresh'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const actionLoading = ref({});
    const showResponseModal = ref(false);
    const selectedReference = ref(null);
    const responseForm = ref({
      response: '',
      returnReport: '',
    });

    const { references, loading, toggles, sortAsc } = toRefs(props);

    // Computed sorted references
    const sortedReferences = computed(() => {
      if (!references.value || references.value.length === 0) return [];

      const sorted = [...references.value].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.referredAt);
        const dateB = new Date(b.createdAt || b.referredAt);
        return sortAsc.value ? dateA - dateB : dateB - dateA;
      });

      return sorted;
    });

    // Set loading state for specific action
    const setActionLoading = (referenceId, action, state) => {
      actionLoading.value = {
        ...actionLoading.value,
        [`${referenceId}-${action}`]: state,
      };
    };

    // Check if action is loading
    const isActionLoading = (referenceId, action) =>
      actionLoading.value[`${referenceId}-${action}`] || false;

    // Download reference PDF
    const handleDownloadPdf = async reference => {
      try {
        setActionLoading(reference.id, 'download', true);
        const pdfBlob = await downloadReferencePdf(reference.id);

        // Create download link
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `referencia-${reference.id}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading reference PDF:', error);
      } finally {
        setActionLoading(reference.id, 'download', false);
      }
    };

    // View reference PDF
    const handleViewPdf = async reference => {
      try {
        setActionLoading(reference.id, 'view', true);
        const pdfUrl = await getReferencePdfUrl(reference.id, 3600); // 1 hour expiry
        window.open(pdfUrl.url, '_blank');
      } catch (error) {
        console.error('Error viewing reference PDF:', error);
        // Fallback to download
        await handleDownloadPdf(reference);
      } finally {
        setActionLoading(reference.id, 'view', false);
      }
    };

    // Accept reference
    const handleAccept = async reference => {
      selectedReference.value = reference;
      responseForm.value = {
        response: '',
        returnReport: '',
      };
      showResponseModal.value = true;
    };

    // Submit acceptance
    const submitAcceptance = async () => {
      if (!selectedReference.value) return;

      try {
        setActionLoading(selectedReference.value.id, 'accept', true);
        await acceptReference(selectedReference.value.id, responseForm.value.response);
        showResponseModal.value = false;
        selectedReference.value = null;
        emit('accept', selectedReference.value.id);
        emit('refresh');
      } catch (error) {
        console.error('Error accepting reference:', error);
      } finally {
        setActionLoading(selectedReference.value.id, 'accept', false);
      }
    };

    // Mark as attended
    const handleAttend = async reference => {
      const returnReport = prompt('Informe de retorno (opcional):') || '';

      try {
        setActionLoading(reference.id, 'attend', true);
        await markReferenceAsAttended(reference.id, returnReport);
        emit('attend', reference.id);
        emit('refresh');
      } catch (error) {
        console.error('Error marking reference as attended:', error);
      } finally {
        setActionLoading(reference.id, 'attend', false);
      }
    };

    // Reject reference
    const handleReject = async reference => {
      const reason = prompt('Motivo del rechazo:');
      if (!reason) return;

      try {
        setActionLoading(reference.id, 'reject', true);
        await rejectReference(reference.id, reason);
        emit('refresh');
      } catch (error) {
        console.error('Error rejecting reference:', error);
      } finally {
        setActionLoading(reference.id, 'reject', false);
      }
    };

    // Get status badge class
    const getStatusBadgeClass = status => {
      const statusClasses = {
        PENDING: 'badge-warning',
        ACCEPTED: 'badge-info',
        SCHEDULED: 'badge-primary',
        ATTENDED: 'badge-success',
        REJECTED: 'badge-danger',
        CANCELLED: 'badge-secondary',
        EXPIRED: 'badge-secondary',
      };
      return statusClasses[status] || 'badge-secondary';
    };

    // Get status text
    const getStatusText = status => {
      const statusTexts = {
        PENDING: 'Pendiente',
        ACCEPTED: 'Aceptada',
        SCHEDULED: 'Programada',
        ATTENDED: 'Atendida',
        REJECTED: 'Rechazada',
        CANCELLED: 'Cancelada',
        EXPIRED: 'Vencida',
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

    // Get specialty text
    const getSpecialtyText = specialty => {
      const specialties = {
        CARDIOLOGY: 'Cardiología',
        DERMATOLOGY: 'Dermatología',
        ENDOCRINOLOGY: 'Endocrinología',
        GASTROENTEROLOGY: 'Gastroenterología',
        GYNECOLOGY: 'Ginecología',
        NEUROLOGY: 'Neurología',
        ONCOLOGY: 'Oncología',
        OPHTHALMOLOGY: 'Oftalmología',
        ORTHOPEDICS: 'Ortopedia',
        OTOLARYNGOLOGY: 'Otorrinolaringología',
        PEDIATRICS: 'Pediatría',
        PSYCHIATRY: 'Psiquiatría',
        PULMONOLOGY: 'Neumología',
        RHEUMATOLOGY: 'Reumatología',
        UROLOGY: 'Urología',
        GENERAL_SURGERY: 'Cirugía General',
        PLASTIC_SURGERY: 'Cirugía Plástica',
        EMERGENCY: 'Emergencias',
        INTERNAL_MEDICINE: 'Medicina Interna',
        FAMILY_MEDICINE: 'Medicina Familiar',
        OTHER: 'Otra Especialidad',
      };
      return specialties[specialty] || specialty;
    };

    // Check if can accept
    const canAccept = reference => reference.status === 'PENDING';

    // Check if can attend
    const canAttend = reference => ['ACCEPTED', 'SCHEDULED'].includes(reference.status);

    // Check if can reject
    const canReject = reference => reference.status === 'PENDING';

    return {
      t,
      loading,
      toggles,
      sortedReferences,
      showResponseModal,
      selectedReference,
      responseForm,
      getDateAndHour,
      handleDownloadPdf,
      handleViewPdf,
      handleAccept,
      submitAcceptance,
      handleAttend,
      handleReject,
      isActionLoading,
      getStatusBadgeClass,
      getStatusText,
      getUrgencyBadgeClass,
      getUrgencyText,
      getSpecialtyText,
      canAccept,
      canAttend,
      canReject,
    };
  },
};
</script>

<template>
  <div class="reference-list-modern">
    <Spinner :show="loading" />

    <!-- Header -->
    <div class="list-header">
      <div class="list-header-content">
        <h5 class="list-title">
          <i class="bi bi-arrow-left-right me-2"></i>
          Referencias Médicas
        </h5>
        <p class="list-subtitle">Historial de referencias a especialistas</p>
      </div>

      <button
        class="btn-create-new"
        @click="$emit('create-new')"
        :disabled="!toggles['patient.history.edit']"
      >
        <i class="bi bi-plus-circle me-2"></i>
        Nueva Referencia
      </button>
    </div>

    <!-- References List -->
    <div v-if="sortedReferences.length > 0" class="references-container">
      <div v-for="reference in sortedReferences" :key="reference.id" class="reference-card">
        <!-- Card Header -->
        <div class="reference-header">
          <div class="reference-info">
            <div class="reference-date">
              <i class="bi bi-calendar3 me-1"></i>
              {{ getDateAndHour(reference.createdAt || reference.referredAt) }}
            </div>
            <div class="reference-id">ID: {{ reference.id.slice(-8) }}</div>
          </div>

          <div class="reference-badges">
            <span :class="['status-badge', getStatusBadgeClass(reference.status)]">
              {{ getStatusText(reference.status) }}
            </span>
            <span :class="['urgency-badge', getUrgencyBadgeClass(reference.urgency)]">
              {{ getUrgencyText(reference.urgency) }}
            </span>
          </div>
        </div>

        <!-- Reference Details -->
        <div class="reference-content">
          <!-- Specialty and Doctor -->
          <div class="specialty-info">
            <div class="specialty-main">
              <strong>{{ getSpecialtyText(reference.referredToSpecialty) }}</strong>
              <span v-if="reference.referredToDoctor" class="doctor-name">
                Dr. {{ reference.referredToDoctor }}
              </span>
            </div>
            <div v-if="reference.referredToInstitution" class="institution-name">
              <i class="bi bi-building me-1"></i>
              {{ reference.referredToInstitution }}
            </div>
          </div>

          <!-- Reason for Referral -->
          <div v-if="reference.reasonForReferral" class="reason-section">
            <strong>Motivo de la Referencia:</strong>
            <p>{{ reference.reasonForReferral }}</p>
          </div>

          <!-- Clinical Summary -->
          <div v-if="reference.clinicalSummary" class="clinical-summary">
            <strong>Resumen Clínico:</strong>
            <p>{{ reference.clinicalSummary }}</p>
          </div>

          <!-- Diagnosis -->
          <div v-if="reference.diagnosis" class="diagnosis">
            <strong>Diagnóstico:</strong> {{ reference.diagnosis }}
          </div>

          <!-- Preferred Date -->
          <div v-if="reference.preferredDate" class="preferred-date">
            <i class="bi bi-calendar-event me-1"></i>
            <strong>Fecha Preferida:</strong> {{ getDateAndHour(reference.preferredDate) }}
          </div>

          <!-- Follow Up Required -->
          <div v-if="reference.followUpRequired" class="follow-up-info">
            <i class="bi bi-arrow-repeat me-1"></i>
            <strong>Requiere seguimiento</strong>
          </div>

          <!-- Additional Instructions -->
          <div v-if="reference.additionalInstructions" class="additional-instructions">
            <strong>Instrucciones Adicionales:</strong>
            <p>{{ reference.additionalInstructions }}</p>
          </div>

          <!-- Current Medications -->
          <div v-if="reference.currentMedications" class="medications-info">
            <strong>Medicamentos Actuales:</strong>
            <p>{{ reference.currentMedications }}</p>
          </div>

          <!-- Allergies -->
          <div v-if="reference.allergies" class="allergies-info">
            <strong>Alergias:</strong>
            <p>{{ reference.allergies }}</p>
          </div>

          <!-- Vital Signs -->
          <div v-if="reference.vitalSigns" class="vital-signs">
            <strong>Signos Vitales:</strong>
            <p>{{ reference.vitalSigns }}</p>
          </div>

          <!-- Expected Outcome -->
          <div v-if="reference.expectedOutcome" class="expected-outcome">
            <strong>Resultado Esperado:</strong>
            <p>{{ reference.expectedOutcome }}</p>
          </div>

          <!-- Reference Meta -->
          <div class="reference-meta">
            <div v-if="reference.referringDoctorName" class="meta-item">
              <i class="bi bi-person-badge me-1"></i>
              <span>Referido por: Dr. {{ reference.referringDoctorName }}</span>
            </div>
            <div v-if="reference.scheduledDate" class="meta-item">
              <i class="bi bi-calendar-check me-1"></i>
              <span>Programado: {{ getDateAndHour(reference.scheduledDate) }}</span>
            </div>
          </div>

          <!-- Response Section -->
          <div v-if="reference.response" class="response-section">
            <h6 class="response-title">
              <i class="bi bi-chat-square-text me-1"></i>
              Respuesta del Especialista
            </h6>
            <div class="response-content">{{ reference.response }}</div>
            <div v-if="reference.responseDate" class="response-date">
              {{ getDateAndHour(reference.responseDate) }}
            </div>
          </div>

          <!-- Return Report -->
          <div v-if="reference.returnReport" class="return-report-section">
            <h6 class="return-report-title">
              <i class="bi bi-file-medical me-1"></i>
              Informe de Retorno
            </h6>
            <div class="return-report-content">{{ reference.returnReport }}</div>
            <div v-if="reference.attendedDate" class="return-report-date">
              {{ getDateAndHour(reference.attendedDate) }}
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="reference-actions">
          <!-- View/Download PDF -->
          <button
            class="action-btn btn-view"
            @click="handleViewPdf(reference)"
            :disabled="isActionLoading(reference.id, 'view')"
            title="Ver referencia"
          >
            <Spinner v-if="isActionLoading(reference.id, 'view')" :show="true" size="sm" />
            <i v-else class="bi bi-eye"></i>
          </button>

          <button
            class="action-btn btn-download"
            @click="handleDownloadPdf(reference)"
            :disabled="isActionLoading(reference.id, 'download')"
            title="Descargar PDF"
          >
            <Spinner v-if="isActionLoading(reference.id, 'download')" :show="true" size="sm" />
            <i v-else class="bi bi-download"></i>
          </button>

          <!-- Accept -->
          <button
            v-if="canAccept(reference)"
            class="action-btn btn-accept"
            @click="handleAccept(reference)"
            :disabled="isActionLoading(reference.id, 'accept') || !toggles['patient.history.edit']"
            title="Aceptar referencia"
          >
            <Spinner v-if="isActionLoading(reference.id, 'accept')" :show="true" size="sm" />
            <i v-else class="bi bi-check-circle"></i>
          </button>

          <!-- Attend -->
          <button
            v-if="canAttend(reference)"
            class="action-btn btn-attend"
            @click="handleAttend(reference)"
            :disabled="isActionLoading(reference.id, 'attend') || !toggles['patient.history.edit']"
            title="Marcar como atendida"
          >
            <Spinner v-if="isActionLoading(reference.id, 'attend')" :show="true" size="sm" />
            <i v-else class="bi bi-person-check"></i>
          </button>

          <!-- Reject -->
          <button
            v-if="canReject(reference)"
            class="action-btn btn-reject"
            @click="handleReject(reference)"
            :disabled="isActionLoading(reference.id, 'reject') || !toggles['patient.history.edit']"
            title="Rechazar referencia"
          >
            <Spinner v-if="isActionLoading(reference.id, 'reject')" :show="true" size="sm" />
            <i v-else class="bi bi-x-circle"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="empty-state">
      <Message
        :title="t('reference.list.empty.title') || 'No hay referencias médicas'"
        :content="
          t('reference.list.empty.content') ||
          'Este paciente no tiene referencias médicas registradas. Haga clic en &quot;Nueva Referencia&quot; para crear la primera.'
        "
      />
    </div>

    <!-- Response Modal -->
    <div v-if="showResponseModal" class="modal-overlay" @click="showResponseModal = false">
      <div class="response-modal" @click.stop>
        <div class="modal-header">
          <h5>Aceptar Referencia</h5>
          <button class="btn-close-modal" @click="showResponseModal = false">
            <i class="bi bi-x"></i>
          </button>
        </div>

        <div class="modal-content">
          <div class="form-field">
            <label class="form-label">Respuesta del Especialista</label>
            <textarea
              v-model="responseForm.response"
              class="form-control"
              rows="4"
              placeholder="Ingrese su respuesta a la referencia (opcional)"
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-accept-reference" @click="submitAcceptance">
            <i class="bi bi-check-circle me-2"></i>
            Aceptar Referencia
          </button>

          <button class="btn-cancel-modal" @click="showResponseModal = false">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reference-list-modern {
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

/* References Container */
.references-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Reference Card */
.reference-card {
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.875rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.reference-card:hover {
  border-color: rgba(0, 123, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Card Header */
.reference-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.reference-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.reference-date {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.reference-id {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  font-family: monospace;
}

.reference-badges {
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
.reference-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.specialty-info {
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.5rem;
  padding: 0.75rem;
  border-left: 4px solid var(--azul-turno);
}

.specialty-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.specialty-main strong {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.doctor-name {
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.8;
}

.institution-name {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.reason-section,
.clinical-summary {
  font-size: 0.9rem;
  color: var(--color-text);
}

.reason-section p,
.clinical-summary p {
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}

.diagnosis {
  font-size: 0.9rem;
  color: var(--color-text);
  padding: 0.5rem;
  background: rgba(40, 167, 69, 0.05);
  border-radius: 0.375rem;
}

.preferred-date,
.follow-up-info {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.additional-instructions,
.medications-info,
.allergies-info,
.vital-signs,
.expected-outcome {
  font-size: 0.85rem;
  color: var(--color-text);
}

.additional-instructions p,
.medications-info p,
.allergies-info p,
.vital-signs p,
.expected-outcome p {
  margin: 0.5rem 0 0 0;
  line-height: 1.4;
}

/* Meta Information */
.reference-meta {
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

/* Response Section */
.response-section {
  background: rgba(23, 162, 184, 0.05);
  border-radius: 0.5rem;
  padding: 1rem;
}

.response-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0c5460;
  margin: 0 0 0.75rem 0;
}

.response-content {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.response-date {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
}

/* Return Report Section */
.return-report-section {
  background: rgba(40, 167, 69, 0.05);
  border-radius: 0.5rem;
  padding: 1rem;
}

.return-report-title {
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: #155724;
  margin: 0 0 0.75rem 0;
}

.return-report-content {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.return-report-date {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
}

/* Actions */
.reference-actions {
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

.btn-accept {
  background: rgba(23, 162, 184, 0.1);
  color: #17a2b8;
}

.btn-accept:hover:not(:disabled) {
  background: rgba(23, 162, 184, 0.2);
}

.btn-attend {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.btn-attend:hover:not(:disabled) {
  background: rgba(40, 167, 69, 0.2);
}

.btn-reject {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.btn-reject:hover:not(:disabled) {
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

/* Response Modal */
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

.response-modal {
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

.btn-accept-reference {
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

.btn-accept-reference:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

  .reference-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .reference-badges {
    align-self: flex-start;
  }

  .specialty-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .reference-meta {
    flex-direction: column;
    gap: 0.5rem;
  }

  .reference-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .response-modal {
    width: 95%;
    margin: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-accept-reference,
  .btn-cancel-modal {
    width: 100%;
    justify-content: center;
  }
}
</style>
