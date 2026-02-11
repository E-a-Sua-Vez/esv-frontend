<script>
import { getContactResultTypes } from '../../../../shared/utils/data.ts';
import { getDate } from '../../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../../shared/utils/jsonToCsv';
import Spinner from '../../../common/Spinner.vue';
import { formatIdNumber } from '../../../../shared/utils/idNumber';
import { getProfessionalsByCommerce } from '../../../../application/services/professional';
import PeriodStatusBadge from '../../common/PeriodStatusBadge.vue';

export default {
  name: 'OutcomeDetailsCard',
  components: { Popper, Spinner, PeriodStatusBadge },
  emits: ['refresh', 'open-refund-modal'],
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    outcome: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: () => [] },
    professionals: { type: Array, default: () => [] },
    isRefund: { type: Boolean, default: false },
    refundType: { type: String, default: null },
    canRefund: { type: Function, default: () => false },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      contactResultTypes: [],
      page: 1,
      limit: 10,
      professionalsList: [],
    };
  },
  beforeMount() {
    this.contactResultTypes = getContactResultTypes();
    this.loadProfessionals();
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.outcome]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyOutcomeStatus(status) {
      if (status === 'PENDING') {
        return 'bi-clock-fill icon yellow-icon';
      } else if (status === 'CONFIRMED') {
        return 'bi-check-circle-fill icon green-icon';
      } else if (status === 'CANCELLED') {
        return 'bi-x-circle-fill icon red-icon';
      } else {
        return 'bi-asteric icon blue-icon';
      }
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
    async loadProfessionals() {
      if (this.professionals && this.professionals.length > 0) {
        this.professionalsList = this.professionals;
        return;
      }
      if (!this.commerce || !this.commerce.id) {
        return;
      }
      try {
        this.professionalsList = await getProfessionalsByCommerce(this.commerce.id);
      } catch (error) {
        console.error('[OutcomeDetailsCard] Error loading professionals:', error);
        this.professionalsList = [];
      }
    },
    getProfessionalName(professionalId) {
      if (!professionalId || !this.professionalsList || this.professionalsList.length === 0) {
        return professionalId;
      }
      const professional = this.professionalsList.find(p => p.id === professionalId);
      if (professional) {
        if (professional.personalInfo) {
          const firstName = professional.personalInfo.firstName || '';
          const lastName = professional.personalInfo.lastName || '';
          return (
            `${firstName} ${lastName}`.trim() || professional.personalInfo.name || professionalId
          );
        }
        return professional.name || professionalId;
      }
      return professionalId;
    },
    getProfessionalIdNumber(professionalId) {
      if (!professionalId || !this.professionalsList || this.professionalsList.length === 0) {
        return null;
      }
      const professional = this.professionalsList.find(p => p.id === professionalId);
      if (professional && professional.personalInfo && professional.personalInfo.idNumber) {
        return professional.personalInfo.idNumber;
      }
      return null;
    },
    getCommerceName(commerceId) {
      if (!commerceId || !this.commerces || this.commerces.length === 0) {
        return commerceId;
      }
      const commerce = this.commerces.find(c => c.id === commerceId);
      if (commerce) {
        return commerce.name || commerce.tag || commerceId;
      }
      return commerceId;
    },
    formatAmount(amount) {
      return Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');
    },
    formatDate(date) {
      return this.getDate(date);
    },
    getOutcomeTypeClass() {
      if (!this.outcome) return '';
      if (this.outcome.status === 'CONFIRMED') {
        return 'client-card-success';
      } else if (this.outcome.status === 'PENDING') {
        return 'client-card-warning';
      } else if (this.outcome.status === 'CANCELLED') {
        return 'client-card-error';
      }
      return '';
    },
    getOutcomeIconClass() {
      if (!this.outcome) return 'icon-success';
      if (this.outcome.status === 'CONFIRMED') {
        return 'icon-success';
      } else if (this.outcome.status === 'PENDING') {
        return 'icon-warning';
      } else if (this.outcome.status === 'CANCELLED') {
        return 'icon-error';
      }
      return 'icon-success';
    },
    getOutcomeTypeIcon() {
      if (this.outcome?.type === 'PROFESSIONAL_COMMISSION') {
        return 'bi bi-person-badge';
      }
      return 'bi bi-arrow-down-circle';
    },
    formatCreatedBy(createdBy) {
      if (!createdBy) return 'N/I';

      // Si es un string que parece JSON, intentar parsearlo
      if (typeof createdBy === 'string' && createdBy.includes('{')) {
        try {
          const parsed = JSON.parse(createdBy);
          return parsed.email || parsed.name || parsed.id || 'N/I';
        } catch (e) {
          return createdBy;
        }
      }

      // Si es un objeto
      if (typeof createdBy === 'object') {
        return createdBy.email || createdBy.name || createdBy.id || 'N/I';
      }

      // Si es un string simple
      return createdBy;
    },
  },
  computed: {
    togglesLoaded() {
      return (
        this.toggles && typeof this.toggles === 'object' && Object.keys(this.toggles).length > 0
      );
    },
    beneficiaryName() {
      if (!this.outcome) return 'N/I';
      // Si es un ID de profesional, intentar obtener el nombre
      if (this.outcome.beneficiary && this.outcome.type === 'PROFESSIONAL_COMMISSION') {
        const professionalName = this.getProfessionalName(this.outcome.beneficiary);
        if (professionalName !== this.outcome.beneficiary) {
          return professionalName.toUpperCase();
        }
      }
      return (this.outcome.beneficiary || 'N/I').toString().toUpperCase();
    },
    outcomeIdNumber() {
      if (!this.outcome) return null;
      // Si es una comisión profesional, intentar obtener el ID number del profesional
      if (this.outcome.beneficiary && this.outcome.type === 'PROFESSIONAL_COMMISSION') {
        const idNumber = this.getProfessionalIdNumber(this.outcome.beneficiary);
        if (idNumber) {
          return this.formatIdNumber(idNumber);
        }
      }
      return null;
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
    professionals: {
      immediate: true,
      deep: true,
      handler(newVal) {
        if (newVal && newVal.length > 0) {
          this.professionalsList = newVal;
        }
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Outcome Row - Clickable -->
    <div class="client-row-card" :class="getOutcomeTypeClass()" @click="showDetails()">
      <div class="client-row-content">
        <!-- Outcome Type Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ $t('dashboard.outcomeCard.tooltip.type') || 'Tipo de despesa' }}</div>
          </template>
          <div class="client-icon-mini" :class="getOutcomeIconClass()" @click.stop>
            <i :class="getOutcomeTypeIcon()"></i>
          </div>
        </Popper>

        <!-- Beneficiary Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ beneficiaryName }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.outcomeCard.tooltip.copy') || 'Copiar dados' }}</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{
              outcomeIdNumber || outcome?.outcomesTypesName || outcome?.type || 'N/I'
            }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.outcomeCard.tooltip.outcomeType') || 'Tipo de despesa' }}
                </div>
              </template>
              <span class="badge-mini payment-type" @click.stop>
                <span v-if="outcome?.type === 'PROFESSIONAL_COMMISSION'" class="badge bg-primary">
                  C
                </span>
                <span v-else class="badge bg-info">O</span>
              </span>
            </Popper>
          </div>
        </div>

        <!-- Amount and Status -->
        <div class="status-inline">
          <div class="status-badge-inline">
            <span class="amount-value">{{ formatAmount(outcome?.amount) }}</span>
            <Popper v-if="outcome?.status" :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.outcomeCard.tooltip.status') || 'Status do pagamento' }}</div>
              </template>
              <i :class="`bi ${clasifyOutcomeStatus(outcome?.status)} mx-1`" @click.stop></i>
            </Popper>
          </div>
        </div>

        <!-- Date Badge -->
        <div class="status-inline">
          <span class="date-badge-inline">{{
            formatDate(outcome?.date || outcome?.paymentDate || outcome?.createdAt)
          }}</span>
        </div>

        <!-- Closed Period Badge -->
        <div v-if="outcome?.isClosed" class="status-inline" @click.stop>
          <Popper :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>{{ $t('financial.periods.transactionInClosedPeriod') }}</div>
            </template>
            <span class="badge bg-secondary">
              <i class="bi bi-lock-fill"></i> {{ $t('financial.periods.status.closed') }}
            </span>
          </Popper>
        </div>

        <!-- Details Toggle -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>
              {{ extendedEntity ? $t('dashboard.hideDetails') : $t('dashboard.showDetails') }}
            </div>
          </template>
          <div class="collapse-icon-wrapper" @click.stop="showDetails()">
            <i
              class="collapse-icon"
              :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
            ></i>
          </div>
        </Popper>
      </div>
    </div>

    <!-- Details Expandable Section -->
    <Transition name="details-expand">
      <div v-if="extendedEntity" class="details-expandable-section">
        <div class="text-center">
          <Spinner :show="loading"></Spinner>
        </div>
        <div class="detailed-data">
          <!-- Action Buttons Section - First, No Title -->
          <div v-if="toggles && (toggles['financial.outcomes.view'] || canRefund(outcome))" class="info-section">
            <div class="action-buttons-grid">
              <!-- Refund Button -->
              <Popper v-if="canRefund(outcome)" :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('financial.refunds.processRefund') }}</div>
                </template>
                <button
                  @click.stop="$emit('open-refund-modal', outcome)"
                  class="action-btn"
                >
                  <i class="bi bi-arrow-counterclockwise"></i>
                  <span>{{ $t('financial.refunds.refund') }}</span>
                </button>
              </Popper>
            </div>
          </div>
          <!-- Beneficiary Information -->
          <div class="info-section">
            <div class="info-section-header">
              <i class="bi bi-person-badge"></i>
              <span class="info-section-title">{{
                $t('dashboard.outcomeCard.beneficiaryInfo') || 'Informação do Beneficiário'
              }}</span>
            </div>
            <div class="info-badges">
              <span class="info-badge">
                <i class="bi bi-person-badge"></i>
                <span class="badge-label">Beneficiário:</span>
                <span class="badge-value">{{ beneficiaryName }}</span>
              </span>
              <span
                v-if="
                  outcome?.beneficiary &&
                  outcome?.type === 'PROFESSIONAL_COMMISSION' &&
                  getProfessionalIdNumber(outcome.beneficiary)
                "
                class="info-badge"
              >
                <i class="bi bi-person-vcard"></i>
                <span class="badge-label">ID:</span>
                <span class="badge-value">{{ formatIdNumber(getProfessionalIdNumber(outcome.beneficiary)) }}</span>
              </span>
              <span
                v-if="outcome?.outcomesTypesName || outcome?.type"
                class="info-badge"
              >
                <i class="bi bi-tag"></i>
                <span class="badge-label">Tipo:</span>
                <span class="badge-value">{{ outcome?.outcomesTypesName || outcome?.type || 'N/I' }}</span>
              </span>
            </div>
          </div>

        <!-- Payment Data Section -->
        <div class="info-section">
          <div class="info-section-header">
            <i class="bi bi-check-circle-fill"></i>
            <span class="info-section-title">{{ $t('collaboratorBookingsView.paymentData') }}</span>
          </div>

          <div class="info-badges">
            <span v-if="outcome?.title" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.outcomeTitle') || 'Título' }}:</span>
              <span class="badge-value">{{ outcome.title }}</span>
            </span>

            <span v-if="outcome?.type" class="info-badge success">
              <span class="badge-value">{{
                $t(`outcomeTypes.${outcome.type}`) || outcome.type
              }}</span>
            </span>

            <span v-if="outcome?.paymentMethod" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.paymentMethod') }}:</span>
              <span class="badge-value">{{
                $t(`paymentClientMethods.${outcome.paymentMethod}`)
              }}</span>
            </span>

            <span v-if="outcome?.amount" class="info-badge warning">
              <span class="badge-label">{{ $t('paymentData.paymentAmount') }}:</span>
              <span class="badge-value">
                <i class="bi bi-coin"></i>
                {{ formatAmount(outcome.amount) }}
              </span>
            </span>

            <span v-if="outcome?.totalAmount" class="info-badge warning">
              <span class="badge-label">{{ $t('paymentData.totalAmount') }}:</span>
              <span class="badge-value">
                <i class="bi bi-coin"></i>
                {{ formatAmount(outcome.totalAmount) }}
              </span>
            </span>

            <span v-if="outcome?.fiscalNote" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.paymentFiscalNote') }}:</span>
              <span class="badge-value">{{ $t(`paymentFiscalNotes.${outcome.fiscalNote}`) }}</span>
            </span>

            <span v-if="outcome?.paymentType" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.paymentType') }}:</span>
              <span class="badge-value">{{
                $t(`paymentTypes.${outcome.paymentType}`) || outcome.paymentType
              }}</span>
            </span>

            <span v-if="outcome?.code" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.code') || 'Código' }}:</span>
              <span class="badge-value">{{ outcome.code }}</span>
            </span>

            <span v-if="outcome?.quantity" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.productQuantity') || 'Quantidade' }}:</span>
              <span class="badge-value">{{ outcome.quantity }}</span>
            </span>

            <span v-if="outcome?.productName" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.outcomeProduct') || 'Produto' }}:</span>
              <span class="badge-value">{{ outcome.productName }}</span>
            </span>

            <span v-if="outcome?.createdBy" class="info-badge">
              <span class="badge-label">{{ $t('dashboard.userData') }}:</span>
              <span class="badge-value">
                <i class="bi bi-person-fill"></i>
                {{ formatCreatedBy(outcome.createdBy) }}
              </span>
            </span>

            <span
              v-if="outcome?.beneficiary && outcome?.type === 'PROFESSIONAL_COMMISSION'"
              class="info-badge"
            >
              <span class="badge-label">{{ $t('professionals.professional') }}:</span>
              <span class="badge-value">
                <i class="bi bi-person-badge"></i>
                {{ getProfessionalName(outcome.beneficiary) }}
              </span>
            </span>
            <span
              v-if="
                outcome?.beneficiary &&
                outcome?.type === 'PROFESSIONAL_COMMISSION' &&
                getProfessionalIdNumber(outcome.beneficiary)
              "
              class="info-badge"
            >
              <span class="badge-label">{{ $t('professionals.idNumber') || 'ID Number' }}:</span>
              <span class="badge-value">
                <i class="bi bi-person-vcard"></i>
                {{ formatIdNumber(getProfessionalIdNumber(outcome.beneficiary)) }}
              </span>
            </span>
          </div>
        </div>

        <!-- Commerce Data Section -->
        <div v-if="outcome?.commerceId || outcome?.commerceName" class="info-section">
          <div class="info-section-header">
            <i class="bi bi-shop"></i>
            <span class="info-section-title">{{ $t('dashboard.commerceData') }}</span>
          </div>

          <div class="info-badges">
            <span v-if="outcome?.commerceName && outcome?.commerceTag" class="info-badge">
              <span class="badge-label">{{ $t('dashboard.commerceData') }}:</span>
              <span class="badge-value">{{ outcome.commerceName }} - {{ outcome.commerceTag }}</span>
            </span>
            <span v-else-if="outcome?.commerceId" class="info-badge">
              <span class="badge-label">{{ $t('dashboard.commerceData') }}:</span>
              <span class="badge-value">{{ getCommerceName(outcome.commerceId) }}</span>
            </span>
          </div>
        </div>

        <!-- Metadata Section - Compact, Same Line -->
        <div class="info-section metadata-section">
          <div class="metadata-item-compact">
            <span class="metadata-label">ID:</span>
            <span class="metadata-value">{{ outcome?.id }}</span>
            <span class="metadata-separator">•</span>
            <span class="metadata-label">Data:</span>
            <span class="metadata-value">{{
              formatDate(outcome?.date || outcome?.paymentDate || outcome?.createdAt)
            }}</span>
            <span v-if="outcome?.paidAt" class="metadata-separator">•</span>
            <span v-if="outcome?.paidAt" class="metadata-label">{{ $t('paymentData.paidAt') || 'Pago em' }}:</span>
            <span v-if="outcome?.paidAt" class="metadata-value">{{ formatDate(outcome.paidAt) }}</span>
          </div>
        </div>
        </div>
      </div>
    </Transition>

    <!-- Spinner -->
    <Spinner :show="loading"></Spinner>
  </div>
