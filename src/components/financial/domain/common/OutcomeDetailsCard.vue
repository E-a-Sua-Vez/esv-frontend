<script>
import { getContactResultTypes } from '../../../../shared/utils/data.ts';
import { getDate } from '../../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../../shared/utils/jsonToCsv';
import Spinner from '../../../common/Spinner.vue';
import { formatIdNumber } from '../../../../shared/utils/idNumber';
import { getProfessionalsByCommerce } from '../../../../application/services/professional';

export default {
  name: 'OutcomeDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    outcome: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: () => [] },
    professionals: { type: Array, default: () => [] },
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
          return `${firstName} ${lastName}`.trim() || professional.personalInfo.name || professionalId;
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
                <div>{{ $t('dashboard.outcomeCard.tooltip.outcomeType') || 'Tipo de despesa' }}</div>
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
    <div v-if="extendedEntity" class="details-expandable-section">
      <div class="detailed-data">
        <!-- Beneficiary Information -->
        <div class="info-section">
          <div class="info-section-header">
            <i class="bi bi-person-badge"></i>
            <span class="info-section-title">{{ $t('dashboard.outcomeCard.beneficiaryInfo') || 'Informação do Beneficiário' }}</span>
          </div>
          <div class="contact-data-grid">
            <div class="client-contact-row">
              <div class="contact-items-horizontal">
                <div class="contact-item-compact">
                  <i class="bi bi-person-badge"></i>
                  <span>{{ beneficiaryName }}</span>
                </div>
                <div v-if="outcome?.beneficiary && outcome?.type === 'PROFESSIONAL_COMMISSION' && getProfessionalIdNumber(outcome.beneficiary)" class="contact-item-compact">
                  <i class="bi bi-person-vcard"></i>
                  <span>{{ formatIdNumber(getProfessionalIdNumber(outcome.beneficiary)) }}</span>
                </div>
                <div v-if="outcome?.outcomesTypesName || outcome?.type" class="contact-item-compact">
                  <i class="bi bi-tag"></i>
                  <span>{{ outcome?.outcomesTypesName || outcome?.type || 'N/I' }}</span>
                </div>
              </div>
            </div>
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
              <span class="badge-value">{{ $t(`outcomeTypes.${outcome.type}`) || outcome.type }}</span>
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
              <span class="badge-value">{{ $t(`paymentTypes.${outcome.paymentType}`) || outcome.paymentType }}</span>
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

            <span v-if="outcome?.beneficiary && outcome?.type === 'PROFESSIONAL_COMMISSION'" class="info-badge">
              <span class="badge-label">{{ $t('professionals.professional') }}:</span>
              <span class="badge-value">
                <i class="bi bi-person-badge"></i>
                {{ getProfessionalName(outcome.beneficiary) }}
              </span>
            </span>
            <span v-if="outcome?.beneficiary && outcome?.type === 'PROFESSIONAL_COMMISSION' && getProfessionalIdNumber(outcome.beneficiary)" class="info-badge">
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

        <!-- Metadata Footer -->
        <div class="metadata-section">
          <div class="metadata-items-horizontal">
            <div class="metadata-item-inline">
              <strong>Id:</strong>
              <span>{{ outcome?.id }}</span>
            </div>
            <div class="metadata-separator">•</div>
            <div class="metadata-item-inline">
              <strong>Date:</strong>
              <span>{{ formatDate(outcome?.date || outcome?.paymentDate || outcome?.createdAt) }}</span>
            </div>
            <div v-if="outcome?.paidAt" class="metadata-separator">•</div>
            <div v-if="outcome?.paidAt" class="metadata-item-inline">
              <strong>{{ $t('paymentData.paidAt') || 'Pago em' }}:</strong>
              <span>{{ formatDate(outcome.paidAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Spinner -->
    <Spinner :show="loading"></Spinner>
  </div>
</template>

<style scoped>
/* Ultra Compact Outcome Row */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0;
  margin-bottom: .5rem;
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

/* Card Type Variations - Ultra Compact */
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

/* Client Row Content - Ultra Compact Horizontal Layout */
.client-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

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

.badge-mini i {
  font-size: 0.625rem;
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

.collapse-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease;
  cursor: pointer;
}

.client-row-card:hover .collapse-icon {
  color: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

/* Status Inline - Ultra Compact */
.status-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-badge-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.4375rem;
  background: rgba(169, 169, 169, 0.08);
  border-radius: 9999px;
  cursor: help;
  transition: all 0.2s ease;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.status-badge-inline:hover {
  background: rgba(169, 169, 169, 0.15);
  border-color: rgba(169, 169, 169, 0.2);
}

.status-badge-inline i {
  font-size: 0.75rem;
}

.status-badge-inline span {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

.amount-value {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
}

.date-badge-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  padding: 0.1875rem 0.4375rem;
  background: rgba(169, 169, 169, 0.08);
  border-radius: 9999px;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0;
  margin-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: visible;
  background: rgba(245, 246, 247, 0.4);
  border: 1px solid rgba(169, 169, 169, 0.1);
  border-top: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.detailed-data {
  padding: 0.625rem;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: visible;
  background: rgba(250, 251, 252, 0.4);
  position: relative;
}

/* Info Sections - Ultra Compact */
.info-section {
  margin-bottom: 0.75rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.15);
}

.info-section-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Contact Information */
.contact-data-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.client-contact-row {
  width: 100%;
}

.contact-items-horizontal {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}

.contact-item-compact {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
  flex-shrink: 0;
  min-width: fit-content;
}

.contact-item-compact:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.contact-item-compact i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.contact-item-compact span {
  font-size: 0.75rem;
  font-weight: 600;
}

/* Info Badges */
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

.info-badge.warning {
  background: rgba(249, 195, 34, 0.1);
  border-color: rgba(249, 195, 34, 0.2);
}

.info-badge.success {
  background: rgba(0, 194, 203, 0.1);
  border-color: rgba(0, 194, 203, 0.2);
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

/* Metadata Section */
.metadata-section {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  margin-top: 0.5rem;
}

.metadata-items-horizontal {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
}

.metadata-item-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: bold;
  font-size: 0.5rem;
}

/* Icon Colors */
.green-icon {
  color: var(--verde-tu);
}

.yellow-icon {
  color: var(--amarillo-star);
}

.red-icon {
  color: var(--rojo-warning);
}

.blue-icon {
  color: var(--azul-turno);
}

.gray-icon {
  color: #a9a9a9;
}

/* Responsive adjustments for ultra compact */
@media (max-width: 768px) {
  .client-row-content {
    gap: 0.5rem;
  }

  .client-icon-mini {
    width: 24px;
    height: 24px;
  }

  .client-icon-mini i {
    font-size: 0.8125rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .contact-items-horizontal {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .contact-item-compact {
    width: 100%;
  }

  .metadata-items-horizontal {
    flex-direction: column;
    gap: 0.375rem;
    align-items: flex-start;
  }

  .metadata-separator {
    display: none;
  }
}

@media (max-width: 576px) {
  .client-row-card {
    padding: 0.375rem 0.4375rem;
    margin: 0.1875rem 0.25rem;
    margin-bottom: 0;
  }

  .client-name-text {
    font-size: 0.6875rem;
  }

  .info-badges {
    flex-direction: column;
  }

  .info-badge {
    width: 100%;
  }

  .client-row-content {
    gap: 0.4375rem;
  }
}

/* Tooltip z-index improvements */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

.client-row-card {
  overflow: visible;
}

.details-expandable-section {
  overflow: visible;
}

.detailed-data {
  overflow-y: auto;
  overflow-x: visible;
}
</style>
