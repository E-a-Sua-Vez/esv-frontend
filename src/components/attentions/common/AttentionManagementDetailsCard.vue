<script>
import { getContactResultTypes } from '../../../shared/utils/data';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'AttentionManagementDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      contactResultTypes: [],
    };
  },
  beforeMount() {
    this.contactResultTypes = getContactResultTypes();
  },
  computed: {
    attentionFullName() {
      if (!this.attention) return '';
      const name = this.attention.userName?.trim() || '';
      const lastName = this.attention.userLastName?.trim() || '';
      return `${name} ${lastName}`.trim().toUpperCase() || 'N/I';
    },
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyDaysSinceComment(score) {
      if (score === undefined) {
        return 'bi-qr-code blue-icon';
      } else if (score <= 90) {
        return 'bi-qr-code green-icon';
      } else if (score <= 180) {
        return 'bi-qr-code yellow-icon';
      } else {
        return 'bi-qr-code red-icon';
      }
    },
    getCardTypeClass() {
      const daysSince = this.attention?.daysSinceAttention || 0;
      if (daysSince <= 90) return 'client-card-success';
      if (daysSince <= 180) return 'client-card-warning';
      return 'client-card-error';
    },
    getStatusIconClass() {
      const daysSince = this.attention?.daysSinceAttention || 0;
      if (daysSince <= 90) return 'icon-success';
      if (daysSince <= 180) return 'icon-warning';
      return 'icon-error';
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
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
  <div v-if="show && attention">
    <!-- Ultra Compact Attention Row - Clickable -->
    <div class="client-row-card" :class="getCardTypeClass()" @click="showDetails()">
      <div class="client-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow hover>
          <template #content>
            <div>{{ $t('dashboard.clientCard.tooltip.status') || 'Estado do atendimento baseado em dias desde última atenção' }}</div>
          </template>
          <div class="client-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i class="bi bi-qr-code"></i>
          </div>
        </Popper>

        <!-- Service Badge -->
        <div v-if="attention.servicesDetails || attention.packageId" class="service-badges-inline">
          <span
            v-for="serv in attention.servicesDetails"
            :key="serv.id"
            class="badge-mini service-tag-mini"
          >
            {{ serv.name }}
          </span>
          <span v-if="attention.packageId" class="badge-mini service-tag-mini bg-secondary">
            <i class="bi bi-box-fill"></i> {{ attention.packageProcedureNumber }}
          </span>
        </div>

        <!-- Client Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ attentionFullName }}</span>
            <Popper :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.copy') || 'Copiar dados do atendimento' }}</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{ formatIdNumber(attention.userIdNumber) || 'N/I' }}</span>
            <Popper v-if="attention.surveyId" :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.survey') || 'Cliente possui pesquisa de satisfação' }}</div>
              </template>
              <i class="bi bi-star-fill icon-mini-separated yellow-icon" @click.stop></i>
            </Popper>
            <Popper
              v-if="attention.paid !== undefined && attention.paid === true"
              :class="'dark'"
              arrow
              hover
            >
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.paid') || 'Atendimento pago' }}</div>
              </template>
              <i class="bi bi-coin icon-mini-separated blue-icon" @click.stop></i>
            </Popper>
            <Popper v-if="attention.productCounter > 0" :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.products') || 'Atendimento possui produtos' }}</div>
              </template>
              <i class="bi bi-eyedropper icon-mini-separated" @click.stop></i>
            </Popper>
            </div>
            </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <Popper :class="'dark'" arrow hover>
            <template #content>
              <div>{{ $t('dashboard.clientCard.tooltip.daysSinceAttention') || 'Dias decorridos desde a última atenção' }}</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <i :class="`bi ${clasifyDaysSinceComment(attention.daysSinceAttention || 0)}`"></i>
              <span>{{ attention.daysSinceAttention || 0 }}</span>
            </div>
          </Popper>
          <div class="status-badge-inline date-badge" @click.stop>
            <i class="bi bi-clock-fill yellow-icon"></i>
            <span>{{ getDate(attention.createdDate) }}</span>
          </div>
        </div>

        <!-- Collapse Icon -->
        <div class="collapse-icon-wrapper">
          <i
            class="bi collapse-icon"
            :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
          ></i>
        </div>
      </div>
    </div>

    <!-- Expandable Details Section -->
    <div class="details-expandable-section">
      <Spinner :show="loading"></Spinner>
      <Transition name="details-expand">
        <div v-if="extendedEntity" class="detailed-data">
          <!-- Contact Information Section - Standardized -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-telephone-fill"></i>
              <span class="info-section-title-compact">{{ $t('dashboard.clientCard.contactInfo') || $t('dashboard.contactInfo') || 'Contacto' }}</span>
            </div>
            <div class="contact-data-grid">
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.whatsapp') || 'WhatsApp' }}</div>
                </template>
                <a
                  class="data-item-compact whatsapp"
                  :href="'https://wa.me/' + attention.userPhone"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{ $t('dashboard.clientCard.label.whatsapp') || 'WhatsApp' }}</span>
                  <div class="data-value">
                    <i class="bi bi-whatsapp"></i>
                    <span>{{ attention.userPhone || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.email') || 'Email' }}</div>
                </template>
                <a
                  class="data-item-compact email"
                  :href="'mailto:' + attention.userEmail"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{ $t('dashboard.clientCard.label.email') || 'Email' }}</span>
                  <div class="data-value">
                    <i class="bi bi-envelope"></i>
                    <span>{{ attention.userEmail || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.idNumber') || 'ID' }}</div>
                </template>
                <div class="data-item-compact" @click.stop>
                  <span class="data-label">{{ $t('dashboard.clientCard.label.id') || 'ID' }}</span>
                  <div class="data-value">
                    <i class="bi bi-person-vcard"></i>
                    <span>{{ formatIdNumber(attention.userIdNumber) || 'N/I' }}</span>
                  </div>
                </div>
              </Popper>
            </div>
          </div>

          <!-- Payment Data Section -->
          <div v-if="attention.paid !== undefined && attention.paid === true" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-check-circle-fill"></i>
              <span class="info-section-title">{{ $t('collaboratorBookingsView.paymentData') || 'Dados de Pagamento' }}</span>
            </div>
            <div class="info-badges">
              <span v-if="attention.paymentType" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.paymentType') }}</span>
                <span class="badge-value">{{ $t(`paymentTypes.${attention.paymentType}`) }}</span>
                  </span>
              <span v-if="attention.paymentMethod" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.paymentMethod') }}</span>
                <span class="badge-value">{{ $t(`paymentClientMethods.${attention.paymentMethod}`) }}</span>
                  </span>
              <span v-if="attention.paymentAmount" class="info-badge">
                <i class="bi bi-coin"></i>
                <span class="badge-label">{{ $t('paymentData.paymentAmount') }}</span>
                <span class="badge-value">{{ attention.paymentAmount }}</span>
                  </span>
              <span v-if="attention.paymentCommission" class="info-badge">
                <i class="bi bi-coin"></i>
                <span class="badge-label">{{ $t('paymentData.paymentCommission') }}</span>
                <span class="badge-value">{{ attention.paymentCommission }}</span>
                  </span>
              <span v-if="attention.packageId && attention.packageName" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.package') }}</span>
                <span class="badge-value">{{ attention.packageName }}</span>
                <span class="badge-subvalue">{{ attention.packageProcedureNumber }} / {{ attention.packageProceduresTotalNumber }}</span>
                <i v-if="attention.packagePaid" class="bi bi-check-circle-fill green-icon"></i>
              </span>
              </div>
          </div>

          <!-- Survey Data Section -->
          <div v-if="attention.rating || attention.nps" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-star-fill"></i>
              <span class="info-section-title">{{ $t('dashboard.surveyData') || 'Dados da Pesquisa' }}</span>
            </div>
            <div class="info-badges">
              <span class="info-badge">
                <i class="bi bi-star-fill yellow-icon"></i>
                <span class="badge-label">CSAT</span>
                <span class="badge-value">{{ attention.rating || 'N/I' }}</span>
              </span>
              <span class="info-badge">
                <i class="bi bi-emoji-smile-fill blue-icon"></i>
                <span class="badge-label">NPS</span>
                <span class="badge-value">{{ attention.nps || 'N/I' }}</span>
              </span>
            </div>
          </div>

          <!-- Attention Data Section -->
          <div
            v-if="
              attention.queueName ||
              attention.collaboratorName ||
              (attention.commerceName && attention.commerceTag) ||
              attention.servicesDetails ||
              attention.termsConditionsToAcceptedAt
            "
            class="info-section"
          >
            <div class="info-section-header">
              <i class="bi bi-qr-code"></i>
              <span class="info-section-title">{{ $t('dashboard.attData') || 'Dados do Atendimento' }}</span>
            </div>
            <div class="info-badges">
              <span v-if="attention.queueName" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.queueData') }}</span>
                <span class="badge-value">{{ attention.queueName }}</span>
                </span>
              <span v-if="attention.collaboratorName" class="info-badge">
                <i class="bi bi-person-fill"></i>
                <span class="badge-label">{{ $t('dashboard.userData') }}</span>
                <span class="badge-value">{{ attention.collaboratorName }}</span>
                </span>
              <span v-if="attention.commerceName && attention.commerceTag" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.commerceData') }}</span>
                <span class="badge-value">{{ attention.commerceName }} - {{ attention.commerceTag }}</span>
                </span>
              <span v-if="attention.servicesDetails" class="info-badge services-badge">
                <span class="badge-label">{{ $t('paymentData.service') }}</span>
                <span
                  v-for="serv in attention.servicesDetails"
                  :key="serv.id"
                  class="service-tag"
                >
                  {{ serv.name }}
                </span>
              </span>
              <span v-if="attention.termsConditionsToAcceptedAt" class="info-badge">
                <i class="bi bi-calendar-fill"></i>
                <span class="badge-label">{{ $t('paymentData.termsAccepted') }}</span>
                <span class="badge-value">{{ getDate(attention.termsConditionsToAcceptedAt) }}</span>
              </span>
            </div>
          </div>

          <!-- Metadata Section - Compact, Same Line -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{ attention.attentionId }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label">{{ $t('dashboard.clientCard.date') || $t('dashboard.date') || 'Fecha' }}:</span>
              <span class="metadata-value">{{ getDate(attention.createdDate) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Ultra Compact Attention Row */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0.375rem;
  margin-bottom: 0;
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

.service-badges-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.service-tag-mini {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  line-height: 1.2;
}

.service-tag-mini i {
  font-size: 0.625rem;
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

.icon-mini-separated {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
  margin-left: 0.25rem;
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
}

.client-row-card[class*='extended'] .collapse-icon,
.client-row-card:hover .collapse-icon {
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

.date-badge {
  cursor: default;
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.25rem 0.375rem;
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

/* Compact Section Styles */
.compact-section {
  margin-bottom: 0.75rem;
}

.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.12);
}

.info-section-header-compact i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title-compact {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Standardized Data Items - Compact */
.contact-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4375rem 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 5px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.data-item-compact:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.data-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.1;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.2;
}

.data-value i {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.data-item-compact.whatsapp:hover {
  border-color: rgba(37, 211, 102, 0.3);
}

.data-item-compact.whatsapp:hover .data-value {
  color: #25d366;
}

.data-item-compact.whatsapp:hover .data-value i {
  color: #25d366;
}

.data-item-compact.email:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.data-item-compact.email:hover .data-value {
  color: #004aad;
}

.data-item-compact.email:hover .data-value i {
  color: #004aad;
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
  flex-direction: column;
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

/* Metadata Section */
.metadata-section {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  margin-top: 0.5rem;
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
  font-weight: 300;
  margin: 0 0.125rem;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-value {
  color: rgba(0, 0, 0, 0.8);
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

/* Transition */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.details-expand-enter-to,
.details-expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* Responsive - Ultra Compact */
@media (max-width: 768px) {
  .client-row-card {
    padding: 0.4375rem 0.5rem;
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

/* Tooltip z-index improvements - Ensure tooltips appear above all content */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

:deep(.popper__arrow),
:deep(.popper__arrow::before) {
  z-index: 10001 !important;
}

/* Allow tooltips to overflow parent containers */
.client-row-card {
  overflow: visible;
}

.details-expandable-section {
  overflow: visible;
}

/* Keep scroll for content but allow tooltips to show */
.detailed-data {
  overflow-y: auto;
  overflow-x: visible;
}

/* Ensure tooltip containers don't clip */
.info-section,
.contact-data-grid {
  position: relative;
  overflow: visible;
}
</style>