</template>

<style scoped>
/* Base Card Styles - Ultra Compact */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-bottom: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  cursor: pointer;
  z-index: 1;
}

.client-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

/* Card Type Variations */
.client-row-card.client-card-success {
  border-left: 2px solid #00c2cb;
}

.client-row-card.client-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.client-row-card.client-card-warning {
  border-left: 2px solid #f9c322;
}

.client-row-card.client-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.client-row-card.client-card-error {
  border-left: 2px solid #a52a2a;
}

.client-row-card.client-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
}

/* Content Layout */
.client-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

/* Icons */
.client-icon-mini {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.client-icon-mini i {
  font-size: 0.9375rem;
}

.client-row-card:hover .client-icon-mini {
  transform: scale(1.05);
}

.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.12);
  color: #f9c322;
}

.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

/* Client Info */
.client-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.client-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.1875rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.75rem;
}

.client-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-id-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.badge-mini {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  cursor: help;
  line-height: 1.2;
}

.payment-type .badge {
  border-radius: 50%;
  width: 14px;
  height: 14px;
  font-size: 0.5rem;
  font-weight: 600;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Status and Amount */
.status-inline {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1875rem;
  flex-shrink: 0;
}

.status-badge-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.amount-value {
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
}

.date-badge-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.2;
}

