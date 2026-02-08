<script>
import { getContactResultTypes } from '../../../../shared/utils/data.ts';
import { getDate } from '../../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../../shared/utils/jsonToCsv';
import Spinner from '../../../common/Spinner.vue';
import { formatIdNumber } from '../../../../shared/utils/idNumber';
import { confirmPendingIncome } from '../../../../application/services/income';
import AreYouSure from '../../../common/AreYouSure.vue';

export default {
  name: 'IncomeDetailsCard',
  components: { Popper, Spinner, AreYouSure },
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    income: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    professionals: { type: Array, default: () => [] },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      contactResultTypes: [],
      productConsumptions: [],
      page: 1,
      limit: 10,
      goToConfirm: false,
    };
  },
  beforeMount() {
    this.contactResultTypes = getContactResultTypes();
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.income]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyIncomeStatus(status) {
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
    clasifyDaysSinceBooking() {
      return 'bi-calendar-fill blue-icon';
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
    goConfirm() {
      this.goToConfirm = !this.goToConfirm;
    },
    cancelConfirm() {
      this.goToConfirm = false;
    },
    async confirmPayment() {
      try {
        this.loading = true;
        await confirmPendingIncome(this.income.id);
        setTimeout(() => {
          this.$emit('refresh');
        }, 3000);
        this.goToConfirm = false;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    manualIncome() {
      return this.income && ['STANDARD', 'FUND_INCREASE'].includes(this.income.type);
    },
    getProfessionalName(professionalId) {
      if (!professionalId || !this.professionals || this.professionals.length === 0) {
        return professionalId;
      }
      const professional = this.professionals.find(p => p.id === professionalId);
      return professional
        ? professional.personalInfo?.name || professional.name || '-'
        : professionalId;
    },
    isCommissionPaid(income) {
      if (!income) return false;
      // Handle different possible formats: boolean, string 'true'/'false', or null/undefined
      const commissionPaid = income.commissionPaid;
      if (commissionPaid === true || commissionPaid === 'true' || commissionPaid === 1) {
        return true;
      }
      return false;
    },
    // New methods for modernized component
    formatAmount(amount) {
      return Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');
    },
    formatDate(date) {
      return this.getDate(date);
    },
    getIncomeTypeClass() {
      if (!this.income) return '';
      if (this.manualIncome()) {
        return 'client-card-warning';
      }
      if (this.income.status === 'CONFIRMED') {
        return 'client-card-success';
      } else if (this.income.status === 'PENDING') {
        return 'client-card-warning';
      } else if (this.income.status === 'CANCELLED') {
        return 'client-card-error';
      }
      return '';
    },
    getIncomeIconClass() {
      if (!this.income) return 'icon-success';
      if (this.manualIncome()) {
        return 'icon-warning';
      }
      if (this.income.status === 'CONFIRMED') {
        return 'icon-success';
      } else if (this.income.status === 'PENDING') {
        return 'icon-warning';
      } else if (this.income.status === 'CANCELLED') {
        return 'icon-error';
      }
      return 'icon-success';
    },
    getIncomeTypeIcon() {
      if (this.manualIncome()) {
        return 'bi bi-hand-index-fill';
      }
      return 'bi bi-person-circle';
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
    clientFullName() {
      if (!this.income) return 'N/I';
      if (this.manualIncome() && this.income.incomeInfo?.user) {
        return this.income.incomeInfo.user.trim().toUpperCase();
      }
      const firstName = this.income?.userName?.trim() || '';
      const lastName = this.income?.userLastName?.trim() || '';
      return `${firstName} ${lastName}`.trim().toUpperCase() || 'N/I';
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
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Income Row - Clickable -->
    <div class="client-row-card" :class="getIncomeTypeClass()" @click="showDetails()">
      <div class="client-row-content">
        <!-- Income Type Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ $t('dashboard.incomeCard.tooltip.type') }}</div>
          </template>
          <div class="client-icon-mini" :class="getIncomeIconClass()" @click.stop>
            <i :class="getIncomeTypeIcon()"></i>
          </div>
        </Popper>

        <!-- Client Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ clientFullName }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.incomeCard.tooltip.copy') }}</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{
              formatIdNumber(income?.userIdNumber) || 'N/I'
            }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.incomeCard.tooltip.paymentType') }}</div>
              </template>
              <span class="badge-mini payment-type" @click.stop>
                <span v-if="income?.type === 'INSTALLMENT'" class="badge bg-primary">
                  {{ income?.installmentNumber }}
                </span>
                <span v-else-if="income?.type === 'FIRST_PAYMENT'" class="badge bg-success">I</span>
                <span v-else-if="income?.type === 'UNIQUE'" class="badge bg-success">U</span>
              </span>
            </Popper>

            <!-- Commission Status Indicator -->
            <Popper
              v-if="income?.professionalCommission"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>
                  {{
                    isCommissionPaid(income)
                      ? $t('commissionPayments.commissionPaid')
                      : $t('commissionPayments.commissionUnpaid')
                  }}
                </div>
              </template>
              <span class="badge-mini commission-status" @click.stop>
                <span v-if="isCommissionPaid(income)" class="badge bg-success"> $ </span>
                <span v-else class="badge bg-warning"> $ </span>
              </span>
            </Popper>
          </div>
        </div>

        <!-- Amount and Status -->
        <div class="status-inline">
          <div class="status-badge-inline">
            <span class="amount-value">{{ formatAmount(income?.amount) }}</span>
            <Popper v-if="income?.status" :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>{{ $t('dashboard.incomeCard.tooltip.status') }}</div>
              </template>
              <i :class="`bi ${clasifyIncomeStatus(income?.status)} mx-1`" @click.stop></i>
            </Popper>
          </div>
        </div>

        <!-- Date Badge -->
        <div class="status-inline">
          <span class="date-badge-inline">{{
            formatDate(income?.paidAt || income?.paymentDate)
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
        <!-- Client Contact Information -->
        <div class="info-section">
          <div class="info-section-header">
            <i class="bi bi-person-circle"></i>
            <span class="info-section-title">{{ $t('dashboard.incomeCard.contactInfo') }}</span>
          </div>
          <div class="contact-data-grid">
            <div v-if="!manualIncome()" class="client-contact-row">
              <!-- Contact Information Grid - Horizontal layout -->
              <div class="contact-items-horizontal">
                <div class="contact-item-compact" v-if="income?.userPhone">
                  <a
                    :href="'https://wa.me/' + income.userPhone"
                    target="_blank"
                    @click.stop
                    class="contact-link whatsapp"
                  >
                    <i class="bi bi-whatsapp"></i>
                    <span>{{ income.userPhone }}</span>
                  </a>
                </div>
                <div class="contact-item-compact" v-if="income?.userEmail">
                  <a
                    :href="'mailto:' + income.userEmail"
                    target="_blank"
                    @click.stop
                    class="contact-link email"
                  >
                    <i class="bi bi-envelope"></i>
                    <span>{{ income.userEmail }}</span>
                  </a>
                </div>
                <div class="contact-item-compact">
                  <i class="bi bi-person-vcard"></i>
                  <span>{{ formatIdNumber(income?.userIdNumber) || 'N/I' }}</span>
                </div>
              </div>
            </div>

            <!-- Manual Income Display -->
            <div v-else class="client-contact-row">
              <div class="client-contact-name">
                <i class="bi bi-hand-index-fill"></i>
                {{ income.incomeInfo?.user?.trim().toUpperCase() || '' }}
              </div>
              <div class="income-manual-title">
                {{ income.incomeInfo?.title?.trim().toUpperCase() || '' }}
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
            <span v-if="income?.installmentNumber" class="info-badge warning">
              <span class="badge-label">{{ $t('paymentData.installments') }}:</span>
              <span class="badge-value">{{ income.installmentNumber }}</span>
            </span>

            <span v-if="income?.installments" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.installments') }}:</span>
              <span class="badge-value">{{ income.installments }}</span>
            </span>

            <span v-if="income?.fiscalNote" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.paymentFiscalNote') }}:</span>
              <span class="badge-value">{{ $t(`paymentFiscalNotes.${income.fiscalNote}`) }}</span>
            </span>

            <span v-if="income?.type" class="info-badge success">
              <span class="badge-value">{{ $t(`incomeTypes.${income.type}`) }}</span>
            </span>

            <span v-if="income?.paymentMethod" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.paymentMethod') }}:</span>
              <span class="badge-value">{{
                $t(`paymentClientMethods.${income.paymentMethod}`)
              }}</span>
            </span>

            <span v-if="income?.amount" class="info-badge warning">
              <span class="badge-label">{{ $t('paymentData.paymentAmount') }}:</span>
              <span class="badge-value">
                <i class="bi bi-coin"></i>
                {{ formatAmount(income.amount) }}
              </span>
            </span>

            <span v-if="income?.totalAmount" class="info-badge warning">
              <span class="badge-label">{{ $t('paymentData.totalAmount') }}:</span>
              <span class="badge-value">
                <i class="bi bi-coin"></i>
                {{ formatAmount(income.totalAmount) }}
              </span>
            </span>

            <span v-if="income?.professionalCommission" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.professionalCommission') }}:</span>
              <span class="badge-value">{{ formatAmount(income.professionalCommission) }}</span>
              <i
                v-if="isCommissionPaid(income)"
                class="bi bi-check-circle-fill green-icon ms-2"
                :title="$t('commissionPayments.commissionPaid')"
              ></i>
            </span>

            <span v-if="income?.createdBy" class="info-badge">
              <span class="badge-label">{{ $t('dashboard.userData') }}:</span>
              <span class="badge-value">
                <i class="bi bi-person-fill"></i>
                {{ formatCreatedBy(income.createdBy) }}
              </span>
            </span>

            <span v-if="income?.professionalId" class="info-badge">
              <span class="badge-label">{{ $t('professionals.professional') }}:</span>
              <span class="badge-value">
                <i class="bi bi-person-badge"></i>
                {{ getProfessionalName(income.professionalId) }}
              </span>
            </span>
          </div>
        </div>

        <!-- Service Data Section -->
        <div class="info-section">
          <div class="info-section-header">
            <i class="bi bi-qr-code"></i>
            <span class="info-section-title">{{ $t('dashboard.attData') }}</span>
          </div>

          <div class="info-badges">
            <!-- Services -->
            <div v-if="income.bookingServicesDetails || income.attentionServicesDetails">
              <span
                v-for="serv in income.bookingServicesDetails || income.attentionServicesDetails"
                :key="serv.id"
                class="info-badge"
              >
                <span class="badge-label">{{ $t('paymentData.service') }}:</span>
                <span class="badge-value">{{ serv.name }}</span>
              </span>
            </div>

            <!-- Package -->
            <span v-if="income?.packageId && income?.packageName" class="info-badge">
              <span class="badge-label">{{ $t('paymentData.package') }}:</span>
              <span class="badge-value">{{ income.packageName }}</span>
              <span class="badge-subvalue">{{ income.proceduresAmount }}</span>
              <i v-if="income?.packagePaid" class="bi bi-check-circle-fill green-icon"></i>
            </span>

            <!-- Commerce -->
            <span v-if="income?.commerceName && income?.commerceTag" class="info-badge">
              <span class="badge-label">{{ $t('dashboard.commerceData') }}:</span>
              <span class="badge-value">{{ income.commerceName }} - {{ income.commerceTag }}</span>
            </span>
          </div>

          <!-- Metadata Footer -->
          <div class="metadata-section">
            <div class="metadata-items-horizontal">
              <div class="metadata-item-inline">
                <strong>Id:</strong>
                <span>{{ income?.id }}</span>
              </div>
              <div class="metadata-separator">•</div>
              <div class="metadata-item-inline">
                <strong>Date:</strong>
                <span>{{ formatDate(income?.paymentDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div v-if="income?.status === 'PENDING' && !manualIncome()" class="action-buttons-section">
          <button
            v-if="toggles['financial.incomes.confirm']"
            @click="goConfirm()"
            class="action-btn primary"
          >
            <i class="bi bi-check-circle"></i>
            <span>{{ $t('collaboratorBookingsView.confirmPayment') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <AreYouSure
      :show="goToConfirm"
      :yes-disabled="togglesLoaded && !toggles['financial.incomes.confirm']"
      :no-disabled="togglesLoaded && !toggles['financial.incomes.confirm']"
      @actionYes="confirmPayment()"
      @actionNo="cancelConfirm()"
    >
    </AreYouSure>

    <!-- Spinner -->
    <Spinner :show="loading"></Spinner>
  </div>
</template>

<style scoped>
/* Ultra Compact Income Row */
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

.badge-mini.commission-status .badge {
  font-size: 0.5rem;
  padding: 0.125rem 0.25rem;
  min-width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.badge-mini.commission-status .badge.bg-success {
  background-color: #28a745 !important;
  color: white !important;
}

.badge-mini.commission-status .badge.bg-warning {
  background-color: #ffc107 !important;
  color: #000 !important;
}

/* Increase z-index for popper to avoid being covered by cards */
.popper {
  z-index: 9999 !important;
}

.popper[data-popper-placement] {
  z-index: 9999 !important;
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

.client-contact-name {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
}

.income-manual-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  margin-top: 0.25rem;
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

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
  flex: 1;
  font-size: 0.75rem;
  font-weight: 600;
}

.contact-link.whatsapp:hover {
  color: #25d366;
}

.contact-link.email:hover {
  color: #004aad;
}

.mobile-contact-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
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

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: 0.6875rem;
  flex-wrap: wrap;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: bold;
  font-size: 0.5rem;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: 0.6875rem;
  flex-wrap: wrap;
}

/* Action Buttons */
.action-buttons-section {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  min-height: 40px;
  width: 100%;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.05) 100%);
  color: #004aad;
  border: 1.5px solid rgba(0, 74, 173, 0.2);
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.action-btn i {
  font-size: 0.9375rem;
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
