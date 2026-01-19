<script>
import { getContactResultTypes } from '../../../shared/utils/data.ts';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import { ATTENTION_STATUS } from '../../../shared/constants';
import { getConsentStatus } from '../../../application/services/consent';

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
      consentStatus: null,
      loadingConsentStatus: false,
    };
  },
  beforeMount() {
    this.contactResultTypes = getContactResultTypes();
    if (this.attention && this.attention.clientId && this.commerce && this.commerce.id) {
      this.loadConsentStatus();
    }
  },
  watch: {
    attention: {
      handler(newVal) {
        if (newVal && newVal.clientId && this.commerce && this.commerce.id) {
          this.loadConsentStatus();
        }
      },
      immediate: true,
      deep: true,
    },
    commerce: {
      handler(newVal) {
        if (newVal && newVal.id && this.attention && this.attention.clientId) {
          this.loadConsentStatus();
        }
      },
      immediate: true,
      deep: true,
    },
  },
  computed: {
    attentionFullName() {
      if (!this.attention) return '';
      const name = this.attention.userName?.trim() || '';
      const lastName = this.attention.userLastName?.trim() || '';
      return `${name} ${lastName}`.trim().toUpperCase() || 'N/I';
    },
  },
  emits: ['open-modal'],
  methods: {
    showDetails() {
      // Emit event to parent to open modal instead of expanding inline
      this.$emit('open-modal', this.attention);
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
      if (daysSince <= 90) return 'attention-card-success';
      if (daysSince <= 180) return 'attention-card-warning';
      return 'attention-card-error';
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
    getStatusBadgeClass() {
      if (!this.attention?.status) return 'badge-secondary';
      const status = this.attention.status;
      if (status === ATTENTION_STATUS.TERMINATED || status === ATTENTION_STATUS.RATED) {
        return 'badge-success';
      }
      if (status === ATTENTION_STATUS.PENDING || status === ATTENTION_STATUS.PROCESSING) {
        return 'badge-warning';
      }
      if (
        status === ATTENTION_STATUS.CANCELLED ||
        status === ATTENTION_STATUS.USER_CANCELLED ||
        status === ATTENTION_STATUS.SKIPED
      ) {
        return 'badge-danger';
      }
      return 'badge-secondary';
    },
    getStatusText() {
      if (!this.attention?.status) return 'N/I';
      const status = this.attention.status;
      const statusMap = {
        [ATTENTION_STATUS.PENDING]: this.$t('dashboard.attentionStatus.pending') || 'Pendiente',
        [ATTENTION_STATUS.PROCESSING]:
          this.$t('dashboard.attentionStatus.processing') || 'En Proceso',
        [ATTENTION_STATUS.TERMINATED]:
          this.$t('dashboard.attentionStatus.terminated') || 'Terminado',
        [ATTENTION_STATUS.CANCELLED]: this.$t('dashboard.attentionStatus.cancelled') || 'Cancelado',
        [ATTENTION_STATUS.USER_CANCELLED]:
          this.$t('dashboard.attentionStatus.userCancelled') || 'Cancelado por Usuario',
        [ATTENTION_STATUS.RATED]: this.$t('dashboard.attentionStatus.rated') || 'Calificado',
        [ATTENTION_STATUS.SKIPED]: this.$t('dashboard.attentionStatus.skiped') || 'Omitido',
        [ATTENTION_STATUS.REACTIVATED]:
          this.$t('dashboard.attentionStatus.reactivated') || 'Reactivado',
      };
      return statusMap[status] || status;
    },
    getStatusIcon() {
      if (!this.attention?.status) return 'bi-question-circle';
      const status = this.attention.status;
      if (status === ATTENTION_STATUS.TERMINATED || status === ATTENTION_STATUS.RATED) {
        return 'bi-check-circle-fill';
      }
      if (status === ATTENTION_STATUS.PENDING || status === ATTENTION_STATUS.PROCESSING) {
        return 'bi-clock-fill';
      }
      if (
        status === ATTENTION_STATUS.CANCELLED ||
        status === ATTENTION_STATUS.USER_CANCELLED ||
        status === ATTENTION_STATUS.SKIPED
      ) {
        return 'bi-x-circle-fill';
      }
      return 'bi-info-circle-fill';
    },
    async loadConsentStatus() {
      if (!this.attention || !this.attention.clientId || !this.commerce || !this.commerce.id) {
        return;
      }
      try {
        this.loadingConsentStatus = true;
        this.consentStatus = await getConsentStatus(this.commerce.id, this.attention.clientId);
      } catch (error) {
        console.error('Error loading consent status:', error);
        this.consentStatus = null;
      } finally {
        this.loadingConsentStatus = false;
      }
    },
    hasBlockingConsents() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return false;
      }
      return this.consentStatus.missing.some(req => req.blockingForAttention && req.required);
    },
    getMissingConsentsCount() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return 0;
      }
      return this.consentStatus.missing.length;
    },
    getBlockingConsentsCount() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return 0;
      }
      return this.consentStatus.missing.filter(req => req.blockingForAttention && req.required)
        .length;
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
    <!-- Modernized Attention Row Card - Matching Booking Style -->
    <div class="attention-row-card" :class="getCardTypeClass()" @click.prevent="showDetails()">
      <div class="attention-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>
              {{
                $t('dashboard.clientCard.tooltip.status') ||
                'Estado do atendimento baseado em dias desde última atenção'
              }}
            </div>
          </template>
          <div class="attention-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i class="bi bi-qr-code"></i>
          </div>
        </Popper>

        <!-- Service Badges -->
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
        <!-- Status Badge -->
        <div v-if="attention && attention.status !== undefined" class="status-badge-wrapper">
          <Popper
            :key="`status-badge-${attention.attentionId || attention.id || Math.random()}`"
            :class="'dark'"
            arrow
            disable-click-away
            hover
          >
            <template #content>
              <div>
                {{
                  $t('dashboard.clientCard.tooltip.attentionStatus') || 'Estado del atendimento'
                }}:
                {{ getStatusText() }}
              </div>
            </template>
            <span class="badge-mini status-badge" :class="getStatusBadgeClass()" @click.stop>
              <i :class="`bi ${getStatusIcon()}`"></i> {{ getStatusText() }}
            </span>
          </Popper>
        </div>

        <!-- Client Info - Horizontal -->
        <div class="attention-info-inline">
          <div class="attention-name-inline">
            <span class="attention-name-text">{{ attentionFullName }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.clientCard.tooltip.copy') || 'Copiar dados do atendimento' }}
                </div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="attention-meta-inline">
            <span class="attention-id-inline">{{
              formatIdNumber(attention.userIdNumber) || 'N/I'
            }}</span>
            <Popper v-if="attention.surveyId" :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{
                    $t('dashboard.clientCard.tooltip.survey') ||
                    'Cliente possui pesquisa de satisfação'
                  }}
                </div>
              </template>
              <i class="bi bi-star-fill icon-mini-separated yellow-icon" @click.stop></i>
            </Popper>
            <Popper
              v-if="attention.paid !== undefined && attention.paid === true"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.paid') || 'Atendimento pago' }}</div>
              </template>
              <i class="bi bi-coin icon-mini-separated blue-icon" @click.stop></i>
            </Popper>
            <Popper
              v-if="attention.productCounter > 0"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>
                  {{ $t('dashboard.clientCard.tooltip.products') || 'Atendimento possui produtos' }}
                </div>
              </template>
              <i class="bi bi-eyedropper icon-mini-separated" @click.stop></i>
            </Popper>
            <!-- LGPD Consent Indicator -->
            <Popper
              v-if="attention && commerce && consentStatus"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>
                  <span v-if="hasBlockingConsents()">
                    {{
                      $t('attention.lgpd.blockingConsents', {
                        count: getBlockingConsentsCount(),
                      }) || `Faltan ${getBlockingConsentsCount()} consentimiento(s) bloqueante(s)`
                    }}
                  </span>
                  <span v-else-if="getMissingConsentsCount() > 0">
                    {{
                      $t('attention.lgpd.missingConsents', { count: getMissingConsentsCount() }) ||
                      `Faltan ${getMissingConsentsCount()} consentimiento(s)`
                    }}
                  </span>
                  <span v-else>
                    {{
                      $t('attention.lgpd.allConsentsGranted') ||
                      'Todos los consentimientos otorgados'
                    }}
                  </span>
                </div>
              </template>
              <i
                v-if="hasBlockingConsents()"
                class="bi bi-shield-exclamation icon-mini-separated red-icon"
                @click.stop
              ></i>
              <i
                v-else-if="getMissingConsentsCount() > 0"
                class="bi bi-shield-check icon-mini-separated yellow-icon"
                @click.stop
              ></i>
              <i v-else class="bi bi-shield-check icon-mini-separated green-icon" @click.stop></i>
            </Popper>
            <span class="attention-days-inline" v-if="attention.daysSinceAttention !== undefined">
              <i :class="`bi ${clasifyDaysSinceComment(attention.daysSinceAttention || 0)}`"></i>
              {{ attention.daysSinceAttention || 0 }}
            </span>
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
  </div>
