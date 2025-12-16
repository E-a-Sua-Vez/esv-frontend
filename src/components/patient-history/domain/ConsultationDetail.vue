<template>
  <div class="patient-history-modern">
    <div v-if="loading" class="text-center p-4">
      <div class="spinner-modern"></div>
      <p class="mt-2">{{ $t('common.loading') }}</p>
    </div>

    <div v-else-if="consultation" class="consultation-detail">
      <!-- Header -->
      <div class="modern-card">
        <div class="section-header-modern">
          <div class="section-header-icon">
            <i class="bi bi-clipboard-pulse"></i>
          </div>
          <div class="section-header-title">
            <h4>{{ $t('patientHistory.consultationDetails') }}</h4>
            <p>{{ formatDate(consultation.date || consultation.createdAt) }}</p>
          </div>
          <div class="ms-auto">
            <button class="btn-modern btn-modern-outline" @click="$emit('close')">
              <i class="bi bi-x-lg"></i> {{ $t('common.close') }}
            </button>
          </div>
        </div>

        <!-- Relationship Information -->
        <div
          v-if="hasRelationships"
          class="relationship-info mt-3 p-3"
          style="background-color: #f8f9fa; border-radius: 0.5rem"
        >
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span v-if="consultation.bookingId" class="badge-modern badge-modern-info">
              <i class="bi bi-calendar-check"></i>
              {{ $t('patientHistory.fromBooking') || 'From Booking' }}: {{ consultation.bookingId }}
            </span>
            <span v-if="consultation.controlId" class="badge-modern badge-modern-warning">
              <i class="bi bi-calendar-event"></i>
              {{ $t('patientHistory.fromControl') || 'From Control' }}: {{ consultation.controlId }}
            </span>
            <span
              v-if="consultation.originalAttentionId"
              class="badge-modern badge-modern-secondary"
            >
              <i class="bi bi-arrow-return-left"></i>
              {{ $t('patientHistory.comebackFrom') || 'Comeback from Attention' }}:
              {{ consultation.originalAttentionId }}
            </span>
          </div>
        </div>
      </div>

      <!-- Consultation Reason -->
      <div
        v-if="consultation.consultationReason && consultation.consultationReason.length > 0"
        class="modern-card"
      >
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-question-circle"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.consultationReason') }}</div>
          </div>
        </div>
        <div
          v-for="(reason, idx) in consultation.consultationReason"
          :key="idx"
          class="consultation-section-item"
        >
          <p>{{ reason.reason }}</p>
          <small class="text-muted">{{ formatDate(reason.createdAt) }}</small>
        </div>
      </div>

      <!-- Current Illness -->
      <div
        v-if="consultation.currentIllness && consultation.currentIllness.length > 0"
        class="modern-card"
      >
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-heart-pulse"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.currentIllness') }}</div>
          </div>
        </div>
        <div
          v-for="(illness, idx) in consultation.currentIllness"
          :key="idx"
          class="consultation-section-item"
        >
          <p>{{ illness.illness }}</p>
          <small class="text-muted">{{ formatDate(illness.createdAt) }}</small>
        </div>
      </div>

      <!-- Diagnostics -->
      <div v-if="consultation.diagnostic && consultation.diagnostic.length > 0" class="modern-card">
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-clipboard-pulse"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.diagnostics') }}</div>
          </div>
        </div>
        <div
          v-for="(diag, idx) in consultation.diagnostic"
          :key="idx"
          class="consultation-section-item"
        >
          <p>
            <strong>{{ diag.diagnostic }}</strong>
          </p>
          <p v-if="diag.cie10Code" class="text-muted">
            <i class="bi bi-tag"></i> CIE-10: {{ diag.cie10Code }} - {{ diag.cie10Description }}
          </p>
          <p v-if="diag.type" class="text-muted">
            <i class="bi bi-info-circle"></i> {{ $t(`patientHistory.diagnosticType.${diag.type}`) }}
          </p>
          <small class="text-muted">{{ formatDate(diag.createdAt) }}</small>
        </div>
      </div>

      <!-- Prescriptions -->
      <div v-if="prescriptions && prescriptions.length > 0" class="modern-card">
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-prescription"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.prescriptions') }}</div>
          </div>
        </div>
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-prescription"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.prescriptions') }}</div>
          </div>
        </div>
        <div
          v-for="prescription in prescriptions"
          :key="prescription.id"
          class="consultation-section-item"
        >
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p>
                <strong>{{ formatDate(prescription.date) }}</strong>
              </p>
              <div v-for="(med, idx) in prescription.medications" :key="idx" class="mb-2">
                <p class="mb-1">
                  <i class="bi bi-capsule"></i> {{ med.medicationName }}
                  <span v-if="med.commercialName" class="text-muted"
                    >({{ med.commercialName }})</span
                  >
                </p>
                <small class="text-muted">
                  {{ med.dosage }} - {{ med.frequency }} - {{ $t('prescription.duration') }}:
                  {{ med.duration }} {{ $t('prescription.days') }}
                </small>
              </div>
            </div>
            <div>
              <button
                v-if="prescription.pdfUrl"
                class="btn-modern btn-modern-outline btn-sm"
                @click="downloadPrescription(prescription.id)"
              >
                <i class="bi bi-download"></i> {{ $t('common.download') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Exam Orders -->
      <div v-if="examOrders && examOrders.length > 0" class="modern-card">
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-clipboard-check"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.examOrders') }}</div>
          </div>
        </div>
        <div v-for="order in examOrders" :key="order.id" class="consultation-section-item">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p>
                <strong>{{ formatDate(order.requestedAt) }}</strong>
              </p>
              <div v-for="(exam, idx) in order.exams" :key="idx" class="mb-2">
                <p class="mb-1">
                  <i class="bi bi-clipboard-data"></i> {{ exam.examName }}
                  <span v-if="exam.examCode" class="text-muted">({{ exam.examCode }})</span>
                </p>
                <small class="text-muted">
                  {{ $t('medicalExamOrder.status') }}:
                  {{ $t(`medicalExamOrder.status.${order.status}`) }}
                </small>
              </div>
            </div>
            <div>
              <button
                v-if="order.pdfUrl"
                class="btn-modern btn-modern-outline btn-sm"
                @click="downloadExamOrder(order.id)"
              >
                <i class="bi bi-download"></i> {{ $t('common.download') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Medical Orders (text) -->
      <div
        v-if="consultation.medicalOrder && consultation.medicalOrder.length > 0"
        class="modern-card"
      >
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-clipboard"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.medicalOrders') }}</div>
          </div>
        </div>
        <div
          v-for="(order, idx) in consultation.medicalOrder"
          :key="idx"
          class="consultation-section-item"
        >
          <p>{{ order.medicalOrder }}</p>
          <small class="text-muted">{{ formatDate(order.createdAt) }}</small>
        </div>
      </div>

      <!-- Documents -->
      <div
        v-if="consultation.patientDocument && consultation.patientDocument.length > 0"
        class="modern-card"
      >
        <div class="form-header-modern">
          <div class="form-header-icon">
            <i class="bi bi-file-earmark"></i>
          </div>
          <div class="form-header-content">
            <div class="form-header-title">{{ $t('patientHistory.documents') }}</div>
          </div>
        </div>
        <div
          v-for="(doc, idx) in consultation.patientDocument"
          :key="idx"
          class="consultation-section-item"
        >
          <p>{{ doc.comment || doc.details?.name || 'Document' }}</p>
          <small class="text-muted">{{ formatDate(doc.createdAt) }}</small>
        </div>
      </div>
    </div>

    <div v-else class="empty-state-modern">
      <div class="empty-state-modern-icon">
        <i class="bi bi-exclamation-circle"></i>
      </div>
      <div class="empty-state-modern-title">{{ $t('patientHistory.consultationNotFound') }}</div>
    </div>
  </div>
</template>

<script>
import { getConsultationByAttentionId } from '../../../application/services/patient-history';
import {
  getPrescriptionById,
  downloadPrescriptionPdf,
  getPrescriptionsByClient,
} from '../../../application/services/prescription';
import {
  getExamOrderById,
  downloadExamOrderPdf,
  getExamOrdersByClient,
} from '../../../application/services/medical-exam-order';
import { getDateAndHour } from '../../../shared/utils/date';

export default {
  name: 'ConsultationDetail',
  props: {
    consultation: { type: Object, required: false },
    attentionId: { type: String, required: false },
    commerce: { type: Object, required: false },
    clientId: { type: String, required: false },
  },
  emits: ['close'],
  data() {
    return {
      loading: false,
      prescriptions: [],
      examOrders: [],
    };
  },
  async mounted() {
    if (this.attentionId && !this.consultation) {
      await this.loadConsultation();
    }
    if (this.consultation) {
      await this.loadLinkedData();
    }
  },
  watch: {
    consultation: {
      handler: 'loadLinkedData',
      immediate: false,
    },
    attentionId: {
      handler: 'loadConsultation',
      immediate: false,
    },
  },
  methods: {
    async loadConsultation() {
      if (!this.attentionId) return;
      this.loading = true;
      try {
        this.consultation = await getConsultationByAttentionId(this.attentionId);
        await this.loadLinkedData();
      } catch (error) {
        console.error('Error loading consultation:', error);
      } finally {
        this.loading = false;
      }
    },
    async loadLinkedData() {
      if (!this.consultation) return;

      // Load prescriptions
      if (this.consultation.prescriptionIds && this.consultation.prescriptionIds.length > 0) {
        try {
          this.prescriptions = await Promise.all(
            this.consultation.prescriptionIds.map(id => getPrescriptionById(id))
          );
        } catch (error) {
          console.error('Error loading prescriptions:', error);
          this.prescriptions = [];
        }
      } else if (this.consultation.attentionId && this.commerce && this.clientId) {
        // Fallback: fetch by attentionId
        try {
          const allPrescriptions = await getPrescriptionsByClient(this.commerce.id, this.clientId);
          this.prescriptions = allPrescriptions.filter(
            p => p.attentionId === this.consultation.attentionId
          );
        } catch (error) {
          console.error('Error loading prescriptions by client:', error);
          this.prescriptions = [];
        }
      }

      // Load exam orders
      if (this.consultation.examOrderIds && this.consultation.examOrderIds.length > 0) {
        try {
          this.examOrders = await Promise.all(
            this.consultation.examOrderIds.map(id => getExamOrderById(id))
          );
        } catch (error) {
          console.error('Error loading exam orders:', error);
          this.examOrders = [];
        }
      } else if (this.consultation.attentionId && this.commerce && this.clientId) {
        // Fallback: fetch by attentionId
        try {
          const allExamOrders = await getExamOrdersByClient(this.commerce.id, this.clientId);
          this.examOrders = allExamOrders.filter(
            e => e.attentionId === this.consultation.attentionId
          );
        } catch (error) {
          console.error('Error loading exam orders by client:', error);
          this.examOrders = [];
        }
      }
    },
    formatDate(date) {
      if (!date) return '';
      const timeZone = this.commerce?.localeInfo?.timezone || 'America/Sao_Paulo';
      return getDateAndHour(date, timeZone);
    },
    async downloadPrescription(prescriptionId) {
      try {
        const blob = await downloadPrescriptionPdf(prescriptionId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription-${prescriptionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading prescription:', error);
        alert(this.$t('common.downloadError'));
      }
    },
    async downloadExamOrder(examOrderId) {
      try {
        const blob = await downloadExamOrderPdf(examOrderId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-order-${examOrderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading exam order:', error);
        alert(this.$t('common.downloadError'));
      }
    },
  },
  computed: {
    hasRelationships() {
      return !!(
        this.consultation?.bookingId ||
        this.consultation?.controlId ||
        this.consultation?.originalAttentionId
      );
    },
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.consultation-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.consultation-section-item {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.consultation-section-item:last-child {
  border-bottom: none;
}

.consultation-section-item p {
  margin: 0.25rem 0;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
