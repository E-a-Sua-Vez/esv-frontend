<script>
import { getDate } from '../../../../shared/utils/date';
import Popper from 'vue3-popper';
import PeriodStatusBadge from '../../common/PeriodStatusBadge.vue';

export default {
  name: 'PeriodDetailsCard',
  components: { Popper, PeriodStatusBadge },
  emits: ['close-period', 'reopen-period', 'lock-period', 'view-details'],
  props: {
    period: { type: Object, required: true },
    detailsOpened: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
    };
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn) {
      return getDate(dateIn);
    },
    formatAmount(amount) {
      return Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');
    },
    formatDateTime(date) {
      if (!date) return '';
      return new Date(date).toLocaleString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    getPeriodTypeClass() {
      if (!this.period) return 'client-card-success';
      if (this.period.status === 'OPEN') {
        return 'client-card-success';
      } else if (this.period.status === 'CLOSED') {
        return 'client-card-warning';
      } else if (this.period.status === 'LOCKED') {
        return 'client-card-locked';
      }
      return 'client-card-success';
    },
    getPeriodIconClass() {
      if (!this.period) return 'icon-success';
      if (this.period.status === 'OPEN') {
        return 'icon-success';
      } else if (this.period.status === 'CLOSED') {
        return 'icon-warning';
      } else if (this.period.status === 'LOCKED') {
        return 'icon-locked';
      }
      return 'icon-success';
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
  },
};
</script>

<template>
  <div v-if="period">
    <!-- Ultra Compact Period Row - Clickable -->
    <div class="client-row-card" :class="getPeriodTypeClass()" @click="showDetails()">
      <div class="client-row-content">
        <!-- Period Type Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>Período Contábil</div>
          </template>
          <div class="client-icon-mini" :class="getPeriodIconClass()" @click.stop>
            <i class="bi bi-calendar-check"></i>
          </div>
        </Popper>

        <!-- Period Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ period.name }}</span>
          </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{ getDate(period.startDate) }} - {{ getDate(period.endDate) }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Status do Período</div>
              </template>
              <span class="badge-mini period-status">
                <PeriodStatusBadge :status="period.status" />
              </span>
            </Popper>
          </div>
        </div>

        <!-- Totals Summary Inline -->
        <div class="status-inline">
          <div class="status-badge-inline">
            <span class="amount-label">Líquido:</span>
            <span class="amount-value">{{ formatAmount(period.totals?.netAmount || 0) }}</span>
          </div>
        </div>

        <!-- Details Toggle -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ extendedEntity ? 'Ocultar Detalhes' : 'Ver Detalhes' }}</div>
          </template>
          <div class="collapse-icon-wrapper">
            <i class="collapse-icon" :class="extendedEntity ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
          </div>
        </Popper>
      </div>
    </div>

    <!-- Details Expandable Section -->
    <div v-if="extendedEntity" class="details-expandable-section">
      <div class="detailed-data">
        <!-- Action Buttons -->
        <div class="action-buttons-section" style="margin-bottom: 1rem;">
          <button
            v-if="period.status === 'OPEN'"
            class="action-btn warning"
            @click.stop="$emit('close-period', period)"
            title="Fechar Período"
          >
            <i class="bi bi-lock"></i>
            <span>Fechar Período</span>
          </button>
          <button
            v-if="period.status === 'CLOSED'"
            class="action-btn info"
            @click.stop="$emit('reopen-period', period)"
            title="Reabrir Período"
          >
            <i class="bi bi-unlock"></i>
            <span>Reabrir</span>
          </button>
          <button
            v-if="period.status === 'CLOSED'"
            class="action-btn secondary"
            @click.stop="$emit('lock-period', period)"
            title="Bloquear Período"
          >
            <i class="bi bi-shield-lock"></i>
            <span>Bloquear</span>
          </button>
          <button
            class="action-btn primary"
            @click.stop="$emit('view-details', period)"
            title="Ver Relatório Completo"
          >
            <i class="bi bi-eye"></i>
            <span>Relatório</span>
          </button>
        </div>

        <!-- Totals Summary Section -->
        <div class="info-section">
          <div class="info-section-header">
            <i class="bi bi-receipt"></i>
            <span class="info-section-title">Resumo Financeiro</span>
          </div>
          <div class="info-badges">
            <span class="info-badge success">
              <span class="badge-label">Total Receitas::</span>
              <span class="badge-value"><i class="bi bi-coin"></i> {{ formatAmount(period.totals?.totalIncomes || 0) }}</span>
            </span>
            <span class="info-badge">
              <span class="badge-label">Nº Receitas::</span>
              <span class="badge-value">{{ period.totals?.incomesCount || 0 }}</span>
            </span>
            <span class="info-badge error">
              <span class="badge-label">Total Despesas::</span>
              <span class="badge-value"><i class="bi bi-coin"></i> {{ formatAmount(period.totals?.totalOutcomes || 0) }}</span>
            </span>
            <span class="info-badge">
              <span class="badge-label">Nº Despesas::</span>
              <span class="badge-value">{{ period.totals?.outcomesCount || 0 }}</span>
            </span>
            <span class="info-badge info">
              <span class="badge-label">Total Comissões::</span>
              <span class="badge-value"><i class="bi bi-coin"></i> {{ formatAmount(period.totals?.totalCommissions || 0) }}</span>
            </span>
            <span class="info-badge warning">
              <span class="badge-label">Valor Líquido::</span>
              <span class="badge-value"><i class="bi bi-coin"></i> {{ formatAmount(period.totals?.netAmount || 0) }}</span>
            </span>
          </div>
        </div>

        <!-- Period Information Section -->
        <div v-if="period.status !== 'OPEN'" class="info-section">
          <div class="info-section-header">
            <i class="bi bi-info-circle"></i>
            <span class="info-section-title">Informação do Período</span>
          </div>
          <div class="info-badges">
            <span v-if="period.status === 'CLOSED' && period.closedBy" class="info-badge">
              <span class="badge-label">Fechado por::</span>
              <span class="badge-value"><i class="bi bi-person-fill"></i> {{ period.closedBy }}</span>
            </span>
            <span v-if="period.status === 'CLOSED' && period.closedAt" class="info-badge">
              <span class="badge-label">Data de Fechamento::</span>
              <span class="badge-value">{{ formatDateTime(period.closedAt) }}</span>
            </span>
            <span v-if="period.status === 'LOCKED' && period.lockedBy" class="info-badge">
              <span class="badge-label">Bloqueado por::</span>
              <span class="badge-value"><i class="bi bi-shield-check"></i> {{ period.lockedBy }}</span>
            </span>
            <span v-if="period.status === 'LOCKED' && period.lockedAt" class="info-badge">
              <span class="badge-label">Data de Bloqueio::</span>
              <span class="badge-value">{{ formatDateTime(period.lockedAt) }}</span>
            </span>
            <span v-if="period.notes" class="info-badge">
              <span class="badge-label">Notas::</span>
              <span class="badge-value">{{ period.notes }}</span>
            </span>
          </div>
        </div>

        <!-- Metadata Footer -->
        <div class="metadata-section">
          <div class="metadata-items-horizontal">
            <div class="metadata-item-inline">
              <strong>Id:</strong>
              <span>{{ period.id }}</span>
            </div>
            <div class="metadata-separator">•</div>
            <div class="metadata-item-inline">
              <strong>Criado:</strong>
              <span>{{ getDate(period.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ultra Compact Period Row */
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

.client-row-card.client-card-locked {
  border-left: 2px solid #6c757d;
}

.client-row-card.client-card-locked:hover {
  background: rgba(108, 117, 125, 0.03);
}

/* Client Row Content - Horizontal Layout */
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

.icon-locked {
  background: rgba(108, 117, 125, 0.12);
  color: #6c757d;
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

.badge-mini.period-status {
  background: transparent;
  padding: 0;
}

/* Increase z-index for popper */
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

/* Status Inline */
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

.amount-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.amount-value {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  letter-spacing: -0.01em;
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

/* Action Buttons Section */
.action-buttons-section {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  min-height: 40px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: fit-content;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.action-btn.warning {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.15) 0%, rgba(255, 193, 7, 0.08) 100%);
  color: #d68910;
  border: 1.5px solid rgba(249, 195, 34, 0.3);
}

.action-btn.warning:hover {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.25) 0%, rgba(255, 193, 7, 0.15) 100%);
  border-color: rgba(249, 195, 34, 0.5);
}

.action-btn.info {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.15) 0%, rgba(0, 194, 203, 0.08) 100%);
  color: #00a8b0;
  border: 1.5px solid rgba(0, 194, 203, 0.3);
}

