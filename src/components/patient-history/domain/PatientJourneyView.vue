<template>
  <div class="patient-journey-modern">
    <!-- Header -->
    <div class="modern-card mb-2">
      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="bi bi-diagram-3-fill"></i>
        </div>
        <div class="form-header-content">
          <h3 class="form-header-title">
            {{ $t('patientHistory.patientJourney') || 'Patient Journey' }}
          </h3>
          <p class="form-header-subtitle">
            {{
              $t('patientHistory.patientJourneyDescription') ||
              'Complete timeline of all patient interactions'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div v-if="journey && journey.summary" class="row g-2 mb-3 summary-cards-row">
      <div class="col-md-3 col-sm-6 summary-card-col">
        <div class="summary-card modern-card">
          <div class="summary-icon summary-icon-blue">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="summary-content">
            <div class="summary-value">{{ journey.summary.totalBookings }}</div>
            <div class="summary-label">{{ $t('patientHistory.bookings') || 'Bookings' }}</div>
            <div v-if="journey.summary.pendingBookings > 0" class="summary-badge">
              {{ journey.summary.pendingBookings }} {{ $t('common.pending') }}
            </div>
            <div v-else class="summary-badge-placeholder"></div>
          </div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6 summary-card-col">
        <div class="summary-card modern-card">
          <div class="summary-icon summary-icon-green">
            <i class="bi bi-person-check"></i>
          </div>
          <div class="summary-content">
            <div class="summary-value">{{ journey.summary.totalAttentions }}</div>
            <div class="summary-label">{{ $t('patientHistory.attentions') || 'Attentions' }}</div>
            <div class="summary-badge-placeholder"></div>
          </div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6 summary-card-col">
        <div class="summary-card modern-card">
          <div class="summary-icon summary-icon-yellow">
            <i class="bi bi-journal-medical"></i>
          </div>
          <div class="summary-content">
            <div class="summary-value">{{ journey.summary.totalConsultations }}</div>
            <div class="summary-label">
              {{ $t('patientHistory.consultations') || 'Consultations' }}
            </div>
            <div class="summary-badge-placeholder"></div>
          </div>
        </div>
      </div>
      <div class="col-md-3 col-sm-6 summary-card-col">
        <div class="summary-card modern-card">
          <div class="summary-icon summary-icon-orange">
            <i class="bi bi-calendar-event"></i>
          </div>
          <div class="summary-content">
            <div class="summary-value">{{ journey.summary.totalControls }}</div>
            <div class="summary-label">{{ $t('patientHistory.controls') || 'Controls' }}</div>
            <div v-if="journey.summary.pendingControls > 0" class="summary-badge">
              {{ journey.summary.pendingControls }} {{ $t('common.pending') }}
            </div>
            <div v-else class="summary-badge-placeholder"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="modern-card mb-2">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <div class="filter-group">
          <label class="filter-label">{{ $t('common.filterByType') || 'Filter by Type:' }}</label>
          <select v-model="selectedType" class="form-control-modern form-control-sm">
            <option value="all">{{ $t('common.all') || 'All' }}</option>
            <option value="booking">{{ $t('patientHistory.bookings') || 'Bookings' }}</option>
            <option value="attention">{{ $t('patientHistory.attentions') || 'Attentions' }}</option>
            <option value="consultation">
              {{ $t('patientHistory.consultations') || 'Consultations' }}
            </option>
            <option value="control">{{ $t('patientHistory.controls') || 'Controls' }}</option>
            <option value="prescription">
              {{ $t('patientHistory.prescriptions') || 'Prescriptions' }}
            </option>
            <option value="exam_order">
              {{ $t('patientHistory.examOrders') || 'Exam Orders' }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">{{ $t('common.search') || 'Search:' }}</label>
          <input
            v-model="searchText"
            type="text"
            class="form-control-modern form-control-sm"
            :placeholder="$t('common.searchPlaceholder') || 'Search...'"
          />
        </div>
        <button class="btn-modern btn-sm" @click="resetFilters">
          <i class="bi bi-arrow-clockwise"></i> {{ $t('common.reset') || 'Reset' }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center p-4">
      <div class="spinner-modern"></div>
      <p class="mt-2">{{ $t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state-modern">
      <div class="error-state-modern-icon">
        <i class="bi bi-exclamation-triangle"></i>
      </div>
      <div class="error-state-modern-title">{{ $t('common.error') || 'Error' }}</div>
      <div class="error-state-modern-text">{{ errorMessage }}</div>
      <button class="btn-modern btn-primary mt-3" @click="fetchJourney">
        <i class="bi bi-arrow-clockwise"></i> {{ $t('common.retry') || 'Retry' }}
      </button>
    </div>

    <!-- Timeline -->
    <div v-else-if="filteredTimeline && filteredTimeline.length > 0" class="journey-timeline">
      <div
        v-for="(item, index) in filteredTimeline"
        :key="item.id || `journey-${item.type}-${item.date}-${index}`"
        class="timeline-item-wrapper"
      >
        <!-- Timeline Connector -->
        <div v-if="index < filteredTimeline.length - 1" class="timeline-connector"></div>

        <!-- Timeline Item -->
        <div
          class="timeline-item modern-card"
          :class="getItemClass(item.type)"
          @click="viewItemDetails(item)"
        >
          <div class="timeline-item-icon" :class="getIconClass(item.type)">
            <i :class="getItemIcon(item.type)"></i>
          </div>
          <div class="timeline-item-content">
            <div class="timeline-item-header">
              <div class="timeline-item-date">
                <i class="bi bi-calendar3"></i>
                {{ formatDate(item.date) }}
              </div>
              <div class="timeline-item-badges">
                <span class="badge-modern" :class="getBadgeClass(item.type)">
                  {{ getTypeLabel(item.type) }}
                </span>
                <span v-if="isPending(item)" class="badge-modern badge-modern-warning">
                  {{ $t('common.pending') }}
                </span>
                <span v-if="isComeback(item)" class="badge-modern badge-modern-info">
                  <i class="bi bi-arrow-return-left"></i>
                  {{ $t('patientHistory.comeback') || 'Comeback' }}
                </span>
              </div>
            </div>
            <div class="timeline-item-title">{{ getItemTitle(item) }}</div>
            <div class="timeline-item-description">{{ getItemDescription(item) }}</div>
            <div v-if="hasRelationships(item)" class="timeline-item-relationships">
              <div v-if="item.relationships.bookingId" class="relationship-link">
                <i class="bi bi-calendar-check"></i>
                {{ $t('patientHistory.fromBooking') || 'From Booking' }}
              </div>
              <div v-if="item.relationships.controlId" class="relationship-link">
                <i class="bi bi-calendar-event"></i>
                {{ $t('patientHistory.fromControl') || 'From Control' }}
              </div>
              <div v-if="item.relationships.originalAttentionId" class="relationship-link">
                <i class="bi bi-arrow-return-left"></i>
                {{ $t('patientHistory.comebackFrom') || 'Comeback from' }}
                {{ formatDate(getOriginalDate(item)) }}
              </div>
            </div>
          </div>
          <div class="timeline-item-action">
            <button class="btn-modern btn-sm" @click.stop="viewItemDetails(item)">
              <i class="bi bi-eye"></i> {{ $t('common.viewDetails') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!error" class="empty-state-modern">
      <div class="empty-state-modern-icon">
        <i class="bi bi-inbox"></i>
      </div>
      <div class="empty-state-modern-title">
        {{ $t('patientHistory.noJourneyItems') || 'No items found' }}
      </div>
      <div class="empty-state-modern-text">
        {{ $t('patientHistory.noJourneyItemsDescription') || 'Try adjusting your filters' }}
      </div>
    </div>
  </div>
</template>

<script>
import { getPatientJourney } from '../../../application/services/patient-history';
import { getDateFormatted } from '../../../shared/utils/date';

export default {
  name: 'PatientJourneyView',
  props: {
    clientId: { type: String, required: true },
    commerceId: { type: String, required: true },
  },
  emits: ['close', 'view-item'],
  data() {
    return {
      loading: false,
      journey: null,
      selectedType: 'all',
      searchText: '',
      error: false,
      errorMessage: '',
    };
  },
  computed: {
    filteredTimeline() {
      if (!this.journey || !this.journey.timeline) return [];

      let filtered = this.journey.timeline;

      // Filter by type
      if (this.selectedType !== 'all') {
        filtered = filtered.filter(item => item.type === this.selectedType);
      }

      // Filter by search text
      if (this.searchText) {
        const search = this.searchText.toLowerCase();
        filtered = filtered.filter(item => {
          const title = this.getItemTitle(item).toLowerCase();
          const description = this.getItemDescription(item).toLowerCase();
          return title.includes(search) || description.includes(search);
        });
      }

      return filtered;
    },
  },
  async mounted() {
    await this.fetchJourney();
  },
  methods: {
    async fetchJourney() {
      // Validate required props
      if (!this.commerceId || !this.clientId) {
        this.error = true;
        this.errorMessage =
          this.$t('patientHistory.missingParameters') || 'Missing required parameters';
        this.loading = false;
        return;
      }

      this.loading = true;
      this.error = false;
      this.errorMessage = '';

      try {
        this.journey = await getPatientJourney(this.commerceId, this.clientId);
        this.error = false;
      } catch (error) {
        console.error('Error fetching patient journey:', error);
        this.journey = null;
        this.error = true;

        // Provide user-friendly error message
        if (error.response?.status === 500) {
          this.errorMessage =
            this.$t('patientHistory.journeyServerError') ||
            'Server error while loading patient journey. Please try again later.';
        } else if (error.response?.status === 404) {
          this.errorMessage =
            this.$t('patientHistory.journeyNotFound') || 'Patient journey not found.';
        } else if (error.response?.status === 403) {
          this.errorMessage =
            this.$t('patientHistory.journeyAccessDenied') ||
            'You do not have permission to view this patient journey.';
        } else {
          this.errorMessage =
            this.$t('patientHistory.journeyLoadError') ||
            'Error loading patient journey. Please try again.';
        }
      } finally {
        this.loading = false;
      }
    },
    formatDate(date) {
      if (!date) return '';
      return getDateFormatted(date);
    },
    getItemClass(type) {
      const classes = {
        booking: 'timeline-item-booking',
        attention: 'timeline-item-attention',
        consultation: 'timeline-item-consultation',
        control: 'timeline-item-control',
        prescription: 'timeline-item-prescription',
        exam_order: 'timeline-item-exam-order',
      };
      return classes[type] || '';
    },
    getIconClass(type) {
      const classes = {
        booking: 'icon-blue',
        attention: 'icon-green',
        consultation: 'icon-yellow',
        control: 'icon-orange',
        prescription: 'icon-purple',
        exam_order: 'icon-red',
      };
      return classes[type] || '';
    },
    getItemIcon(type) {
      const icons = {
        booking: 'bi bi-calendar-check',
        attention: 'bi bi-person-check',
        consultation: 'bi bi-journal-medical',
        control: 'bi bi-calendar-event',
        prescription: 'bi bi-prescription',
        exam_order: 'bi bi-clipboard-check',
      };
      return icons[type] || 'bi bi-circle';
    },
    getBadgeClass(type) {
      const classes = {
        booking: 'badge-modern-info',
        attention: 'badge-modern-success',
        consultation: 'badge-modern-warning',
        control: 'badge-modern-danger',
        prescription: 'badge-modern-primary',
        exam_order: 'badge-modern-secondary',
      };
      return classes[type] || '';
    },
    getTypeLabel(type) {
      const labels = {
        booking: this.$t('patientHistory.bookings') || 'Booking',
        attention: this.$t('patientHistory.attentions') || 'Attention',
        consultation: this.$t('patientHistory.consultations') || 'Consultation',
        control: this.$t('patientHistory.controls') || 'Control',
        prescription: this.$t('patientHistory.prescriptions') || 'Prescription',
        exam_order: this.$t('patientHistory.examOrders') || 'Exam Order',
      };
      return labels[type] || type;
    },
    getItemTitle(item) {
      switch (item.type) {
        case 'booking':
          return `${this.$t('patientHistory.booking') || 'Booking'} #${
            item.item.number || item.id
          }`;
        case 'attention':
          return `${this.$t('patientHistory.attention') || 'Attention'} #${
            item.item.number || item.id
          }`;
        case 'consultation':
          return this.$t('patientHistory.consultation') || 'Consultation';
        case 'control':
          return `${this.$t('patientHistory.control') || 'Control'} - ${item.item.reason || ''}`;
        case 'prescription':
          return this.$t('patientHistory.prescription') || 'Prescription';
        case 'exam_order':
          return this.$t('patientHistory.examOrder') || 'Exam Order';
        default:
          return item.type;
      }
    },
    getItemDescription(item) {
      switch (item.type) {
        case 'booking':
          return (
            item.item.comment ||
            `${this.$t('patientHistory.scheduled') || 'Scheduled'} ${this.formatDate(
              item.item.dateFormatted || item.item.createdAt
            )}`
          );
        case 'attention':
          return (
            item.item.comment ||
            `${this.$t('patientHistory.visit') || 'Visit'} - ${item.item.status || ''}`
          );
        case 'consultation':
          const reasons = item.item.consultationReason || [];
          return reasons.length > 0
            ? reasons[0].reason
            : this.$t('patientHistory.consultationDetails') || 'Consultation details';
        case 'control':
          return `${this.$t('patientHistory.scheduledFor') || 'Scheduled for'} ${this.formatDate(
            item.item.scheduledDate
          )}`;
        case 'prescription':
          const meds = item.item.medications || [];
          return `${meds.length} ${this.$t('patientHistory.medications') || 'medications'}`;
        case 'exam_order':
          const exams = item.item.exams || [];
          return `${exams.length} ${this.$t('patientHistory.exams') || 'exams'}`;
        default:
          return '';
      }
    },
    isPending(item) {
      if (item.type === 'booking') {
        return item.item.status === 'PENDING';
      }
      if (item.type === 'control') {
        return item.item.status === 'PENDING';
      }
      return false;
    },
    isComeback(item) {
      return !!item.relationships.originalAttentionId || !!item.relationships.controlId;
    },
    hasRelationships(item) {
      return !!(
        item.relationships.bookingId ||
        item.relationships.controlId ||
        item.relationships.originalAttentionId
      );
    },
    getOriginalDate(item) {
      // Try to find original item in timeline
      if (item.relationships.originalAttentionId && this.journey && this.journey.timeline) {
        const original = this.journey.timeline.find(
          t => t.type === 'attention' && t.id === item.relationships.originalAttentionId
        );
        if (original) return original.date;
      }
      return null;
    },
    viewItemDetails(item) {
      this.$emit('view-item', item);
    },
    resetFilters() {
      this.selectedType = 'all';
      this.searchText = '';
    },
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.patient-journey-modern {
  padding: 0;
  width: 100%;
}

/* Summary Cards Row */
.summary-cards-row {
  display: flex;
  align-items: stretch;
}

.summary-card-col {
  display: flex;
}

/* Summary Cards */
.summary-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.summary-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.summary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.summary-card:hover::before {
  opacity: 1;
}

/* Compact dashboard-like card overrides for patient journey */
.patient-journey-modern .modern-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.patient-journey-modern .modern-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.patient-journey-modern .summary-card {
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  align-items: center;
}

.patient-journey-modern .summary-icon {
  width: 36px;
  height: 36px;
  font-size: 1rem;
}

.patient-journey-modern .summary-value {
  font-size: 1.1rem;
}

/* Make timeline items more compact and aligned like dashboard cards */
.patient-journey-modern .journey-timeline {
  padding-left: 0.5rem;
}

.patient-journey-modern .timeline-item {
  padding: 0.5rem;
  gap: 0.5rem;
  border-radius: 0.5rem;
}

.patient-journey-modern .timeline-item-icon {
  width: 28px;
  height: 28px;
  font-size: 0.8rem;
}

.patient-journey-modern .timeline-item-title {
  font-size: 0.85rem;
  margin-bottom: 0.15rem;
}

.patient-journey-modern .timeline-item-description {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.patient-journey-modern .timeline-item-action .btn-modern {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.patient-journey-modern .timeline-item-header {
  margin-bottom: 0.25rem;
  gap: 0.3rem;
}

.patient-journey-modern .timeline-item-date {
  font-size: 0.7rem;
}

.patient-journey-modern .timeline-item-relationships {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  gap: 0.35rem;
}

.patient-journey-modern .relationship-link {
  font-size: 0.65rem;
}

.patient-journey-modern .badge-modern {
  padding: 0.15rem 0.35rem;
  font-size: 0.65rem;
  line-height: 1.2;
  border-radius: 0.25rem;
}

@media (max-width: 768px) {
  .patient-journey-modern .modern-card {
    padding: 0.6rem 0.75rem;
  }
  .patient-journey-modern .summary-card {
    padding: 0.5rem;
  }
}

.summary-icon {
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.summary-icon-blue {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.summary-icon-green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.summary-icon-yellow {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.summary-icon-orange {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.summary-content {
  flex-grow: 1;
  min-width: 0;
}

.summary-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.2rem;
  line-height: .9;
}

.summary-badge {
  font-size: 0.7rem;
  color: #d97706;
  margin-top: 0.2rem;
  font-weight: 600;
  line-height: 1.2;
  min-height: 1.2rem;
}

.summary-badge-placeholder {
  min-height: 1.2rem;
  visibility: hidden;
}

/* Filters */
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

/* Timeline */
.journey-timeline {
  position: relative;
  padding-left: 1.25rem;
}

.timeline-item-wrapper {
  position: relative;
  margin-bottom: 0.5rem;
}

.timeline-connector {
  position: absolute;
  left: -1rem;
  top: 2rem;
  width: 2px;
  height: calc(100% + 0.2rem);
  background: linear-gradient(180deg, var(--azul-turno) 0%, rgba(13, 110, 253, 0.3) 100%);
  opacity: 0.3;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.timeline-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.timeline-item:hover::before {
  opacity: 1;
}

.timeline-item-booking::before {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.timeline-item-attention::before {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.timeline-item-consultation::before {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.timeline-item-control::before {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.timeline-item-prescription::before {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.timeline-item-exam-order::before {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.timeline-item-icon {
  width: 28px;
  height: 28px;
  border-radius: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.icon-blue {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.icon-green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.icon-yellow {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.icon-orange {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.icon-purple {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.icon-red {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.timeline-item-content {
  flex-grow: 1;
  min-width: 0;
}

.timeline-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.timeline-item-date {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.timeline-item-date i {
  font-size: 0.65rem;
  opacity: 0.7;
}

.timeline-item-badges {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.timeline-item-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.15rem;
  line-height: 1.2;
}

.timeline-item-description {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.timeline-item-relationships {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.relationship-link {
  font-size: 0.65rem;
  color: var(--azul-turno, #2563eb);
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 500;
}

.relationship-link i {
  font-size: 0.65rem;
}

.timeline-item-action {
  flex-shrink: 0;
}

/* Error State */
.error-state-modern {
  text-align: center;
  padding: 2.5rem 1rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.error-state-modern-icon {
  font-size: 3.5rem;
  color: var(--color-danger, #dc3545);
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.error-state-modern-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.error-state-modern-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .journey-timeline {
    padding-left: 0.75rem;
  }

  .timeline-item {
    flex-direction: column;
  }

  .timeline-item-action {
    width: 100%;
  }

  .timeline-item-action .btn-modern {
    width: 100%;
    justify-content: center;
  }
}
</style>
