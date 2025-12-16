<template>
  <div class="patient-history-modern">
    <div class="modern-card">
      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="bi bi-journal-medical"></i>
        </div>
        <div class="form-header-content">
          <h3 class="form-header-title">{{ $t('patientHistory.consultationTimeline') }}</h3>
          <p class="form-header-subtitle">
            {{ $t('patientHistory.consultationTimelineDescription') }}
          </p>
        </div>
      </div>

      <div v-if="loading" class="text-center p-4">
        <div class="spinner-modern"></div>
        <p class="mt-2">{{ $t('common.loading') }}</p>
      </div>

      <div v-else-if="consultations.length === 0" class="empty-state-modern">
        <div class="empty-state-modern-icon">
          <i class="bi bi-calendar-x"></i>
        </div>
        <div class="empty-state-modern-title">{{ $t('patientHistory.noConsultations') }}</div>
        <div class="empty-state-modern-text">
          {{ $t('patientHistory.noConsultationsDescription') }}
        </div>
      </div>

      <div v-else class="consultation-timeline">
        <div
          v-for="(consultation, index) in consultations"
          :key="consultation.id || index"
          class="consultation-item modern-card"
          @click="selectConsultation(consultation)"
        >
          <div class="consultation-item-header">
            <div class="consultation-date">
              <i class="bi bi-calendar3"></i>
              <span>{{ formatDate(consultation.date || consultation.createdAt) }}</span>
            </div>
            <div class="consultation-badges">
              <span
                v-if="consultation.bookingId"
                class="badge-modern badge-modern-info"
                :title="$t('patientHistory.fromBooking') || 'From Booking'"
              >
                <i class="bi bi-calendar-check"></i>
                {{ $t('patientHistory.booking') || 'Booking' }}
              </span>
              <span
                v-if="consultation.controlId"
                class="badge-modern badge-modern-warning"
                :title="$t('patientHistory.fromControl') || 'From Control'"
              >
                <i class="bi bi-calendar-event"></i>
                {{ $t('patientHistory.control') || 'Control' }}
              </span>
              <span
                v-if="consultation.originalAttentionId"
                class="badge-modern badge-modern-secondary"
                :title="$t('patientHistory.comeback') || 'Comeback'"
              >
                <i class="bi bi-arrow-return-left"></i>
                {{ $t('patientHistory.comeback') || 'Comeback' }}
              </span>
              <span
                v-if="consultation.diagnostic && consultation.diagnostic.length > 0"
                class="badge-modern badge-modern-info"
              >
                <i class="bi bi-clipboard-pulse"></i>
                {{ consultation.diagnostic.length }} {{ $t('patientHistory.diagnostics') }}
              </span>
              <span
                v-if="consultation.prescriptionIds && consultation.prescriptionIds.length > 0"
                class="badge-modern badge-modern-success"
              >
                <i class="bi bi-prescription"></i>
                {{ consultation.prescriptionIds.length }} {{ $t('patientHistory.prescriptions') }}
              </span>
              <span
                v-if="consultation.examOrderIds && consultation.examOrderIds.length > 0"
                class="badge-modern badge-modern-warning"
              >
                <i class="bi bi-clipboard-check"></i>
                {{ consultation.examOrderIds.length }} {{ $t('patientHistory.examOrders') }}
              </span>
            </div>
          </div>
          <div
            v-if="consultation.consultationReason && consultation.consultationReason.length > 0"
            class="consultation-summary"
          >
            <strong>{{ $t('patientHistory.consultationReason') }}:</strong>
            {{ consultation.consultationReason[0].reason }}
          </div>
          <div
            v-if="consultation.diagnostic && consultation.diagnostic.length > 0"
            class="consultation-summary"
          >
            <strong>{{ $t('patientHistory.diagnostics') }}:</strong>
            {{ consultation.diagnostic.map(d => d.diagnostic).join(', ') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getConsultationsByClientId,
  getConsultationsByPatientHistoryId,
} from '../../../application/services/patient-history';
import { getDateAndHour } from '../../../shared/utils/date';

export default {
  name: 'ConsultationTimeline',
  props: {
    clientId: { type: String, required: false },
    commerceId: { type: String, required: false },
    patientHistoryId: { type: String, required: false },
  },
  emits: ['consultation-selected'],
  data() {
    return {
      consultations: [],
      loading: false,
    };
  },
  async mounted() {
    await this.loadConsultations();
  },
  watch: {
    clientId: {
      handler: 'loadConsultations',
      immediate: false,
    },
    patientHistoryId: {
      handler: 'loadConsultations',
      immediate: false,
    },
  },
  methods: {
    async loadConsultations() {
      this.loading = true;
      try {
        if (this.patientHistoryId) {
          this.consultations = await getConsultationsByPatientHistoryId(this.patientHistoryId);
        } else if (this.commerceId && this.clientId) {
          this.consultations = await getConsultationsByClientId(this.commerceId, this.clientId);
        } else {
          this.consultations = [];
        }
      } catch (error) {
        console.error('Error loading consultations:', error);
        this.consultations = [];
      } finally {
        this.loading = false;
      }
    },
    formatDate(date) {
      if (!date) return '';
      const timeZone = this.commerce?.localeInfo?.timezone || 'America/Sao_Paulo';
      return getDateAndHour(date, timeZone);
    },
    selectConsultation(consultation) {
      this.$emit('consultation-selected', consultation);
    },
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.consultation-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.consultation-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid var(--azul-turno);
}

.consultation-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-lg);
  border-left-color: var(--verde-tu);
}

.consultation-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.consultation-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-text);
}

.consultation-date i {
  color: var(--azul-turno);
}

.consultation-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.consultation-summary {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.consultation-summary strong {
  color: var(--color-text);
  margin-right: 0.5rem;
}

@media (max-width: 768px) {
  .consultation-item-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
