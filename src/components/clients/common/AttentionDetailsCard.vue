<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';
import { ATTENTION_STATUS } from '../../../shared/constants';

export default {
  name: 'AttentionDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    packageColor: { type: Object, default: null },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
    };
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
  },
  computed: {
    attentionFullName() {
      if (!this.attention) return 'N/I';
      const name = this.attention.userName?.trim() || '';
      const lastName = this.attention.userLastName?.trim() || '';
      return `${name} ${lastName}`.trim().toUpperCase() || 'N/I';
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
    <div
      class="attention-row-card"
      :class="getCardTypeClass()"
      :style="packageColor ? `border-left-color: ${packageColor.border} !important;` : ''"
      @click.prevent="showDetails()"
    >
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
            <Popper
              v-if="attention.termsConditionsAcceptedCode"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>Termos e condições aceitos</div>
              </template>
              <i class="bi bi-person-fill-check icon-mini-separated" @click.stop></i>
            </Popper>
            <i
              v-if="attention.surveyId"
              class="bi bi-star-fill icon-mini-separated yellow-icon"
              @click.stop
            ></i>
            <i
              v-if="attention.paid !== undefined && attention.paid === true"
              class="bi bi-coin icon-mini-separated blue-icon"
              @click.stop
            ></i>
            <i
              v-if="attention.productCounter > 0"
              class="bi bi-eyedropper icon-mini-separated"
              @click.stop
            ></i>
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

/* Package attention border override */
.attention-row-card[style*='border-left-color'] {
  border-left-width: 4px !important;
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

.attention-details-expanded {
  background-color: transparent;
  border-radius: 0;
  border: none;
  margin: 0;
  padding: 0;
}

.show {
  padding: 0;
  max-height: none !important;
  overflow-y: visible;
}

.detailed-data {
  padding: 0.75rem 0;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 8px;
  padding: 0.875rem;
}

.metric-card-details {
  font-size: 0.7rem;
  font-weight: 400;
}

.yellow-icon {
  color: var(--amarillo-star);
}

.blue-icon {
  color: var(--azul-turno);
}

.green-icon {
  color: var(--verde-tu);
}

.red-icon {
  color: var(--rojo-warning);
}
</style>