.action-btn.info:hover {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.25) 0%, rgba(0, 194, 203, 0.15) 100%);
  border-color: rgba(0, 194, 203, 0.5);
}

.action-btn.secondary {
  background: linear-gradient(135deg, rgba(108, 117, 125, 0.15) 0%, rgba(108, 117, 125, 0.08) 100%);
  color: #495057;
  border: 1.5px solid rgba(108, 117, 125, 0.3);
}

.action-btn.secondary:hover {
  background: linear-gradient(135deg, rgba(108, 117, 125, 0.25) 0%, rgba(108, 117, 125, 0.15) 100%);
  border-color: rgba(108, 117, 125, 0.5);
}

.action-btn.primary {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.08) 100%);
  color: #004aad;
  border: 1.5px solid rgba(0, 74, 173, 0.3);
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.25) 0%, rgba(0, 194, 203, 0.15) 100%);
  border-color: rgba(0, 74, 173, 0.5);
}

.action-btn i {
  font-size: 0.75rem;
}

/* Info Section - Ultra Compact (matching IncomeDetailsCard) */
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

.info-badge.error {
  background: rgba(165, 42, 42, 0.1);
  border-color: rgba(165, 42, 42, 0.2);
}

.info-badge.info {
  background: rgba(0, 194, 203, 0.1);
  border-color: rgba(0, 194, 203, 0.2);
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  font-size: 0.75rem;
}

.badge-value {
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  font-size: 0.75rem;
}

.badge-value i {
  font-size: 0.6875rem;
}

/* Metadata Section */
.metadata-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.1);
}

.metadata-items-horizontal {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.625rem;
  color: rgba(0, 0, 0, 0.5);
}

.metadata-item-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.metadata-item-inline strong {
  font-weight: 600;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .client-row-content {
    gap: 0.5rem;
  }

  .status-inline {
    width: 100%;
    justify-content: flex-start;
  }

  .collapse-icon-wrapper {
    margin-left: 0;
  }
}
</style>