/* Details Toggle */
.collapse-icon-wrapper {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(169, 169, 169, 0.05);
  color: rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.collapse-icon-wrapper:hover {
  background: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.8);
  transform: scale(1.05);
}

.collapse-icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

/* Details Section */
.details-expandable-section {
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-top: none;
  border-radius: 8px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  background: rgba(255, 255, 255, 0.98);
  position: relative;
  z-index: 0;
  max-height: none;
  overflow: visible;
}

.detailed-data {
  padding: 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%);
  max-height: none;
  overflow: visible;
}

/* Info Sections */
.info-section {
  margin-bottom: 1rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  color: rgba(0, 0, 0, 0.7);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.info-section-header i {
  font-size: 0.875rem;
  color: rgba(0, 74, 173, 0.8);
}

.info-section-title {
  color: rgba(0, 0, 0, 0.85);
}

/* Action Buttons - Uniform Style - Exact copy from ClientDetailsCard */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1875rem;
  padding: 0.25rem 0.375rem;
  min-height: 40px;
  width: 100%;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
  color: #d97706;
  border: 1.5px solid rgba(245, 158, 11, 0.2);
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%);
  border-color: rgba(245, 158, 11, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.1);
}

.action-btn i {
  font-size: 0.9375rem;
}

.action-btn span {
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.action-btn .notification-dot {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  font-size: 0.5rem;
}

.notification-dot {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.5rem;
}

.notification-dot.green {
  color: #00c2cb;
}

.notification-dot.yellow {
  color: #f9c322;
}

/* Info Badges - Exact copy from ClientDetailsCard */
.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.info-badge:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-badge i {
  font-size: 0.875rem;
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-value {
  font-weight: 600;
  color: #000000;
}

.badge-subvalue {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: 0.25rem;
}

.services-badge {
  align-items: flex-start;
  gap: 0.5rem;
}

.service-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.25rem;
  margin-top: 0.25rem;
}

/* Badge Variations */
.info-badge.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.2);
}