</template>

<style scoped>
/* Modernized Attention Row Card - Matching Booking Style */
.attention-row-card {
  background-color: #ffffff;
  padding: 0.15rem 0.35rem;
  margin: 0.25rem 0;
  border-radius: 0.4rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  cursor: pointer;
}

.attention-row-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  border-color: rgba(0, 194, 203, 0.2);
}

.attention-card-success {
  border-left: 3px solid #10b981;
}

.attention-card-warning {
  border-left: 3px solid #f59e0b;
}

.attention-card-error {
  border-left: 3px solid #ef4444;
}

.attention-card-info {
  border-left: 3px solid var(--azul-turno);
}

.attention-row-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.attention-icon-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 0.75rem;
}

.attention-icon-mini.icon-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.attention-icon-mini.icon-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.attention-icon-mini.icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.attention-icon-mini.icon-info {
  background: rgba(0, 194, 203, 0.1);
  color: var(--azul-turno);
}

.service-badges-inline {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}

.badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 0.35rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.badge-mini.bg-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}

.service-tag-mini {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
}

.status-badge-wrapper {
  display: flex;
  align-items: center;
  margin-left: 0.25rem;
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 0.35rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.status-badge.badge-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
}

.status-badge.badge-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #ffffff;
}

.status-badge.badge-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
}

.status-badge.badge-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: #ffffff;
}

.attention-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.attention-name-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.attention-name-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6c757d;
  flex-shrink: 0;
  font-size: 0.7rem;
}

.btn-copy-mini:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.attention-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.attention-id-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.attention-days-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--azul-turno);
  padding: 0.15rem 0.4rem;
  background: rgba(0, 194, 203, 0.08);
  border-radius: 0.3rem;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-mini-separated {
  font-size: 0.75rem;
  color: #6c757d;
  opacity: 0.8;
}

.icon-mini-separated.blue-icon {
  color: var(--azul-turno);
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.collapse-icon {
  font-size: 0.75rem;
  color: #6c757d;
  transition: transform 0.2s ease;
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