.info-badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.2);
}

.info-badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

/* Metadata Section */
.metadata-section {
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  padding-top: 0.75rem;
  margin-bottom: 0;
}

.metadata-item-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  font-size: 0.6875rem;
  line-height: 1.3;
  align-items: center;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.metadata-value {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.35);
  font-weight: 400;
}

/* Icon Colors */
.green-icon {
  color: #00c2cb;
}

.yellow-icon {
  color: #f9c322;
}

.red-icon {
  color: #a52a2a;
}

.blue-icon {
  color: #004aad;
}

/* Transitions */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.details-expand-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px);
}

.details-expand-enter-to {
  max-height: 2000px;
  opacity: 1;
  transform: translateY(0);
}

.details-expand-leave-from {
  max-height: 2000px;
  opacity: 1;
  transform: translateY(0);
}

.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive */
@media (max-width: 768px) {
  .client-row-content {
    gap: 0.5rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .amount-value {
    font-size: 0.6875rem;
  }

  .date-badge-inline {
    font-size: 0.625rem;
  }

  .action-buttons-grid {
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.375rem;
  }

  .action-btn {
    min-height: 36px;
    font-size: 0.65rem;
    padding: 0.1875rem 0.3125rem;
  }

  .action-btn i {
    font-size: 0.8125rem;
  }

  .info-badge {
    font-size: 0.6875rem;
    padding: 0.3125rem 0.5rem;
    gap: 0.25rem;
  }
}
</style>


